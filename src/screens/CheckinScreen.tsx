import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Card, Toast } from '../components';
import { useFlightContext } from '../contexts/FlightContext';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { authServiceInstance, flightService, parserService } from '../services';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { PassengerData } from '../types/passenger.types';
import { playErrorSound, playScanSound, playSuccessSound } from '../utils/sound.util';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkin'>;

export default function CheckinScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { setCurrentFlight } = useFlightContext();
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

      // ✅ Compter les scans check-in d'aujourd'hui depuis raw_scans
      const { rawScanService } = await import('../services');
      const stats = await rawScanService.getStats(user.airportCode);
      setScansToday(stats.checkinCompleted);
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

      // ✅ ÉTAPE 1: Parser le boarding pass pour extraire le numéro de vol
      let parsedData: PassengerData | null = null;
      let flightNumber = '';
      let departure = '';
      let arrival = '';

      try {
        parsedData = parserService.parse(data);
        flightNumber = parsedData.flightNumber || '';
        departure = parsedData.departure || '';
        arrival = parsedData.arrival || '';
      } catch (parseError) {
        // Parsing error - continue
      }

      // ✅ ÉTAPE 2: Valider que le vol est programmé pour aujourd'hui
      if (flightNumber) {
        const validation = await flightService.validateFlightForToday(
          flightNumber,
          user.airportCode,
          departure,
          arrival
        );

        if (!validation.isValid) {
          await playErrorSound();
          setProcessing(false);
          setScanned(false);
          
          // Utiliser Alert native qui reste affichée
          Alert.alert(
            'VOL NON AUTORISÉ',
            validation.reason || 'Le vol n\'est pas programmé pour aujourd\'hui.',
            [
              {
                text: 'Nouveau scan',
                onPress: () => setShowScanner(true),
              },
            ],
            { cancelable: false }
          );
          return;
        }

      }

      // ✅ ÉTAPE 3: Vérifier que l'aéroport correspond
      if (departure && arrival && departure !== user.airportCode && arrival !== user.airportCode) {
        await playErrorSound();
        setToastMessage(`❌ Ce vol ne concerne pas votre aéroport (${user.airportCode})\nRoute: ${departure} → ${arrival}`);
        setToastType('error');
        setShowToast(true);
        setProcessing(false);
        setScanned(false);
        setShowScanner(true);
        return;
      }

      // ✅ ÉTAPE 4: Stockage brut du scan
      const { rawScanService } = await import('../services');

      // Vérifier si ce scan existe déjà avec le statut check-in
      const existingScan = await rawScanService.findByRawData(data);
      if (existingScan && existingScan.statusCheckin) {
        await playErrorSound();
        setToastMessage('⚠️ Déjà scanné au check-in !');
        setToastType('warning');
        setShowToast(true);
        setProcessing(false);
        setScanned(false);
        return;
      }

      const result = await rawScanService.createOrUpdateRawScan({
        rawData: data,
        scanType: 'boarding_pass',
        statusField: 'checkin',
        userId: user.id,
        airportCode: user.airportCode,
      });

      // ✅ ÉTAPE 5: Créer/mettre à jour le passager en base SQLite avec les données parsées
      if (parsedData) {
        const { databaseServiceInstance } = await import('../services');
        
        // Chercher si le passager existe déjà par PNR
        let existingPassenger = await databaseServiceInstance.getPassengerByPnr(parsedData.pnr);
        
        if (!existingPassenger) {
          // Créer le passager avec les données du boarding pass
          const passengerId = await databaseServiceInstance.createPassenger({
            pnr: parsedData.pnr,
            fullName: parsedData.fullName,
            firstName: parsedData.firstName,
            lastName: parsedData.lastName,
            flightNumber: parsedData.flightNumber,
            flightTime: parsedData.flightTime,
            airline: parsedData.airline,
            airlineCode: parsedData.companyCode,
            departure: parsedData.departure,
            arrival: parsedData.arrival,
            route: parsedData.route,
            companyCode: parsedData.companyCode,
            ticketNumber: parsedData.ticketNumber,
            seatNumber: parsedData.seatNumber,
            // ✅ FIX: Ne mettre baggage_count > 0 que si baggageInfo existe vraiment
            baggageCount: parsedData.baggageInfo?.count ?? 0,
            baggageBaseNumber: parsedData.baggageInfo?.baseNumber || null,
            rawData: data,
            format: parsedData.format,
            checkedInAt: new Date().toISOString(),
            checkedInBy: user.id,
            airportCode: user.airportCode,
            synced: false,
          });
          
          // 🚀 AUSSI créer le passager au serveur via SYNC (pour que le boarding puisse le chercher)
          try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const apiKey = await AsyncStorage.getItem('@bfs:api_key');
            const apiUrl = await AsyncStorage.getItem('@bfs:api_url') || 'https://api.brsats.com';
            
            const syncResponse = await fetch(`${apiUrl}/api/v1/passengers/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey || '',
                'x-airport-code': user.airportCode || '',
              },
              body: JSON.stringify({
                passengers: [{
                  pnr: parsedData.pnr,
                  full_name: parsedData.fullName,
                  flight_number: parsedData.flightNumber,
                  seat_number: parsedData.seatNumber || null,
                  class: null,
                  departure: parsedData.departure,
                  arrival: parsedData.arrival,
                  airport_code: user.airportCode,
                  baggage_count: parsedData.baggageInfo?.count ?? 0,
                  baggage_base_number: parsedData.baggageInfo?.baseNumber || null,
                  checked_in: true,
                  checked_in_at: new Date().toISOString(),
                }]
              })
            });
            
            if (syncResponse.ok) {
              console.log('[CHECKIN] ✅ Passager synchronisé au serveur:', parsedData.pnr);
            } else {
              const errorText = await syncResponse.text();
              console.warn('[CHECKIN] ⚠️ Erreur sync passager serveur:', syncResponse.status, errorText);
            }
          } catch (serverError) {
            console.warn('[CHECKIN] ⚠️ Erreur sync passager serveur:', serverError);
            // On continue quand même, au moins c'est en cache local
          }
          
        } else {
          // Mettre à jour le passager existant avec les données du boarding pass
        }
      }

      // Enregistrer l'action d'audit
      const { logAudit } = await import('../utils/audit.util');
      await logAudit(
        'CHECKIN_PASSENGER',
        'passenger',
        `Scan check-in ${result.isNew ? 'nouveau' : 'mise à jour statut'} - Vol: ${flightNumber || 'N/A'} - Scan #${result.scanCount}`,
        result.id
      );

      // ✅ Créer un objet PassengerData pour l'affichage (avec les données parsées si disponibles)
      const displayData: PassengerData = parsedData || {
        pnr: 'En attente',
        fullName: 'Données enregistrées',
        firstName: '',
        lastName: '',
        flightNumber: 'En attente',
        route: 'En attente',
        departure: 'En attente',
        arrival: 'En attente',
        rawData: data,
        format: 'RAW_STORAGE',
      };

      setLastPassenger(displayData);

      // Jouer le son de succès
      await playSuccessSound();

      // ✅ ÉTAPE 6: Définir automatiquement le vol actuel pour les bagages
      if (parsedData && parsedData.flightNumber && parsedData.flightNumber !== 'UNKNOWN') {
        await setCurrentFlight({
          flightNumber: parsedData.flightNumber,
          airline: parsedData.airline || '',
          airlineCode: parsedData.companyCode || '',
          departure: parsedData.departure || '',
          arrival: parsedData.arrival || '',
          selectedAt: new Date().toISOString(),
          selectedBy: user.id,
        });
      }

      // Message selon si c'est nouveau ou mise à jour
      const message = result.isNew
        ? `✅ Check-in enregistré ! (Vol: ${flightNumber || 'N/A'})`
        : `✅ Check-in mis à jour ! (Scan #${result.scanCount})`;

      setToastMessage(message);
      setToastType('success');
      setShowToast(true);
      loadScansToday();

      // Masquer le scanner et afficher l'écran de succès
      setProcessing(false);
      setShowScanner(false);

    } catch (error) {
      console.error('Error processing scan:', error);
      await playErrorSound();
      setToastMessage(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement du scan');
      setToastType('error');
      setShowToast(true);
      setProcessing(false);
      setScanned(false);
      setShowScanner(true);
    }
  };

  const resetScanner = () => {
    // Réinitialiser tous les états pour permettre un nouveau check-in
    setLastPassenger(null);
    setScanned(false);
    setProcessing(false);
    setShowScanner(true);
    setScanning(true);
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
              <Ionicons name="checkmark-circle" size={64} color={colors.success.main} />
              <Text style={[styles.successTitle, { color: colors.text.primary }]}>Check-in enregistré ✅</Text>
            </View>
            <View style={styles.successInfo}>
              {/* Résultat simplifié */}
              <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light }]}>
                {/* Section: Statut */}
                <View style={styles.sectionHeader}>
                  <Ionicons name="cloud-upload" size={24} color={colors.success.main} />
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Données enregistrées</Text>
                </View>

                <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Statut:</Text>
                  <Badge label="✅ Enregistré" variant="success" />
                </View>

                <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Type de scan:</Text>
                  <Badge label="Boarding Pass" variant="info" />
                </View>

                <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Données capturées:</Text>
                  <Text style={[styles.resultValue, { color: colors.text.primary }]}>
                    {lastPassenger.rawData?.length || 0} caractères
                  </Text>
                </View>

                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Parsing:</Text>
                  {lastPassenger.format && lastPassenger.format !== 'RAW_STORAGE' ? (
                    <Badge label="Local ✅" variant="success" />
                  ) : (
                    <Badge label="Dashboard web" variant="warning" />
                  )}
                </View>
              </View>

              {lastPassenger.format && lastPassenger.format !== 'RAW_STORAGE' ? (
                <Text style={[styles.successText, { color: colors.text.secondary }]}>
                  ✅ Passager créé: {lastPassenger.fullName}{'\n'}
                  Vol: {lastPassenger.flightNumber} | PNR: {lastPassenger.pnr}
                </Text>
              ) : (
                <Text style={[styles.successText, { color: colors.text.secondary }]}>
                  Les données brutes ont été enregistrées avec succès. {'\n'}
                  Le parsing et l'extraction des informations se feront lors de l'export dans le dashboard web.
                </Text>
              )}
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
            // Support MAXIMAL de TOUS les formats pour accepter n'importe quel boarding pass
            // Production: accepte tous les formats possibles (PDF417, QR, Aztec, DataMatrix, Code128, Code39, etc.)
            barcodeTypes: ['pdf417', 'qr', 'aztec', 'datamatrix', 'code128', 'code39', 'code93', 'ean13', 'ean8', 'codabar', 'itf14', 'upc_a', 'upc_e'],
          }}
          onCameraReady={() => {}}
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

