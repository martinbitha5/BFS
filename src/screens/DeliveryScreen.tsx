import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Toast } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { authServiceInstance, databaseServiceInstance, rawScanService } from '../services';
import { apiService } from '../services/api.service';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { playErrorSound, playScanSound, playSuccessSound } from '../utils/sound.util';

export default function DeliveryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(true);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  
  const isProcessingRef = useRef(false);
  
  // Animation refs
  const checkmarkScaleRef = useRef(new Animated.Value(0)).current;
  const checkmarkOpacityRef = useRef(new Animated.Value(0)).current;

  // ========== PDA LASER SCANNER SUPPORT ==========
  const pdaInputRef = useRef<TextInput>(null);
  const [pdaScanData, setPdaScanData] = useState('');
  const pdaScanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusPdaInput = useCallback(() => {
    if (showScanner && !processing) {
      setTimeout(() => {
        pdaInputRef.current?.focus();
      }, 100);
    }
  }, [showScanner, processing]);

  const handlePdaScanComplete = useCallback((data: string) => {
    // Ignorer si traitement en cours ou scanner non affiché
    if (isProcessingRef.current || !showScanner) {
      console.log('[PDA SCAN - DELIVERY] ⏳ Scan ignoré (traitement en cours)');
      setPdaScanData('');
      return;
    }

    if (data.length >= 6) {
      console.log('[PDA SCAN - DELIVERY] ✅ Tag bagage reçu:', data.length, 'chars');
      isProcessingRef.current = true;
      setPdaScanData('');
      if (pdaScanTimeoutRef.current) {
        clearTimeout(pdaScanTimeoutRef.current);
        pdaScanTimeoutRef.current = null;
      }
      handleBarcodeScanned({ data });
    } else if (data.length > 0) {
      console.log('[PDA SCAN - DELIVERY] ⚠️ Données ignorées:', data.length, 'chars');
      setPdaScanData('');
      focusPdaInput();
    }
  }, [showScanner]);

  const handlePdaInput = useCallback((text: string) => {
    if (pdaScanTimeoutRef.current) {
      clearTimeout(pdaScanTimeoutRef.current);
    }
    const cleanedText = text.replace(/[\r\n]/g, '');
    setPdaScanData(cleanedText);
    if (text.includes('\n') || text.includes('\r')) {
      handlePdaScanComplete(cleanedText);
      return;
    }
    pdaScanTimeoutRef.current = setTimeout(() => {
      handlePdaScanComplete(cleanedText);
    }, 300);
  }, [handlePdaScanComplete]);

  useEffect(() => {
    focusPdaInput();
  }, [showScanner, focusPdaInput]);

  const animateCheckmark = useCallback(() => {
    checkmarkScaleRef.setValue(0);
    checkmarkOpacityRef.setValue(0);
    
    Animated.parallel([
      Animated.spring(checkmarkScaleRef, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 40,
      }),
      Animated.timing(checkmarkOpacityRef, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    // Note: isProcessingRef.current est déjà vérifié et mis à true dans handlePdaScanComplete
    if (scanned || processing) {
      return;
    }

    // Bloquer les scans multiples via les états React
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

      // Requête pour récupérer les infos du bagage
      try {
        console.log('[DELIVERY] 1️⃣ Début recherche bagage pour:', cleanedData);
        console.log('[DELIVERY] 1b️⃣ Longueur:', cleanedData.length);
        console.log('[DELIVERY] 1c️⃣ Contient espaces?', cleanedData.includes(' ') ? 'OUI ⚠️' : 'NON ✅');
        
        // Récupérer l'utilisateur courant d'abord
        const user = await authServiceInstance.getCurrentUser();
        console.log('[DELIVERY] 2️⃣ Utilisateur récupéré:', user?.id);
        
        if (!user) {
          await playErrorSound();
          setToastMessage('Impossible de récupérer les infos utilisateur');
          setToastType('error');
          setShowToast(true);
          resetScanner();
          return;
        }

        // Requête via l'API backend (comme ArrivalScreen)
        let baggageData;
        try {
          console.log('[DELIVERY] 3️⃣ Appel API: /api/v1/baggage/' + cleanedData);
          console.log('[DELIVERY] 3b️⃣ Longueur tag:', cleanedData.length, 'chars');
          const response = await apiService.get(`/api/v1/baggage/${cleanedData}`);
          
          console.log('[DELIVERY] 4️⃣ Réponse API success?', response.data?.success);
          console.log('[DELIVERY] 4b️⃣ Réponse complète:', response.data);
          
          if (response.data?.success && response.data?.data) {
            baggageData = response.data.data;
            console.log('[DELIVERY] 5️⃣ Bagage trouvé:', baggageData.id);
            console.log('[DELIVERY] 6️⃣ Tag:', baggageData.tag_number);
          } else {
            console.log('[DELIVERY] ⚠️ Aucun bagage trouvé via API');
          }
        } catch (apiError: any) {
          console.log('[DELIVERY] ❌ Erreur API Status:', apiError.response?.status);
          console.log('[DELIVERY] ❌ Erreur API Message:', apiError.message);
          console.log('[DELIVERY] ❌ Erreur API Data:', apiError.response?.data);
        }

        console.log('[DELIVERY] 🔟 baggageData trouvé?', !!baggageData);

        if (!baggageData) {
          await playErrorSound();
          setToastMessage('Bagage non trouvé');
          setToastType('error');
          setShowToast(true);
          resetScanner();
          return;
        }

        // Auto-confirm: Mettre à jour le statut du bagage à 'delivered'
        await databaseServiceInstance.updateBaggageStatus(baggageData.id, 'delivered', user.id);
        
        // L'API retourne en snake_case (tag_number), fallback au scanned value
        const tagNumberForSync = baggageData.tag_number || baggageData.tagNumber || cleanedData;
        
        // Ajouter à la sync queue
        await databaseServiceInstance.addToSyncQueue({
          tableName: 'baggages',
          recordId: baggageData.id,
          operation: 'UPDATE',
          data: JSON.stringify({ 
            tag_number: tagNumberForSync,
            status: 'delivered',
            airport_code: user.airportCode,
            delivered_at: new Date().toISOString(),
          }),
          retryCount: 0,
          userId: user.id,
        });

        // Créer une entrée raw_scan
        await rawScanService.createOrUpdateRawScan({
          rawData: tagNumberForSync,
          scanType: 'baggage_tag',
          statusField: 'baggage',
          userId: user.id,
          airportCode: user.airportCode || '',
          baggageRfidTag: tagNumberForSync,
        });

        // Jouer le son de succès et afficher l'animation
        await playSuccessSound();
        setShowScanner(false);
        setShowCheckmark(true);
        animateCheckmark();

        // Réinitialiser après 2 secondes
        setTimeout(() => {
          resetScanner();
        }, 2000);

      } catch (apiError: any) {
        console.error('[DELIVERY] Erreur recherche bagage:', apiError);
        await playErrorSound();
        
        setToastMessage('Erreur de vérification du bagage');
        setToastType('error');
        setShowToast(true);
        resetScanner();
      }

    } catch (error) {
      console.error('[DELIVERY] Erreur scan:', error);
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
    setShowCheckmark(false);
    setScanned(false);  // ✅ Immédiatement réinitialisé
    setShowScanner(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.default }]}>
      <Toast
        message={toastMessage}
        type={toastType}
        visible={showToast}
        duration={3000}
        onHide={() => setShowToast(false)}
      />

      {showCheckmark ? (
        // Full-screen checkmark animation
        <View style={[styles.checkmarkContainer, { backgroundColor: colors.success.main }]}>
          <Animated.View
            style={[
              styles.checkmarkIconWrapper,
              {
                transform: [{ scale: checkmarkScaleRef }],
                opacity: checkmarkOpacityRef,
              },
            ]}>
            <Ionicons name="checkmark-circle" size={220} color="#fff" />
          </Animated.View>
          <Text style={styles.checkmarkText}>LIVRÉ</Text>
        </View>
      ) : showScanner ? (
        // PDA Scanner view
        <View style={styles.pdaScanContainer}>
          {/* Hidden TextInput to capture PDA laser scanner input */}
          <TextInput
            ref={pdaInputRef}
            style={styles.hiddenInput}
            value={pdaScanData}
            onChangeText={handlePdaInput}
            autoFocus={true}
            showSoftInputOnFocus={false}
            caretHidden={true}
            blurOnSubmit={false}
            onBlur={focusPdaInput}
          />
          
          <View style={styles.pdaScanContent}>
            <View style={[styles.pdaIconContainer, { backgroundColor: colors.success.main + '20' }]}>
              <Ionicons name="scan" size={80} color={colors.success.main} />
            </View>
            
            <Card style={styles.pdaInfoCard}>
              <View style={[styles.deliveryBanner, { backgroundColor: 'rgba(40,167,69,0.9)' }]}>
                <Ionicons name="checkmark-done" size={24} color="#fff" />
                <Text style={styles.deliveryBannerText}>MODE LIVRAISON</Text>
              </View>
              
              <Text style={[styles.pdaTitle, { color: colors.text.primary }]}>
                Scanner Laser PDA
              </Text>
              <Text style={[styles.pdaSubtitle, { color: colors.text.secondary }]}>
                Appuyez sur le bouton de scan du PDA pour scanner l'étiquette du bagage à livrer
              </Text>
              
              <View style={[styles.pdaStatusContainer, { backgroundColor: colors.success.main + '15' }]}>
                <Ionicons name="radio-button-on" size={16} color={colors.success.main} />
                <Text style={[styles.pdaStatusText, { color: colors.success.main }]}>
                  Prêt à scanner
                </Text>
              </View>
            </Card>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Checkmark overlay styles
  checkmarkContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  checkmarkIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  // PDA Scanner styles
  pdaScanContainer: {
    flex: 1,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  pdaScanContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  pdaIconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  pdaInfoCard: {
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deliveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  deliveryBannerText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  pdaTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pdaSubtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  pdaStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  pdaStatusText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
});
