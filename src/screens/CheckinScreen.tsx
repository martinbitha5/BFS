import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Card, Toast } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { authServiceInstance, databaseServiceInstance } from '../services';
import { parserService } from '../services/parser.service';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { PassengerData } from '../types/passenger.types';
import { getScanErrorMessage, getScanResultMessage } from '../utils/scanMessages.util';
import { playErrorSound, playScanSound, playSuccessSound } from '../utils/sound.util';
import { extractCabinClass, extractTicketNumberWithoutCompanyCode, formatCabinClass, formatFlightDate } from '../utils/ticket.util';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkin'>;

export default function CheckinScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [showScanner, setShowScanner] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [scansToday, setScansToday] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [lastPassenger, setLastPassenger] = useState<PassengerData | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const lastScanTimeRef = useRef<number>(0);
  const SCAN_COOLDOWN = 2000; // 2 secondes entre chaque scan

  useEffect(() => {
    loadUser();
    loadScansToday();
  }, []);

  const loadUser = async () => {
    const user = await authServiceInstance.getCurrentUser();
    setCurrentUser(user);
  };

  const loadScansToday = async () => {
    try {
      const user = await authServiceInstance.getCurrentUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const passengers = await databaseServiceInstance.getPassengersByAirport(user.airportCode);
      const todayScans = passengers.filter(
        (p) => p.checkedInAt?.startsWith(today) && p.checkedInBy === user.id
      );
      setScansToday(todayScans.length);
    } catch (error) {
      console.error('Error loading scans:', error);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    const now = Date.now();
    
    // Cooldown: ignorer si moins de 2 secondes depuis le dernier scan
    if (now - lastScanTimeRef.current < SCAN_COOLDOWN) {
      return;
    }
    
    if (scanned || processing || !showScanner || lastPassenger) {
      return;
    }
    
    lastScanTimeRef.current = now;
    
    // Jouer le son de scan automatique
    await playScanSound();
    
    setScanned(true);
    setScanning(false);
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

      // Parser les données du boarding pass
      const passengerData: PassengerData = parserService.parse(data);
      
      // Passenger data parsed successfully

      // Vérifier que le vol concerne l'aéroport de l'agent
      if (
        passengerData.departure !== user.airportCode &&
        passengerData.arrival !== user.airportCode
      ) {
        await playErrorSound();
        const errorMsg = getScanErrorMessage(user.role as any, 'checkin', 'wrong_airport');
        setToastMessage(errorMsg.message);
        setToastType(errorMsg.type);
        setShowToast(true);
        setProcessing(false);
        setScanned(false);
        setShowScanner(true);
        return;
      }

      // Vérifier les doublons (par PNR)
      const existing = await databaseServiceInstance.getPassengerByPnr(passengerData.pnr);
      if (existing) {
        await playErrorSound();
        const errorMsg = getScanErrorMessage(user.role as any, 'checkin', 'duplicate');
        setToastMessage(errorMsg.message);
        setToastType(errorMsg.type);
        setShowToast(true);
        setProcessing(false);
        setScanned(false);
        setShowScanner(true);
        return;
      }

      // Extraire la classe cabine depuis les données
      const cabinClass = extractCabinClass(passengerData.rawData, passengerData.seatNumber);
      
      // Enregistrer le passager
      const passengerId = await databaseServiceInstance.createPassenger({
        pnr: passengerData.pnr,
        fullName: passengerData.fullName,
        lastName: passengerData.lastName,
        firstName: passengerData.firstName,
        flightNumber: passengerData.flightNumber,
        flightTime: passengerData.flightTime,
        airline: passengerData.airline,
        airlineCode: passengerData.companyCode,
        departure: passengerData.departure,
        arrival: passengerData.arrival,
        route: passengerData.route,
        companyCode: passengerData.companyCode,
        ticketNumber: passengerData.ticketNumber,
        seatNumber: passengerData.seatNumber,
        cabinClass: cabinClass,
        baggageCount: passengerData.baggageInfo?.count || 0,
        baggageBaseNumber: passengerData.baggageInfo?.baseNumber,
        rawData: passengerData.rawData,
        format: passengerData.format,
        checkedInAt: new Date().toISOString(),
        checkedInBy: user.id,
        synced: false,
      });

      // Enregistrer l'action d'audit
      const { logAudit } = await import('../utils/audit.util');
      await logAudit(
        'CHECKIN_PASSENGER',
        'passenger',
        `Check-in passager: ${passengerData.fullName} (PNR: ${passengerData.pnr}) - Vol: ${passengerData.flightNumber} (${passengerData.departure} → ${passengerData.arrival})`,
        passengerId
      );

      // Ajouter à la file de synchronisation
      await databaseServiceInstance.addToSyncQueue({
        tableName: 'passengers',
        recordId: passengerId,
        operation: 'insert',
        data: JSON.stringify({ passengerId, ...passengerData }),
        retryCount: 0,
        userId: user.id,
      });

      setLastPassenger(passengerData);
      
      // Jouer le son de succès
      await playSuccessSound();
      
      // Obtenir le message selon le rôle
      const successMsg = getScanResultMessage(user.role as any, 'checkin', true, {
        passengerName: passengerData.fullName,
        pnr: passengerData.pnr,
        flightNumber: passengerData.flightNumber,
      });
      
      setToastMessage(successMsg.message);
      setToastType(successMsg.type);
      setShowToast(true);
      loadScansToday();
      
      // Masquer le scanner et afficher l'écran de succès
      setProcessing(false);
      setShowScanner(false);
      // Garder scanned à true pour empêcher tout nouveau scan automatique
      // Il sera réinitialisé uniquement quand l'utilisateur clique sur le bouton
    } catch (error) {
      console.error('Error processing scan:', error);
      await playErrorSound();
      const user = await authServiceInstance.getCurrentUser();
      const errorMsg = getScanErrorMessage(user?.role as any || 'checkin', 'checkin', 'unknown');
      setToastMessage(error instanceof Error ? error.message : errorMsg.message);
      setToastType('error');
      setShowToast(true);
      setProcessing(false);
      setScanned(false);
      setShowScanner(true); // Remettre le scanner visible en cas d'erreur
    }
  };

  const resetScanner = () => {
    // Réinitialiser tous les états pour permettre un nouveau check-in
    setLastPassenger(null);
    setScanned(false);
    setProcessing(false);
    setShowScanner(true);
    setScanning(true);
    console.log('[CHECK-IN] Scanner réinitialisé - Prêt pour un nouveau check-in');
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
        onHide={() => setShowToast(false)}
      />
      

      {processing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.processingText, { color: colors.text.secondary }]}>Traitement en cours...</Text>
        </View>
      ) : !showScanner && lastPassenger ? (
        <ScrollView 
          style={styles.successContainer}
          contentContainerStyle={[
            styles.successContainerContent,
            { paddingTop: insets.top + Spacing.xl }
          ]}
          showsVerticalScrollIndicator={false}>
          <Card style={styles.successCard}>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success.main} />
              <Text style={[styles.successTitle, { color: colors.text.primary }]}>Check-in réussi</Text>
            </View>
            <View style={styles.successInfo}>
              {/* Résultat étendu avec toutes les informations */}
              <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light }]}>
                {/* Section: Informations Passager */}
                <View style={styles.sectionHeader}>
                  <Ionicons name="person" size={20} color={colors.primary.main} />
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations Passager</Text>
                </View>
                
                {/* Nom du Passager */}
                <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Nom complet:</Text>
                  <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.bold }]}>
                    {lastPassenger.fullName && lastPassenger.fullName !== 'UNKNOWN' 
                      ? lastPassenger.fullName 
                      : 'Passager'}
                  </Text>
                </View>

                {/* PNR */}
                {lastPassenger.pnr && lastPassenger.pnr !== 'UNKNOWN' && (
                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>PNR:</Text>
                    <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace', letterSpacing: 2 }]}>
                      {lastPassenger.pnr}
                    </Text>
                  </View>
                )}

                {/* Section: Informations Vol */}
                <View style={[styles.sectionHeader, { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.border.light }]}>
                  <Ionicons name="airplane" size={20} color={colors.primary.main} />
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations Vol</Text>
                </View>

                {/* Nom de vol */}
                {lastPassenger.flightNumber && lastPassenger.flightNumber !== 'UNKNOWN' && (
                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Numéro de vol:</Text>
                    <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.semibold }]}>
                      {lastPassenger.flightNumber}
                    </Text>
                  </View>
                )}

                {/* Route */}
                {lastPassenger.departure && lastPassenger.departure !== 'UNK' && lastPassenger.arrival && lastPassenger.arrival !== 'UNK' && (
                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Route:</Text>
                    <View style={styles.routeContainer}>
                      <Badge label={lastPassenger.departure} variant="info" />
                      <Ionicons name="arrow-forward" size={16} color={colors.text.secondary} style={{ marginHorizontal: Spacing.xs }} />
                      <Badge label={lastPassenger.arrival} variant="info" />
                    </View>
                  </View>
                )}

                {/* Date du vol */}
                {formatFlightDate(lastPassenger.flightTime, lastPassenger.flightDate, lastPassenger.rawData) && (
                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Date du vol:</Text>
                    <Text style={[styles.resultValue, { color: colors.text.primary }]}>
                      {formatFlightDate(lastPassenger.flightTime, lastPassenger.flightDate, lastPassenger.rawData)}
                    </Text>
                  </View>
                )}

                {/* Siège */}
                {lastPassenger.seatNumber && lastPassenger.seatNumber !== 'UNKNOWN' && (
                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Siège:</Text>
                    <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.semibold }]}>
                      {lastPassenger.seatNumber}
                    </Text>
                  </View>
                )}

                {/* Type (classe cabine) */}
                {formatCabinClass(extractCabinClass(lastPassenger.rawData, lastPassenger.seatNumber)) && (
                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Type:</Text>
                    <Text style={[styles.resultValue, { color: colors.text.primary }]}>
                      {formatCabinClass(extractCabinClass(lastPassenger.rawData, lastPassenger.seatNumber))}
                    </Text>
                  </View>
                )}

                {/* Section: Informations Billet */}
                <View style={[styles.sectionHeader, { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.border.light }]}>
                  <Ionicons name="ticket" size={20} color={colors.primary.main} />
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations Billet</Text>
                </View>

                {/* Numéro de billet */}
                <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Numéro de billet:</Text>
                  <Text style={[styles.resultValue, { color: lastPassenger.ticketNumber ? colors.text.primary : colors.text.disabled, fontFamily: 'monospace', letterSpacing: 1 }]}>
                    {lastPassenger.ticketNumber 
                      ? (extractTicketNumberWithoutCompanyCode(lastPassenger.ticketNumber, lastPassenger.companyCode) || lastPassenger.ticketNumber)
                      : 'Non disponible'}
                  </Text>
                </View>

                {/* Section: Informations Bagages */}
                {lastPassenger.baggageInfo && lastPassenger.baggageInfo.count > 0 && (
                  <>
                    <View style={[styles.sectionHeader, { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.border.light }]}>
                      <Ionicons name="bag" size={20} color={colors.primary.main} />
                      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations Bagages</Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Nombre de bagages:</Text>
                      <Badge 
                        label={`${lastPassenger.baggageInfo.count} bagage${lastPassenger.baggageInfo.count > 1 ? 's' : ''}`}
                        variant="info"
                      />
                    </View>
                  </>
                )}
              </View>
              
              <Text style={[styles.successText, { color: colors.text.secondary }]}>
                Le passager a été enregistré avec succès.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.scanAgainButton, { backgroundColor: colors.primary.main }]}
              onPress={resetScanner}
              activeOpacity={0.8}>
              <Ionicons name="barcode-outline" size={24} color={colors.primary.contrast} />
              <Text style={[styles.scanAgainButtonText, { color: colors.primary.contrast }]}>
                Nouveau check-in
              </Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      ) : showScanner && !lastPassenger ? (
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torchEnabled}
          onBarcodeScanned={(event) => {
            // Ne pas scanner si on est déjà en traitement ou si un résultat est affiché
            if (scanned || processing || lastPassenger || !showScanner) {
              return;
            }
            handleBarCodeScanned({ data: event.data });
          }}
          barcodeScannerSettings={{
            // Support maximal des types de codes-barres pour boarding pass
            // PDF417 est le standard IATA pour les boarding pass
            // Ajout d'autres formats pour compatibilité maximale
            barcodeTypes: ['pdf417', 'qr', 'aztec', 'datamatrix', 'code128', 'code39'],
          }}
          onCameraReady={() => {
            console.log('Caméra prête pour le scan');
          }}
          onMountError={(error) => {
            console.error('Erreur de montage de la caméra:', error);
            const errorMessage = error?.message || 'Inconnue';
            setToastMessage(`Erreur de caméra: ${errorMessage}. ${Platform.OS === 'web' ? 'Assurez-vous que votre navigateur autorise l\'accès à la caméra et utilisez HTTPS.' : 'Vérifiez les permissions de la caméra.'}`);
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
              <Text style={styles.instruction}>
                Scannez le boarding pass PDF417
              </Text>
              {__DEV__ && (
                <Text style={[styles.instruction, { fontSize: 12, marginTop: 8, opacity: 0.7 }]}>
                  Mode debug: Scanner actif
                </Text>
              )}
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
    margin: Spacing.lg,
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
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
  },
  instruction: {
    color: '#fff',
    fontSize: FontSizes.md,
    textAlign: 'center',
    fontWeight: FontWeights.medium,
    letterSpacing: 0.2,
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
  resultCard: {
    margin: Spacing.lg,
  },
  resultTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
  },
  passengerInfo: {
    marginBottom: Spacing.md,
  },
  passengerName: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
    letterSpacing: -0.3,
  },
  passengerPnr: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    letterSpacing: 0.2,
  },
  baggageInfo: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  airlineInfo: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  airlineText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  successContainer: {
    flex: 1,
  },
  successContainerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  successCard: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    padding: Spacing.xl,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    marginTop: Spacing.md,
    letterSpacing: -0.3,
  },
  successInfo: {
    marginBottom: Spacing.lg,
  },
  flightInfoContainer: {
    marginVertical: Spacing.md,
  },
  baggageLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.xs,
  },
  successText: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 24,
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
    letterSpacing: 0.2,
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

