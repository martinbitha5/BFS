import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Toast } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { authServiceInstance } from '../services';
import { apiService } from '../services/api.service';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { playErrorSound, playScanSound, playSuccessSound } from '../utils/sound.util';

export default function RushScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [tagNumber, setTagNumber] = useState('');
  const [reason, setReason] = useState('');
  const [nextFlight, setNextFlight] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [declaring, setDeclaring] = useState(false);
  
  const isProcessingRef = useRef(false);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;
    setScanned(true);
    setProcessing(true);

    await playScanSound();

    try {
      const cleanedData = data.trim();
      
      if (!cleanedData || cleanedData.length === 0) {
        await playErrorSound();
        setToastMessage('Données de scan vides');
        setToastType('error');
        setShowToast(true);
        resetScanner();
        return;
      }

      setTagNumber(cleanedData);
      await playSuccessSound();
      setToastMessage(`✅ Bagage scanné: ${cleanedData}`);
      setToastType('success');
      setShowToast(true);
      setShowScanner(false);
      isProcessingRef.current = false;
      setProcessing(false);

    } catch (error) {
      console.error('[RUSH] Erreur scan:', error);
      await playErrorSound();
      setToastMessage('Erreur lors du scan');
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
    setTagNumber('');
    setReason('');
    setNextFlight('');
    setShowScanner(true);
  };

  const handleDeclareRush = async () => {
    if (!tagNumber || !reason) {
      Alert.alert('Erreur', 'Veuillez scanner un bagage et indiquer la raison');
      return;
    }

    try {
      setDeclaring(true);
      const user = await authServiceInstance.getCurrentUser();
      
      await apiService.post('/api/v1/rush/declare', {
        tagNumber,
        reason,
        nextFlightNumber: nextFlight || undefined,
        userId: user?.id,
        airportCode: user?.airportCode,
      });

      await playSuccessSound();
      Alert.alert(
        'Succès',
        `Bagage ${tagNumber} déclaré en RUSH avec succès`,
        [{ text: 'OK', onPress: handleScanAgain }]
      );
    } catch (error: any) {
      await playErrorSound();
      Alert.alert(
        'Erreur',
        error.response?.data?.error || 'Erreur lors de la déclaration RUSH'
      );
    } finally {
      setDeclaring(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.default }]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background.default }]}>
        <Ionicons name="camera-outline" size={64} color={colors.text.secondary} />
        <Text style={[styles.message, { color: colors.text.primary }]}>Permission caméra requise</Text>
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
        duration={3000}
        onHide={() => setShowToast(false)}
      />

      {processing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.processingText, { color: colors.text.secondary }]}>Traitement en cours...</Text>
        </View>
      ) : !showScanner && tagNumber ? (
        <ScrollView 
          style={styles.formContainer}
          contentContainerStyle={[styles.formContent, { paddingTop: insets.top + Spacing.md }]}
          showsVerticalScrollIndicator={false}>
          
          <Card style={styles.scannedCard}>
            <View style={styles.scannedHeader}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success.main} />
              <Text style={[styles.scannedTitle, { color: colors.text.primary }]}>Bagage Scanné</Text>
            </View>
            
            <View style={[styles.tagContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light }]}>
              <Text style={[styles.tagLabel, { color: colors.text.secondary }]}>Numéro d'Étiquette</Text>
              <Text style={[styles.tagNumber, { color: colors.primary.main }]}>{tagNumber}</Text>
            </View>

            <View style={styles.formFields}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary }]}>Raison du RUSH *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background.paper, borderColor: colors.border.light, color: colors.text.primary }]}
                placeholder="Ex: Soute pleine, retard passager..."
                placeholderTextColor={colors.text.secondary}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.fieldLabel, { color: colors.text.primary, marginTop: Spacing.md }]}>Prochain vol (optionnel)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background.paper, borderColor: colors.border.light, color: colors.text.primary }]}
                placeholder="Ex: ET123"
                placeholderTextColor={colors.text.secondary}
                value={nextFlight}
                onChangeText={setNextFlight}
              />
            </View>

            <TouchableOpacity
              style={[styles.declareButton, { backgroundColor: colors.error.main, opacity: (!reason || declaring) ? 0.5 : 1 }]}
              onPress={handleDeclareRush}
              disabled={!reason || declaring}
              activeOpacity={0.8}>
              {declaring ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="warning" size={24} color="#fff" />
                  <Text style={styles.declareButtonText}>Déclarer en RUSH</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.scanAgainButton, { borderColor: colors.primary.main }]}
              onPress={handleScanAgain}
              activeOpacity={0.8}>
              <Ionicons name="scan" size={24} color={colors.primary.main} />
              <Text style={[styles.scanAgainButtonText, { color: colors.primary.main }]}>Scanner un autre bagage</Text>
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
            handleBarcodeScanned(event);
          }}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'codabar', 'itf14', 'upc_a', 'upc_e', 'datamatrix', 'aztec', 'pdf417'],
          }}
          onCameraReady={() => {}}
          onMountError={(error) => {
            console.error('[RUSH SCAN] Erreur de caméra:', error);
            setToastMessage('Erreur de caméra');
            setToastType('error');
            setShowToast(true);
          }}>
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, { borderColor: colors.error.main }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: colors.error.main }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.error.main }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: colors.error.main }]} />
            </View>
            <Card style={styles.instructionCard}>
              <View style={styles.rushBanner}>
                <Ionicons name="warning" size={24} color="#fff" />
                <Text style={styles.rushBannerText}>MODE RUSH</Text>
              </View>
              <Text style={styles.instruction}>Scannez le bagage à déclarer en RUSH</Text>
              <Text style={styles.subInstruction}>Le bagage sera marqué comme prioritaire</Text>
            </Card>
            <TouchableOpacity
              style={styles.torchButton}
              onPress={() => setTorchEnabled(!torchEnabled)}
              activeOpacity={0.7}>
              <Ionicons
                name={torchEnabled ? 'flashlight' : 'flashlight-outline'}
                size={32}
                color={torchEnabled ? colors.warning.main : '#fff'}
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
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
  // Camera styles
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
  rushBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(220,53,69,0.9)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  rushBannerText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  instruction: {
    color: '#fff',
    fontSize: FontSizes.lg,
    textAlign: 'center',
    fontWeight: FontWeights.bold,
  },
  subInstruction: {
    color: 'rgba(255,255,255,0.7)',
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
  // Form styles
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: Spacing.lg,
  },
  scannedCard: {
    padding: Spacing.lg,
  },
  scannedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  scannedTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  tagContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  tagLabel: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
  },
  tagNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  formFields: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    minHeight: 48,
  },
  declareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  declareButtonText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    gap: Spacing.sm,
  },
  scanAgainButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
});
