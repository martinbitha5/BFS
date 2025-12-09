import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Card, Toast } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { authServiceInstance } from '../services';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { BoardingStatus } from '../types/boarding.types';
import { Passenger } from '../types/passenger.types';
import { getScanErrorMessage } from '../utils/scanMessages.util';
import { playErrorSound, playScanSound, playSuccessSound } from '../utils/sound.util';

type Props = NativeStackScreenProps<RootStackParamList, 'Boarding'>;

export default function BoardingScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(true);
  const [lastPassenger, setLastPassenger] = useState<Passenger | null>(null);
  const [boardingStatus, setBoardingStatus] = useState<BoardingStatus | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [torchEnabled, setTorchEnabled] = useState(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) {
      console.log('Scan ignoré - déjà en cours de traitement');
      return;
    }

    console.log('[BOARDING] ========== SCAN DÉTECTÉ ==========');
    console.log('[BOARDING] Code-barres scanné - Longueur:', data.length, 'caractères');
    console.log('[BOARDING] Données complètes:', data);
    console.log('[BOARDING] Type détecté: PDF417/Boarding Pass');
    
    // Jouer le son de scan automatique
    await playScanSound();
    
    setScanned(true);
    setProcessing(true);

    try {
      const user = await authServiceInstance.getCurrentUser();
      if (!user) {
        await playErrorSound();
        Alert.alert('Erreur', 'Utilisateur non connecté');
        setProcessing(false);
        setScanned(false);
        setShowScanner(true);
        return;
      }

      // ✅ NOUVEAU SYSTÈME: Chercher dans raw_scans par raw_data (pas de parsing)
      const { rawScanService } = await import('../services');
      const existingScan = await rawScanService.findByRawData(data);
      
      // Vérifier que le scan existe (check-in effectué)
      if (!existingScan || !existingScan.statusCheckin) {
        await playErrorSound();
        const errorMsg = getScanErrorMessage(user.role as any, 'boarding', 'not_checked_in');
        setToastMessage(errorMsg.message);
        setToastType(errorMsg.type);
        setShowToast(true);
        resetScanner();
        return;
      }

      // Vérifier si déjà embarqué
      if (existingScan.statusBoarding) {
        await playErrorSound();
        setToastMessage('⚠️ Passager déjà embarqué !');
        setToastType('warning');
        setShowToast(true);
        setProcessing(false);
        setScanned(false);
        setShowScanner(true);
        return;
      }

      // ✅ Mettre à jour le statut boarding dans raw_scans
      const result = await rawScanService.createOrUpdateRawScan({
        rawData: data,
        scanType: 'boarding_pass',
        statusField: 'boarding',
        userId: user.id,
        airportCode: user.airportCode,
      });

      // Enregistrer l'action d'audit
      const { logAudit } = await import('../utils/audit.util');
      await logAudit(
        'BOARD_PASSENGER',
        'boarding',
        `Embarquement confirmé - Scan #${result.scanCount}`,
        result.id
      );

      // Créer un objet Passenger simplifié pour l'affichage (sans parsing détaillé)
      const displayPassenger: Passenger = {
        id: existingScan.id,
        pnr: 'En attente parsing web',
        fullName: 'Passager embarqué',
        firstName: '',
        lastName: '',
        flightNumber: 'Voir dashboard',
        route: `${user.airportCode}-...`,
        departure: user.airportCode,
        arrival: 'En attente',
        baggageCount: 0,
        checkedInAt: (existingScan.checkinAt || new Date().toISOString()) as string,
        checkedInBy: (existingScan.checkinBy || user.id) as string,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false,
      };

      // Créer un statut boarding simplifié
      const boardingStatus: BoardingStatus = {
        id: result.id,
        passengerId: existingScan.id,
        boarded: true,
        boardedAt: new Date().toISOString(),
        boardedBy: user.id,
        synced: false,
        createdAt: new Date().toISOString(),
      };

      // Stocker pour affichage
      setLastPassenger(displayPassenger);
      setBoardingStatus(boardingStatus);
      
      // Jouer le son de succès
      await playSuccessSound();
      
      const successMessage = `✅ Embarquement confirmé ! (Scan #${result.scanCount})`;
      
      setToastMessage(successMessage);
      setToastType('success');
      setShowToast(true);
      
      // Masquer le scanner et afficher le résultat en plein écran
      setProcessing(false);
      setShowScanner(false);
    } catch (error) {
      console.error('Error processing boarding:', error);
      await playErrorSound();
      const user = await authServiceInstance.getCurrentUser();
      const errorMsg = getScanErrorMessage(user?.role as any || 'boarding', 'boarding', 'unknown');
      setToastMessage(error instanceof Error ? error.message : errorMsg.message);
      setToastType('error');
      setShowToast(true);
      setProcessing(false);
      setScanned(false);
      setShowScanner(true);
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    // Réinitialiser tous les états pour permettre un nouveau scan
    setScanned(false);
    setProcessing(false);
    setShowScanner(true);
    setLastPassenger(null);
    setBoardingStatus(null);
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
      

      {processing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.processingText, { color: colors.text.secondary }]}>Validation en cours...</Text>
        </View>
      ) : !showScanner && lastPassenger ? (
        <ScrollView 
          style={styles.successContainer}
          contentContainerStyle={styles.successContentContainer}
          showsVerticalScrollIndicator={true}>
          <Card style={styles.successCard}>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success.main} />
              <Text style={[styles.successTitle, { color: colors.text.primary }]}>Passager embarqué</Text>
            </View>
            <View style={styles.successInfo}>
              <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light }]}>
                {/* Section: Informations Passager */}
                <View style={styles.sectionHeader}>
                  <Ionicons name="person" size={20} color={colors.primary.main} />
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations Passager</Text>
                </View>
                
                <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Nom complet:</Text>
                  <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.bold }]}>
                    {lastPassenger.fullName}
                  </Text>
                </View>

                {lastPassenger.pnr && (
                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>PNR:</Text>
                    <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace', letterSpacing: 2 }]}>
                      {lastPassenger.pnr}
                    </Text>
                  </View>
                )}

                {/* Section: Informations Vol */}
                {(lastPassenger.flightNumber || lastPassenger.departure || lastPassenger.arrival) && (
                  <>
                    <View style={[styles.sectionHeader, { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.border.light }]}>
                      <Ionicons name="airplane" size={20} color={colors.primary.main} />
                      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations Vol</Text>
                    </View>

                    {lastPassenger.flightNumber && (
                      <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                        <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Numéro de vol:</Text>
                        <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.semibold }]}>
                          {lastPassenger.flightNumber}
                        </Text>
                      </View>
                    )}

                    {lastPassenger.departure && lastPassenger.arrival && (
                      <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                        <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Route:</Text>
                        <View style={styles.routeContainer}>
                          <Badge label={lastPassenger.departure} variant="info" />
                          <Ionicons name="arrow-forward" size={16} color={colors.text.secondary} style={{ marginHorizontal: Spacing.xs }} />
                          <Badge label={lastPassenger.arrival} variant="info" />
                        </View>
                      </View>
                    )}
                  </>
                )}

                {/* Section: Statut Embarquement */}
                <View style={[styles.sectionHeader, { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.border.light }]}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Statut Embarquement</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Statut:</Text>
                  <Badge 
                    label={boardingStatus?.boarded ? "Embarqué" : "En attente"} 
                    variant={boardingStatus?.boarded ? "success" : "warning"} 
                  />
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.scanAgainButton, { backgroundColor: colors.primary.main }]}
              onPress={resetScanner}
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
          onBarcodeScanned={(event) => {
            // Ne pas scanner si on est déjà en traitement ou si un résultat est affiché
            if (scanned || processing || !showScanner || lastPassenger) {
              console.log('[BOARDING] Scan ignoré - déjà en traitement ou résultat affiché');
              return;
            }
            console.log('[BOARDING] Code-barres détecté! Type:', event.type, 'Longueur données:', event.data.length);
            console.log('[BOARDING] Premiers caractères:', event.data.substring(0, 50));
            handleBarCodeScanned({ data: event.data });
          }}
          barcodeScannerSettings={{
            // Support MAXIMAL de TOUS les formats pour accepter n'importe quel boarding pass
            // Production: accepte tous les formats possibles (PDF417, QR, Aztec, DataMatrix, Code128, Code39, etc.)
            barcodeTypes: ['pdf417', 'qr', 'aztec', 'datamatrix', 'code128', 'code39', 'code93', 'ean13', 'ean8', 'codabar', 'itf14', 'upc_a', 'upc_e'],
          }}
          onCameraReady={() => {
            console.log('Caméra prête pour le scan');
          }}
          onMountError={(error) => {
            console.error('Erreur de montage de la caméra:', error);
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
                Scannez le boarding pass pour valider l&apos;embarquement
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
  },
  resultContainer: {
    marginTop: Spacing.lg,
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
  },
  resultValue: {
    fontSize: FontSizes.lg,
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.md,
    letterSpacing: 0.5,
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
});

