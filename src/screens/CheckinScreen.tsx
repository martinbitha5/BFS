import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { parserService } from '../services/parser.service';
import { databaseServiceInstance, authServiceInstance } from '../services';
import { PassengerData } from '../types/passenger.types';
import { Button, Card, Badge, FlightInfo, Toast } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSizes, FontWeights } from '../theme';
import { playScanSound, playSuccessSound, playErrorSound } from '../utils/sound.util';
import { getScanResultMessage, getScanErrorMessage } from '../utils/scanMessages.util';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkin'>;

export default function CheckinScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [scansToday, setScansToday] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [lastPassenger, setLastPassenger] = useState<PassengerData | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [torchEnabled, setTorchEnabled] = useState(false);

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
    if (scanned || processing) {
      console.log('Scan ignoré - déjà en cours de traitement');
      return;
    }

    console.log('Code-barres scanné:', data);
    
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
        resetScanner();
        return;
      }

      // Parser les données du boarding pass
      const passengerData: PassengerData = parserService.parse(data);

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
        resetScanner();
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
        resetScanner();
        return;
      }

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
        cabinClass: undefined,
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
      resetScanner();
    } catch (error) {
      console.error('Error processing scan:', error);
      await playErrorSound();
      const user = await authServiceInstance.getCurrentUser();
      const errorMsg = getScanErrorMessage(user?.role as any || 'checkin', 'checkin', 'unknown');
      setToastMessage(error instanceof Error ? error.message : errorMsg.message);
      setToastType('error');
      setShowToast(true);
      resetScanner();
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    setTimeout(() => {
      setScanned(false);
      setScanning(true);
    }, 3000);
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
      
      <Card style={[styles.headerCard, { marginTop: insets.top + Spacing.lg }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text.primary }]}>Check-in Passagers</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Scannez le boarding pass</Text>
          </View>
          <Badge label={`${scansToday} aujourd'hui`} variant="info" />
        </View>
      </Card>

      {processing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.processingText, { color: colors.text.secondary }]}>Traitement en cours...</Text>
        </View>
      ) : (
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torchEnabled}
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['pdf417', 'qr'],
            interval: 1000,
          }}
          onCameraReady={() => {
            console.log('Caméra prête pour le scan');
          }}
          onMountError={(error) => {
            console.error('Erreur de montage de la caméra:', error);
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
      )}

      {lastPassenger && !processing && (
        <ScrollView style={styles.resultContainer}>
          <Card style={styles.resultCard}>
            <Text style={[styles.resultTitle, { color: colors.success.main }]}>✓ Dernier passager enregistré</Text>
            <View style={styles.passengerInfo}>
              <Text style={[styles.passengerName, { color: colors.text.primary }]}>{lastPassenger.fullName}</Text>
              <Text style={[styles.passengerPnr, { color: colors.text.secondary }]}>PNR: {lastPassenger.pnr}</Text>
            </View>
            <FlightInfo
              flightNumber={lastPassenger.flightNumber}
              route={lastPassenger.route}
              departure={lastPassenger.departure}
              arrival={lastPassenger.arrival}
              flightTime={lastPassenger.flightTime}
              seatNumber={lastPassenger.seatNumber}
            />
            {lastPassenger.baggageInfo && lastPassenger.baggageInfo.count > 0 && (
              <View style={styles.baggageInfo}>
                <Badge
                  label={`${lastPassenger.baggageInfo.count} bagage${lastPassenger.baggageInfo.count > 1 ? 's' : ''}`}
                  variant="info"
                />
              </View>
            )}
          </Card>
        </ScrollView>
      )}
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
    maxHeight: '40%',
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

