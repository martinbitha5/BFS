import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { databaseServiceInstance, authServiceInstance } from '../services';
import { Baggage } from '../types/baggage.types';
import { Passenger } from '../types/passenger.types';
import { Button, Card, Badge, PassengerCard, BaggageCard, Toast } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSizes, FontWeights } from '../theme';
import { playScanSound, playSuccessSound, playErrorSound } from '../utils/sound.util';
import { getScanResultMessage, getScanErrorMessage } from '../utils/scanMessages.util';

type Props = NativeStackScreenProps<RootStackParamList, 'Arrival'>;

export default function ArrivalScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [baggage, setBaggage] = useState<Baggage | null>(null);
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [torchEnabled, setTorchEnabled] = useState(false);

  const handleRfidScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) {
      console.log('Scan ignoré - déjà en cours de traitement');
      return;
    }

    console.log('Tag RFID scanné:', data);
    
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

      const rfidTag = data.trim();
      const found = await databaseServiceInstance.getBaggageByRfidTag(rfidTag);
      
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
    setTimeout(() => {
      setScanned(false);
    }, 2000);
  };

  const resetAll = () => {
    setBaggage(null);
    setPassenger(null);
    setShowScanner(true);
    setScanned(false);
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
            <Text style={[styles.title, { color: colors.text.primary }]}>Arrivée des Bagages</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Scannez le tag RFID</Text>
          </View>
          {baggage && (
            <Button
              title="Nouveau"
              onPress={resetAll}
              variant="outline"
              size="sm"
            />
          )}
        </View>
      </Card>

      {processing && !baggage ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.processingText, { color: colors.text.secondary }]}>Recherche en cours...</Text>
        </View>
      ) : showScanner ? (
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torchEnabled}
          onBarcodeScanned={handleRfidScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128'],
            interval: 1000,
          }}
          onCameraReady={() => {
            console.log('Caméra prête pour le scan RFID');
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
                Scannez le tag RFID du bagage arrivé
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

      {baggage && passenger && (
        <ScrollView style={styles.infoContainer}>
          <BaggageCard
            baggage={baggage}
            showPassengerInfo={true}
            passengerName={passenger.fullName}
          />
          
          <PassengerCard passenger={passenger} showDetails={true} />

          {baggage.status !== 'arrived' && (
            <Button
              title="Confirmer l'arrivée du bagage"
              onPress={confirmArrival}
              loading={processing}
              style={styles.confirmButton}
              variant="success"
            />
          )}

          {baggage.status === 'arrived' && (
            <Card style={styles.arrivedCard}>
              <Badge label="✓ Arrivé" variant="success" />
              <Text style={styles.arrivedText}>Ce bagage a déjà été marqué comme arrivé</Text>
            </Card>
          )}
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
  infoContainer: {
    maxHeight: '50%',
    padding: Spacing.md,
  },
  confirmButton: {
    marginTop: Spacing.md,
  },
  arrivedCard: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  arrivedText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    textAlign: 'center',
    marginTop: Spacing.sm,
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
