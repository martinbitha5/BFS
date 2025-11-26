import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { parserService } from '../services/parser.service';
import { databaseServiceInstance, authServiceInstance } from '../services';
import { Passenger } from '../types/passenger.types';
import { Button, Card, Badge, PassengerCard, FlightInfo, Toast } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSizes, FontWeights } from '../theme';
import { playScanSound, playSuccessSound, playErrorSound } from '../utils/sound.util';
import { getScanResultMessage, getScanErrorMessage } from '../utils/scanMessages.util';

type Props = NativeStackScreenProps<RootStackParamList, 'Boarding'>;

export default function BoardingScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastPassenger, setLastPassenger] = useState<Passenger | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [torchEnabled, setTorchEnabled] = useState(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) {
      console.log('Scan ignoré - déjà en cours de traitement');
      return;
    }

    console.log('Code-barres scanné:', data);
    
    // Jouer le son de scan automatique
    await playScanSound();
    
    setScanned(true);
    setProcessing(true);

    try {
      const user = await authServiceInstance.getCurrentUser();
      if (!user) {
        await playErrorSound();
        Alert.alert('Erreur', 'Utilisateur non connecté');
        resetScanner();
        return;
      }

      // Parser le boarding pass
      const passengerData = parserService.parse(data);

      // Vérifier que le passager est enregistré
      const passenger = await databaseServiceInstance.getPassengerByPnr(passengerData.pnr);
      if (!passenger) {
        await playErrorSound();
        const errorMsg = getScanErrorMessage(user.role as any, 'boarding', 'not_checked_in');
        setToastMessage(errorMsg.message);
        setToastType(errorMsg.type);
        setShowToast(true);
        resetScanner();
        return;
      }

      // Vérifier si déjà embarqué
      const boardingStatus = await databaseServiceInstance.getBoardingStatusByPassengerId(passenger.id);
      if (boardingStatus?.boarded) {
        await playErrorSound();
        const errorMsg = getScanErrorMessage(user.role as any, 'boarding', 'already_processed');
        setToastMessage(errorMsg.message);
        setToastType(errorMsg.type);
        setShowToast(true);
        resetScanner();
        return;
      }

      // Marquer comme embarqué
      await databaseServiceInstance.createOrUpdateBoardingStatus({
        passengerId: passenger.id,
        boarded: true,
        boardedAt: new Date().toISOString(),
        boardedBy: user.id,
        synced: false,
      });

      // Enregistrer l'action d'audit
      const { logAudit } = await import('../utils/audit.util');
      await logAudit(
        'BOARD_PASSENGER',
        'boarding',
        `Embarquement passager: ${passenger.fullName} (PNR: ${passenger.pnr}) - Vol: ${passenger.flightNumber}`,
        passenger.id
      );

      // Ajouter à la file de synchronisation
      await databaseServiceInstance.addToSyncQueue({
        tableName: 'boarding_status',
        recordId: passenger.id,
        operation: 'update',
        data: JSON.stringify({ passengerId: passenger.id, boarded: true }),
        retryCount: 0,
        userId: user.id,
      });

      setLastPassenger(passenger);
      
      // Jouer le son de succès
      await playSuccessSound();
      
      // Obtenir le message selon le rôle
      const successMsg = getScanResultMessage(user.role as any, 'boarding', true, {
        passengerName: passenger.fullName,
        pnr: passenger.pnr,
        flightNumber: passenger.flightNumber,
      });
      
      setToastMessage(successMsg.message);
      setToastType(successMsg.type);
      setShowToast(true);
      resetScanner();
    } catch (error) {
      console.error('Error processing boarding:', error);
      await playErrorSound();
      const user = await authServiceInstance.getCurrentUser();
      const errorMsg = getScanErrorMessage(user?.role as any || 'boarding', 'boarding', 'unknown');
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
    }, 2000);
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
      
      <Card style={[styles.headerCard, { marginTop: insets.top + Spacing.lg }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text.primary }]}>Embarquement</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Scannez le boarding pass</Text>
          </View>
        </View>
      </Card>

      {processing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.processingText, { color: colors.text.secondary }]}>Validation en cours...</Text>
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
                Scannez le boarding pass pour valider l'embarquement
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
      )}

      {lastPassenger && !processing && (
        <ScrollView style={styles.resultContainer}>
          <Card style={styles.resultCard}>
            <View style={styles.successHeader}>
              <Badge label="✓ Embarqué" variant="success" />
            </View>
            <PassengerCard passenger={lastPassenger} showDetails={true} />
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
  resultContainer: {
    maxHeight: '40%',
  },
  resultCard: {
    margin: Spacing.md,
  },
  successHeader: {
    marginBottom: Spacing.md,
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

