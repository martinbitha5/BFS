import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Card, Toast } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { authServiceInstance, birsService, databaseServiceInstance } from '../services';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { Baggage } from '../types/baggage.types';
import { InternationalBaggage } from '../types/birs.types';
import { Passenger } from '../types/passenger.types';
import { getScanErrorMessage, getScanResultMessage } from '../utils/scanMessages.util';
import { playErrorSound, playScanSound, playSuccessSound } from '../utils/sound.util';

type Props = NativeStackScreenProps<RootStackParamList, 'Arrival'>;

export default function ArrivalScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [baggage, setBaggage] = useState<Baggage | null>(null);
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [internationalBaggage, setInternationalBaggage] = useState<InternationalBaggage | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [lastScannedTag, setLastScannedTag] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<number>(0);

  const handleRfidScanned = async ({ data }: { data: string }) => {
    const now = Date.now();
    const DEBOUNCE_TIME = 3000; // 3 secondes de debounce
    
    // Vérifier si c'est un scan en double dans un court laps de temps
    if (lastScannedTag === data && now - lastScanTime < DEBOUNCE_TIME) {
      console.log('[ARRIVAL] ⏸️ Scan ignoré - debounce actif (même tag dans les', DEBOUNCE_TIME, 'ms)');
      return; // Ignorer silencieusement
    }
    
    if (scanned || processing || !showScanner) {
      console.log('[ARRIVAL] ⚠️ Scan ignoré - déjà en cours de traitement', { scanned, processing, showScanner });
      return;
    }
    
    // Enregistrer le scan immédiatement pour bloquer les scans suivants
    setLastScannedTag(data);
    setLastScanTime(now);
    setScanned(true);
    setProcessing(true);

    console.log('[ARRIVAL] 🔔 Tag RFID ou code-barres scanné:', data);
    
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

      const rfidTag = data.trim();
      let found = await databaseServiceInstance.getBaggageByRfidTag(rfidTag);
      
      // SYSTÈME BIRS: Si le bagage n'est pas trouvé, le considérer comme international
      if (!found) {
        console.log('[ARRIVAL] 🌍 Bagage non trouvé dans le système - Considéré comme INTERNATIONAL');
        console.log('[ARRIVAL] 📊 Début du traitement bagage international pour tag:', rfidTag);
        
        // Parser le tag pour extraire les informations disponibles
        const { parserService } = await import('../services');
        const baggageTagData = parserService.parseBaggageTag(rfidTag);
        
        console.log('[ARRIVAL] 📝 Données extraites du tag:', {
          passengerName: baggageTagData.passengerName,
          pnr: baggageTagData.pnr,
          flightNumber: baggageTagData.flightNumber,
          origin: baggageTagData.origin
        });
        
        // Créer un bagage international
        try {
          console.log('[ARRIVAL] 🔄 Appel de birsService.createInternationalBaggage...');
          
          const internationalBaggage = await birsService.createInternationalBaggage(
            rfidTag,
            user.id,
            user.airportCode,
            baggageTagData.passengerName !== 'UNKNOWN' ? baggageTagData.passengerName : undefined,
            baggageTagData.pnr,
            baggageTagData.flightNumber,
            baggageTagData.origin
          );
          
          console.log('[ARRIVAL] ✅ Bagage international créé avec succès:', {
            id: internationalBaggage.id,
            tag: rfidTag,
            status: internationalBaggage.status,
            airportCode: internationalBaggage.airportCode
          });
          
          // Afficher les détails du bagage international (comme pour un bagage normal)
          setInternationalBaggage(internationalBaggage);
          setShowScanner(false);
          await playSuccessSound();
          
          setToastMessage('✅ Bagage international enregistré avec succès');
          setToastType('success');
          setShowToast(true);
          return;
        } catch (error) {
          console.error('[ARRIVAL] ❌ Erreur création bagage international:', error);
          console.error('[ARRIVAL] 📋 Stack trace:', error instanceof Error ? error.stack : 'N/A');
          
          // Afficher un message d'erreur à l'utilisateur
          await playErrorSound();
          setToastMessage(error instanceof Error ? error.message : 'Impossible de créer le bagage international. Veuillez réessayer.');
          setToastType('error');
          setShowToast(true);
          resetScanner();
          return;
        }
      }
      
      if (!found) {
        await playErrorSound();
        const errorMsg = getScanErrorMessage(user.role as any, 'arrival', 'not_found');
        setToastMessage(errorMsg.message);
        setToastType(errorMsg.type);
        setShowToast(true);
        resetScanner();
        return;
      }

      // Récupérer le passager propriétaire pour vérifier l'aéroport
      const passengerData = await databaseServiceInstance.getPassengerById(found.passengerId);
      if (!passengerData) {
        await playErrorSound();
        setToastMessage('Passager non trouvé');
        setToastType('error');
        setShowToast(true);
        resetScanner();
        return;
      }

      // VÉRIFICATION D'AÉROPORT DÉSACTIVÉE EN MODE TEST
      // Permet de tester avec n'importe quel bagage sans blocage
      if (!__DEV__) {
        // Vérifier que le bagage concerne l'aéroport de l'agent (arrivée)
        if (passengerData.arrival !== user.airportCode) {
          await playErrorSound();
          const errorMsg = getScanErrorMessage(user.role as any, 'arrival', 'wrong_airport');
          setToastMessage(errorMsg.message);
          setToastType(errorMsg.type);
          setShowToast(true);
          resetScanner();
          return;
        }
      } else {
        console.log('[ARRIVAL] 🧪 MODE TEST - Vérification aéroport désactivée:', {
          arrivalFromPassenger: passengerData.arrival,
          userAirport: user.airportCode,
        });
        console.log('[ARRIVAL] ✅ Pas de vérification d\'aéroport - continuation du processus d\'arrivée');
      }

      setBaggage(found);
      setPassenger(passengerData);
      setShowScanner(false);
      
      // Jouer le son de succès pour la recherche réussie
      await playSuccessSound();
    } catch (error) {
      await playErrorSound();
      const user = await authServiceInstance.getCurrentUser();
      const errorMsg = getScanErrorMessage(user?.role as any || 'arrival', 'arrival', 'unknown');
      setToastMessage(error instanceof Error ? error.message : errorMsg.message);
      setToastType('error');
      setShowToast(true);
      resetScanner();
    } finally {
      setProcessing(false);
    }
  };

  const confirmArrival = async () => {
    if (!baggage || !passenger) {
      Alert.alert('Erreur', 'Informations manquantes');
      return;
    }

    if (baggage.status === 'arrived') {
      await playErrorSound();
      const user = await authServiceInstance.getCurrentUser();
      const errorMsg = getScanErrorMessage(user?.role as any || 'arrival', 'arrival', 'already_processed');
      setToastMessage(errorMsg.message);
      setToastType(errorMsg.type);
      setShowToast(true);
      return;
    }

    setProcessing(true);
    try {
      const user = await authServiceInstance.getCurrentUser();
      if (!user) {
        await playErrorSound();
        Alert.alert('Erreur', 'Utilisateur non connecté');
        return;
      }

      // Mettre à jour le statut du bagage
      await databaseServiceInstance.updateBaggageStatus(baggage.id, 'arrived', user.id);

      // Enregistrer l'action d'audit
      const { logAudit } = await import('../utils/audit.util');
      await logAudit(
        'CONFIRM_ARRIVAL',
        'baggage',
        `Confirmation arrivée bagage: ${baggage.rfidTag} pour passager ${passenger.fullName} (PNR: ${passenger.pnr})`,
        baggage.id
      );

      // Ajouter à la file de synchronisation
      await databaseServiceInstance.addToSyncQueue({
        tableName: 'baggages',
        recordId: baggage.id,
        operation: 'update',
        data: JSON.stringify({ id: baggage.id, status: 'arrived' }),
        retryCount: 0,
        userId: user.id,
      });

      // Mettre à jour le statut local
      const updatedBaggage = await databaseServiceInstance.getBaggageByRfidTag(baggage.rfidTag);
      if (updatedBaggage) {
        setBaggage(updatedBaggage);
      }

      // Jouer le son de succès
      await playSuccessSound();
      
      // Obtenir le message selon le rôle
      const successMsg = getScanResultMessage(user.role as any, 'arrival', true, {
        passengerName: passenger.fullName,
      });
      
      setToastMessage(successMsg.message);
      setToastType(successMsg.type);
      setShowToast(true);
      
      setTimeout(() => {
        resetAll();
      }, 2000);
    } catch (error) {
      await playErrorSound();
      const user = await authServiceInstance.getCurrentUser();
      const errorMsg = getScanErrorMessage(user?.role as any || 'arrival', 'arrival', 'unknown');
      setToastMessage(error instanceof Error ? error.message : errorMsg.message);
      setToastType('error');
      setShowToast(true);
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    setProcessing(false);
    setTimeout(() => {
      setScanned(false);
    }, 2000);
  };

  const resetAll = () => {
    setBaggage(null);
    setPassenger(null);
    setInternationalBaggage(null);
    setShowScanner(true);
    setScanned(false);
    setProcessing(false);
    setLastScannedTag(null);
    setLastScanTime(0);
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.default }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.default }]}>
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
        onHide={() => setShowToast(false)}
      />
      

      {processing && !baggage ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.processingText, { color: colors.text.secondary }]}>Recherche en cours...</Text>
        </View>
      ) : !showScanner && baggage && passenger ? (
        <ScrollView 
          style={styles.successContainer}
          contentContainerStyle={styles.successContentContainer}
          showsVerticalScrollIndicator={true}>
          <Card style={styles.successCard}>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success.main} />
              <Text style={[styles.successTitle, { color: colors.text.primary }]}>Bagage trouvé</Text>
            </View>
            <View style={styles.successInfo}>
              {/* Section: Informations Bagage */}
              <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light, marginBottom: Spacing.md }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="bag" size={20} color={colors.primary.main} />
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations Bagage</Text>
                </View>
                <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Tag RFID:</Text>
                  <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace', letterSpacing: 2 }]}>
                    {baggage.rfidTag}
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Statut:</Text>
                  <Badge 
                    label={baggage.status === 'arrived' ? "✓ Arrivé" : "En transit"} 
                    variant={baggage.status === 'arrived' ? "success" : "info"} 
                  />
                </View>
              </View>

              {/* Section: Informations Passager */}
              <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light, marginBottom: Spacing.md }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person" size={20} color={colors.primary.main} />
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations Passager</Text>
                </View>
                <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Nom complet:</Text>
                  <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.bold }]}>
                    {passenger.fullName}
                  </Text>
                </View>
                {passenger.pnr && (
                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>PNR:</Text>
                    <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace', letterSpacing: 2 }]}>
                      {passenger.pnr}
                    </Text>
                  </View>
                )}
                {passenger.flightNumber && (
                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Vol:</Text>
                    <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.semibold }]}>
                      {passenger.flightNumber}
                    </Text>
                  </View>
                )}
                {passenger.departure && passenger.arrival && (
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Route:</Text>
                    <View style={styles.routeContainer}>
                      <Badge label={passenger.departure} variant="info" />
                      <Ionicons name="arrow-forward" size={16} color={colors.text.secondary} style={{ marginHorizontal: Spacing.xs }} />
                      <Badge label={passenger.arrival} variant="info" />
                    </View>
                  </View>
                )}
              </View>

              {baggage.status === 'arrived' && (
                <Card style={styles.arrivedCard}>
                  <Badge label="✓ Arrivé" variant="success" />
                  <Text style={[styles.arrivedText, { color: colors.text.secondary }]}>Ce bagage a déjà été marqué comme arrivé</Text>
                </Card>
              )}
            </View>
            {baggage.status !== 'arrived' && (
              <Button
                title="Confirmer l&apos;arrivée du bagage"
                onPress={confirmArrival}
                loading={processing}
                style={styles.confirmButton}
                variant="success"
              />
            )}
            <TouchableOpacity
              style={[styles.scanAgainButton, { backgroundColor: colors.primary.main }]}
              onPress={resetAll}
              activeOpacity={0.8}>
              <Ionicons name="barcode-outline" size={24} color={colors.primary.contrast} />
              <Text style={[styles.scanAgainButtonText, { color: colors.primary.contrast }]}>
                Nouveau scan
              </Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      ) : !showScanner && internationalBaggage ? (
        <ScrollView 
          style={styles.successContainer}
          contentContainerStyle={styles.successContentContainer}
          showsVerticalScrollIndicator={true}>
          <Card style={styles.successCard}>
            <View style={styles.successHeader}>
              <Ionicons name="globe" size={48} color={colors.info.main} />
              <Text style={[styles.successTitle, { color: colors.text.primary }]}>Bagage International</Text>
            </View>
            <View style={styles.successInfo}>
              {/* Section: Informations Bagage International */}
              <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light, marginBottom: Spacing.md }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="bag" size={20} color={colors.info.main} />
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Bagage International Détecté</Text>
                </View>
                <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Tag RFID:</Text>
                  <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace', letterSpacing: 2 }]}>
                    {internationalBaggage.rfidTag}
                  </Text>
                </View>
                <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Statut:</Text>
                  <Badge 
                    label={
                      internationalBaggage.status === 'scanned' ? '🌍 Scanné' :
                      internationalBaggage.status === 'reconciled' ? '✅ Réconcilié' :
                      internationalBaggage.status === 'unmatched' ? '⚠️ Non-matché' :
                      '⏳ En attente'
                    }
                    variant={
                      internationalBaggage.status === 'reconciled' ? 'success' :
                      internationalBaggage.status === 'unmatched' ? 'warning' :
                      'info'
                    }
                  />
                </View>
                <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Scanné le:</Text>
                  <Text style={[styles.resultValue, { color: colors.text.primary }]}>
                    {new Date(internationalBaggage.scannedAt).toLocaleString('fr-FR')}
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Aéroport:</Text>
                  <Badge label={internationalBaggage.airportCode} variant="info" />
                </View>
              </View>

              {/* Section: Informations Passager (si disponibles) */}
              {(internationalBaggage.passengerName || internationalBaggage.pnr || internationalBaggage.flightNumber) && (
                <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light, marginBottom: Spacing.md }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="person-outline" size={20} color={colors.info.main} />
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations Disponibles</Text>
                  </View>
                  {internationalBaggage.passengerName && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Passager:</Text>
                      <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.bold }]}>
                        {internationalBaggage.passengerName}
                      </Text>
                    </View>
                  )}
                  {internationalBaggage.pnr && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>PNR:</Text>
                      <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace', letterSpacing: 2 }]}>
                        {internationalBaggage.pnr}
                      </Text>
                    </View>
                  )}
                  {internationalBaggage.flightNumber && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Vol:</Text>
                      <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.semibold }]}>
                        {internationalBaggage.flightNumber}
                      </Text>
                    </View>
                  )}
                  {internationalBaggage.origin && (
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Origine:</Text>
                      <Badge label={internationalBaggage.origin} variant="info" />
                    </View>
                  )}
                </View>
              )}

              {/* Information BIRS */}
              <Card style={StyleSheet.flatten([styles.arrivedCard, { backgroundColor: colors.background.paper, borderWidth: 2, borderColor: colors.info.main }])}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
                  <Ionicons name="information-circle" size={24} color={colors.info.main} style={{ marginRight: Spacing.sm }} />
                  <Text style={[styles.arrivedText, { color: colors.text.primary, fontWeight: FontWeights.bold, fontSize: FontSizes.md }]}>
                    En attente de réconciliation BIRS
                  </Text>
                </View>
                <Text style={[styles.arrivedText, { color: colors.text.secondary, fontSize: FontSizes.sm, lineHeight: 20 }]}>
                  Ce bagage sera automatiquement réconcilié lorsque le superviseur uploadera le rapport BIRS de la compagnie aérienne.
                </Text>
              </Card>
            </View>

            <TouchableOpacity
              style={[styles.scanAgainButton, { backgroundColor: colors.primary.main }]}
              onPress={resetAll}
              activeOpacity={0.8}>
              <Ionicons name="barcode-outline" size={24} color={colors.primary.contrast} />
              <Text style={[styles.scanAgainButtonText, { color: colors.primary.contrast }]}>
                Nouveau scan
              </Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      ) : showScanner ? (
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torchEnabled}
          onBarcodeScanned={handleRfidScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'codabar', 'itf14', 'interleaved2of5', 'upc_a', 'upc_e', 'datamatrix', 'aztec'],
            interval: 1000,
          }}
          onCameraReady={() => {
            console.log('[ARRIVAL] Caméra prête pour le scan - Tous formats supportés');
          }}
          onMountError={(error) => {
            console.error('[ARRIVAL] Erreur de montage de la caméra:', error);
          }}>
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, { borderColor: colors.primary.main }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: colors.primary.main }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary.main }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary.main }]} />
            </View>
            <Card style={styles.instructionCard}>
              <Text style={styles.instruction}>
                Scannez le tag RFID ou code-barres du bagage arrivé
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
  headerCard: {
    margin: Spacing.md,
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs / 2,
  },
  subtitle: {
    fontSize: FontSizes.sm,
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
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 0,
  },
  instruction: {
    color: '#fff',
    fontSize: FontSizes.md,
    textAlign: 'center',
    fontWeight: FontWeights.semibold,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  message: {
    fontSize: FontSizes.md,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
  },
  successContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  successCard: {
    width: '100%',
    maxWidth: 400,
    padding: Spacing.xl,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginTop: Spacing.md,
  },
  successInfo: {
    marginBottom: Spacing.xl,
    width: '100%',
  },
  confirmButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  arrivedCard: {
    marginTop: Spacing.md,
    alignItems: 'center',
    padding: Spacing.md,
  },
  arrivedText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  scanAgainButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resultContainer: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  resultLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    flex: 1,
  },
  resultValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.md,
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
});
