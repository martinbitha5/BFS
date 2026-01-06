import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Card, Toast } from '../components';
import { useFlightContext } from '../contexts/FlightContext';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { authServiceInstance, databaseServiceInstance } from '../services';
import { birsDatabaseService } from '../services/birs-database.service';
import { parserService } from '../services/parser.service';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { Passenger } from '../types/passenger.types';
import { getScanErrorMessage } from '../utils/scanMessages.util';
import { playErrorSound, playScanSound, playSuccessSound } from '../utils/sound.util';

type Props = NativeStackScreenProps<RootStackParamList, 'Baggage'>;

export default function BaggageScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { currentFlight } = useFlightContext();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [lastScannedTagNumber, setLastScannedTagNumber] = useState<string | null>(null);
  const [scannedTagInfo, setScannedTagInfo] = useState<any>(null);
  const [foundPassenger, setFoundPassenger] = useState<Passenger | null>(null);
  
  // Ref pour bloquer les scans multiples (mise à jour synchrone)
  const isProcessingRef = useRef(false);

  /**
   * Scan du tag RFID du bagage
   * - Parse le tag pour extraire les informations (PNR, nom, vol, etc.)
   * - Cherche le passager correspondant dans la base de données
   * - Enregistre le bagage associé au passager
   */
  const handleRfidScanned = async ({ data }: { data: string }) => {
    if (scanned || processing || isProcessingRef.current) {
      return;
    }

    // Bloquer immédiatement les scans multiples AVANT toute opération async
    isProcessingRef.current = true;
    setScanned(true);
    setProcessing(true);

    // Jouer le son de scan automatique
    await playScanSound();

    try {
      const user = await authServiceInstance.getCurrentUser();
      if (!user) {
        await playErrorSound();
        Alert.alert('Erreur', 'Utilisateur non connecté');
        resetScanner();
        return;
      }

      // Nettoyer les données scannées
      const cleanedData = data.trim();
      
      if (!cleanedData || cleanedData.length === 0) {
        await playErrorSound();
        setToastMessage('Données de scan vides');
        setToastType('error');
        setShowToast(true);
        resetScanner();
        return;
      }


      // ✅ Parser l'étiquette de bagage pour extraire les informations
      let baggageTagData;
      let tagNumber: string;
      
      try {
        baggageTagData = parserService.parseBaggageTag(cleanedData);
        tagNumber = baggageTagData.tagNumber.trim();
        
        // Si le parsing n'a pas extrait de tag RFID valide, utiliser les données brutes
        if (!tagNumber || tagNumber === 'UNKNOWN' || tagNumber.length === 0) {
          tagNumber = cleanedData;
        }
      } catch (parseError) {
        // En cas d'erreur de parsing, utiliser les données brutes comme tag RFID
        tagNumber = cleanedData;
        baggageTagData = {
          passengerName: 'UNKNOWN',
          tagNumber: cleanedData,
          rawData: cleanedData,
        };
      }

      // Stocker les infos du tag pour l'affichage
      setScannedTagInfo(baggageTagData);

      // ✅ Vérifier si ce bagage a déjà été scanné dans raw_scans
      const { rawScanService } = await import('../services');
      const existingScan = await rawScanService.findByRawData(data);
      if (existingScan && existingScan.statusBaggage) {
        await playErrorSound();
        setToastMessage('⚠️ Bagage déjà scanné !');
        setToastType('warning');
        setShowToast(true);
        resetScanner();
        return;
      }

      // ✅ Vérifier si le bagage existe déjà dans la table normale
      const existing = await databaseServiceInstance.getBaggageByTagNumber(tagNumber);
      if (existing) {
        await playErrorSound();
        setToastMessage(`⚠️ Bagage déjà enregistré: ${tagNumber}`);
        setToastType('warning');
        setShowToast(true);
        resetScanner();
        return;
      }

      // ✅ Vérifier si le bagage existe déjà dans la table internationale
      const existingInternational = await birsDatabaseService.getInternationalBaggageByTagNumber(tagNumber);
      if (existingInternational) {
        await playErrorSound();
        setToastMessage(`⚠️ Bagage international déjà enregistré: ${tagNumber}`);
        setToastType('warning');
        setShowToast(true);
        resetScanner();
        return;
      }

      // ✅ Chercher le passager - PRIORITÉ: par numéro de tag attendu (expectedTags)
      let passenger: Passenger | null = null;
      
      // 1. D'abord chercher par tag attendu (le plus fiable pour les tags numériques)
passenger = await databaseServiceInstance.getPassengerByExpectedTag(tagNumber);

      // 2. Si pas trouvé, chercher par PNR (si le tag contient un PNR)
      if (!passenger && baggageTagData.pnr && baggageTagData.pnr !== 'UNKNOWN') {
        passenger = await databaseServiceInstance.getPassengerByPnr(baggageTagData.pnr);
      }

      // 3. Si toujours pas trouvé, chercher par nom
      if (!passenger && baggageTagData.passengerName && baggageTagData.passengerName !== 'UNKNOWN') {
        passenger = await databaseServiceInstance.getPassengerByName(baggageTagData.passengerName);
      }

      // ❌ REFUSER LE SCAN SI LE PASSAGER N'EST PAS TROUVÉ
      if (!passenger) {
        await playErrorSound();
        setProcessing(false);
        
        Alert.alert(
          'TAG NON RECONNU',
          `Le tag ${tagNumber} n'appartient à aucun passager enregistré.\n\nVérifiez que le passager a bien fait son check-in.`,
          [
            {
              text: 'Nouveau scan',
              onPress: () => {
                isProcessingRef.current = false;
                setScanned(false);
                setShowScanner(true);
              },
            },
          ],
          { cancelable: false }
        );
        return;
      }

      // ✅ Vérifier le nombre de bagages déjà enregistrés vs nombre attendu
      const existingBaggages = await databaseServiceInstance.getBaggagesByPassengerId(passenger.id);
      const baggageCount = existingBaggages?.length || 0;
      
      // Récupérer le nombre de bagages attendus depuis les données du passager
      const expectedBaggageCount = passenger.baggageCount || passenger.expectedTags?.length || 1;
      
      // Si le passager a déjà atteint ou dépassé son quota de bagages
      if (baggageCount >= expectedBaggageCount) {
        await playErrorSound();
        setProcessing(false);
        
        Alert.alert(
          'QUOTA DE BAGAGES DÉPASSÉ',
          `Le passager ${passenger.fullName} a déjà ${baggageCount} bagage(s) enregistré(s).\n\nNombre de bagages autorisés: ${expectedBaggageCount}\n\nCe bagage supplémentaire ne peut pas être accepté.`,
          [
            {
              text: 'Nouveau scan',
              onPress: () => {
                isProcessingRef.current = false;
                setScanned(false);
                setShowScanner(true);
              },
            },
          ],
          { cancelable: false }
        );
        return;
      }

      // ✅ Passager trouvé et quota OK → Enregistrer le bagage
      // Créer le bagage avec TOUTES les données nécessaires pour la sync
      const baggageId = await databaseServiceInstance.createBaggage({
        passengerId: passenger.id,
        tagNumber,
        status: 'checked',
        flightNumber: passenger.flightNumber,
        airportCode: user.airportCode,
        checkedAt: new Date().toISOString(),
        checkedBy: user.id,
        synced: false,
      });

      // Enregistrer l'action d'audit
      const { logAudit } = await import('../utils/audit.util');
      await logAudit(
        'REGISTER_BAGGAGE',
        'baggage',
        `Enregistrement bagage RFID: ${tagNumber} pour passager ${passenger.fullName} (PNR: ${passenger.pnr})`,
        baggageId
      );

      // Note: createBaggage ajoute déjà à la sync queue, pas besoin de doublon

      // Enregistrer dans raw_scans
      await rawScanService.createOrUpdateRawScan({
        rawData: data,
        scanType: 'baggage_tag',
        statusField: 'baggage',
        userId: user.id,
        airportCode: user.airportCode,
        baggageRfidTag: tagNumber,
      });

      setFoundPassenger(passenger);
      
      await playSuccessSound();
      setToastMessage(`✅ Bagage enregistré !\nPassager: ${passenger.fullName}\nTag: ${tagNumber}`);
      setToastType('success');

      setLastScannedTagNumber(tagNumber);
      setShowToast(true);
      setShowScanner(false);
      isProcessingRef.current = false;
      setProcessing(false);

    } catch (error) {
      console.error('[BAGGAGE] Erreur:', error);
      await playErrorSound();
      const user = await authServiceInstance.getCurrentUser();
      const errorMsg = getScanErrorMessage(user?.role as any || 'baggage', 'baggage', 'unknown');
      setToastMessage(error instanceof Error ? error.message : errorMsg.message);
      setToastType('error');
      setShowToast(true);
      resetScanner();
    }
  };

  const resetScanner = () => {
    isProcessingRef.current = false;
    setProcessing(false);
    setTimeout(() => {
      setScanned(false);
    }, 1500);
    setShowScanner(true);
  };

  const handleScanAgain = () => {
    isProcessingRef.current = false;
    setScanned(false);
    setProcessing(false);
    setLastScannedTagNumber(null);
    setScannedTagInfo(null);
    setFoundPassenger(null);
    setShowScanner(true);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Permission caméra requise</Text>
        <Button title="Autoriser la caméra" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.default }]}>
      <Toast
        message={toastMessage}
        type={toastType}
        visible={showToast}
        duration={5000}
        onHide={() => setShowToast(false)}
      />

      {processing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.processingText, { color: colors.text.secondary }]}>Traitement en cours...</Text>
        </View>
      ) : !showScanner && lastScannedTagNumber ? (
        <ScrollView 
          style={styles.successContainer}
          contentContainerStyle={styles.successContentContainer}
          showsVerticalScrollIndicator={true}>
          <Card style={styles.successCard}>
            <View style={styles.successHeader}>
              <Ionicons 
                name="checkmark-circle" 
                size={48} 
                color={colors.success.main} 
              />
              <Text style={[styles.successTitle, { color: colors.text.primary }]}>
                Bagage Enregistré
              </Text>
            </View>
            
            <View style={styles.successInfo}>
              {/* Section: Tag RFID */}
              <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="barcode" size={20} color={colors.primary.main} />
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Numéro d'Étiquette</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace', letterSpacing: 1, textAlign: 'center', flex: 1, fontSize: FontSizes.lg, fontWeight: FontWeights.bold }]}>
                    {lastScannedTagNumber}
                  </Text>
                </View>
              </View>

              {/* Section: Informations extraites du tag */}
              {scannedTagInfo && (
                <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light, marginTop: Spacing.md }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="information-circle" size={20} color={colors.primary.main} />
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations Extraites</Text>
                  </View>
                  
                  {scannedTagInfo.passengerName && scannedTagInfo.passengerName !== 'UNKNOWN' && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Nom:</Text>
                      <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.bold }]}>
                        {scannedTagInfo.passengerName}
                      </Text>
                    </View>
                  )}

                  {scannedTagInfo.pnr && scannedTagInfo.pnr !== 'UNKNOWN' && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>PNR:</Text>
                      <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace', letterSpacing: 2 }]}>
                        {scannedTagInfo.pnr}
                      </Text>
                    </View>
                  )}

                  {scannedTagInfo.flightNumber && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Vol:</Text>
                      <Badge label={scannedTagInfo.flightNumber} variant="info" />
                    </View>
                  )}

                  {scannedTagInfo.origin && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Origine:</Text>
                      <Badge label={scannedTagInfo.origin} variant="info" />
                    </View>
                  )}

                  {scannedTagInfo.destination && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Destination:</Text>
                      <Badge label={scannedTagInfo.destination} variant="success" />
                    </View>
                  )}

                  {scannedTagInfo.baggageCount && scannedTagInfo.baggageSequence && (
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Bagage:</Text>
                      <Badge 
                        label={`${scannedTagInfo.baggageSequence} / ${scannedTagInfo.baggageCount}`}
                        variant="warning"
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Section: Passager Associé */}
              {foundPassenger && (
                <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.success.main, marginTop: Spacing.md }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons 
                      name="person" 
                      size={20} 
                      color={colors.success.main} 
                    />
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                      Passager Associé
                    </Text>
                  </View>
                  
                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Nom:</Text>
                    <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.bold }]}>
                      {foundPassenger.fullName}
                    </Text>
                  </View>
                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>PNR:</Text>
                    <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace' }]}>
                      {foundPassenger.pnr}
                    </Text>
                  </View>
                  {foundPassenger.flightNumber && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Vol:</Text>
                      <Badge label={foundPassenger.flightNumber} variant="info" />
                    </View>
                  )}
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Route:</Text>
                    <View style={styles.routeContainer}>
                      <Badge label={foundPassenger.departure} variant="info" />
                      <Ionicons name="arrow-forward" size={16} color={colors.text.secondary} style={{ marginHorizontal: 4 }} />
                      <Badge label={foundPassenger.arrival} variant="success" />
                    </View>
                  </View>
                </View>
              )}

              <Text style={[styles.successText, { color: colors.text.secondary }]}>
                Le bagage a été associé au passager avec succès.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.scanAgainButton, { backgroundColor: colors.primary.main }]}
              onPress={handleScanAgain}
              activeOpacity={0.8}>
              <Ionicons name="barcode-outline" size={24} color={colors.primary.contrast} />
              <Text style={[styles.scanAgainButtonText, { color: colors.primary.contrast }]}>
                Scanner un autre bagage
              </Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      ) : showScanner ? (
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torchEnabled}
          onBarcodeScanned={(event) => {
            if (isProcessingRef.current || !event || !event.data) {
              return;
            }
            handleRfidScanned(event);
          }}
          barcodeScannerSettings={{
            // Formats de tags RFID / étiquettes bagages
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'codabar', 'itf14', 'interleaved2of5', 'upc_a', 'upc_e', 'datamatrix', 'aztec', 'pdf417'],
            interval: 1000,
          }}
          onCameraReady={() => {}}
          onMountError={(error) => {
            console.error('[BAGGAGE SCAN] Erreur de montage de la caméra:', error);
            setToastMessage('Erreur de caméra: ' + (error?.message || 'Inconnue'));
            setToastType('error');
            setShowToast(true);
          }}>
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, { borderColor: colors.primary.main }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: colors.primary.main }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary.main }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary.main }]} />
            </View>
            <Card style={styles.instructionCard}>
              {currentFlight && (
                <View style={styles.flightInfoBanner}>
                  <Ionicons name="airplane" size={20} color="#fff" />
                  <Text style={styles.flightInfoText}>
                    Vol: {currentFlight.flightNumber} | {currentFlight.departure} → {currentFlight.arrival}
                  </Text>
                </View>
              )}
              <Text style={styles.instruction}>
                Scannez le tag RFID du bagage
              </Text>
              <Text style={[styles.subInstruction, { color: 'rgba(255,255,255,0.7)' }]}>
                Le passager sera identifié automatiquement
              </Text>
            </Card>
            <TouchableOpacity
              style={styles.torchButton}
              onPress={() => setTorchEnabled(!torchEnabled)}
              activeOpacity={0.7}>
              <Ionicons
                name={torchEnabled ? 'flashlight' : 'flashlight-outline'}
                size={32}
                color={torchEnabled ? colors.primary.main : '#fff'}
              />
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  message: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  processingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
  },
  successContainer: {
    flex: 1,
  },
  successContentContainer: {
    padding: Spacing.lg,
  },
  successCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  successTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  successInfo: {
    gap: Spacing.sm,
  },
  resultContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  resultLabel: {
    fontSize: FontSizes.sm,
    flex: 1,
  },
  resultValue: {
    fontSize: FontSizes.sm,
    flex: 2,
    textAlign: 'right',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 22,
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  scanAgainButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 300,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 3,
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    top: 'auto',
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 0,
  },
  bottomRight: {
    top: 'auto',
    bottom: 0,
    right: 0,
    left: 'auto',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  instructionCard: {
    marginTop: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderWidth: 0,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  flightInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  flightInfoText: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },
  instruction: {
    color: '#fff',
    fontSize: FontSizes.lg,
    textAlign: 'center',
    fontWeight: FontWeights.bold,
  },
  subInstruction: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  torchButton: {
    position: 'absolute',
    bottom: Spacing.xxl,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: BorderRadius.round,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
});
