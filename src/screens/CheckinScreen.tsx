import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Card, Toast } from '../components';
import { useFlightContext } from '../contexts/FlightContext';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
// ✅ OPTIMISATION: Imports statiques au lieu d'imports dynamiques pour réduire la latence
import { authServiceInstance, databaseServiceInstance, flightService, parserService, rawScanService } from '../services';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { PassengerData } from '../types/passenger.types';
import { logAudit } from '../utils/audit.util';
import { playErrorSound, playScanSound, playSuccessSound } from '../utils/sound.util';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkin'>;

export default function CheckinScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { setCurrentFlight } = useFlightContext();
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
  const lastScanTimeRef = useRef<number>(0);
  const isProcessingRef = useRef(false);
  const SCAN_COOLDOWN = 2000; // 2 secondes entre chaque scan

  // ========== PDA LASER SCANNER SUPPORT ==========
  const pdaInputRef = useRef<TextInput>(null);
  const [pdaScanData, setPdaScanData] = useState('');
  const pdaScanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus le TextInput pour recevoir les données du PDA
  const focusPdaInput = useCallback(() => {
    if (showScanner && !processing && !lastPassenger) {
      setTimeout(() => {
        pdaInputRef.current?.focus();
      }, 100);
    }
  }, [showScanner, processing, lastPassenger]);

  // Traiter le scan du PDA - DÉTECTION IMMÉDIATE
  const handlePdaScanComplete = useCallback((data: string) => {
    // Ignorer si traitement en cours ou scanner non affiché
    if (isProcessingRef.current || !showScanner) {
      console.log('[PDA SCAN] ⏳ Scan ignoré (traitement en cours ou scanner masqué)');
      setPdaScanData('');
      return;
    }

    // ✅ TRAITEMENT IMMÉDIAT SI DONNÉES VALIDES
    if (data.length >= 50 && (data.startsWith('M1') || data.startsWith('M2'))) {
      console.log('[PDA SCAN] ✅ Données valides détectées IMMÉDIATEMENT:', data.length, 'chars');
      isProcessingRef.current = true; // Bloquer immédiatement
      setPdaScanData('');
      // Annuler tout timeout en attente
      if (pdaScanTimeoutRef.current) {
        clearTimeout(pdaScanTimeoutRef.current);
        pdaScanTimeoutRef.current = null;
      }
      handleBarCodeScanned({ data });
      return;
    }
    
    // ⚠️ Pour les données incomplètes, on continue d'attendre
    if (data.length > 0 && data.length < 50) {
      console.log('[PDA SCAN] 🕐 Données incomplètes (' + data.length + ' chars) - en attente de la suite...');
    } else if (data.length > 0) {
      console.log('[PDA SCAN] ⚠️ Données ignorées (format invalide):', data.length, 'chars');
      setPdaScanData('');
      focusPdaInput();
    }
  }, [showScanner]);

  // Gérer les données reçues du PDA
  const handlePdaInput = useCallback((text: string) => {
    // Annuler le timeout précédent
    if (pdaScanTimeoutRef.current) {
      clearTimeout(pdaScanTimeoutRef.current);
    }

    // Nettoyer les retours à la ligne (le PDA peut envoyer Enter à la fin)
    const cleanedText = text.replace(/[\r\n]/g, '');
    setPdaScanData(cleanedText);

    // ✅ DÉTECTION IMMÉDIATE DES DONNÉES COMPLÈTES
    if (cleanedText.length >= 50 && (cleanedText.startsWith('M1') || cleanedText.startsWith('M2'))) {
      console.log('[PDA INPUT] ✅ Détection IMMÉDIATE de données valides:', cleanedText.length, 'chars');
      handlePdaScanComplete(cleanedText);
      return;
    }

    // Si le texte contient un retour à la ligne, c'est la fin du scan
    if (text.includes('\n') || text.includes('\r')) {
      handlePdaScanComplete(cleanedText);
      return;
    }

    // ⏱️ Attendre seulement 100ms pour les données incomplètes
    pdaScanTimeoutRef.current = setTimeout(() => {
      handlePdaScanComplete(cleanedText);
    }, 100);
  }, [handlePdaScanComplete]);

  // Re-focus le TextInput quand l'écran de scan est affiché
  useEffect(() => {
    focusPdaInput();
  }, [showScanner, focusPdaInput]);

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
      // ✅ OPTIMISATION: Import statique
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
        isProcessingRef.current = false;
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
        console.log('[CheckinScreen] 🔍 Parsing boarding pass - Longueur données:', data.length);
        console.log('[CheckinScreen] 📋 Données brutes (premiers 200 chars):', data.substring(0, 200));
        
        parsedData = parserService.parse(data);
        flightNumber = parsedData.flightNumber || '';
        departure = parsedData.departure || '';
        arrival = parsedData.arrival || '';
        
        console.log('[CheckinScreen] ✅ Parsing terminé:', {
          flightNumber,
          departure,
          arrival,
          format: parsedData.format,
        });
        
        if (!flightNumber || flightNumber === 'UNKNOWN') {
          console.error('[CheckinScreen] ❌ Numéro de vol non trouvé ou UNKNOWN');
          console.error('[CheckinScreen] Données complètes (premiers 500 chars):', data.substring(0, 500));
        }
      } catch (parseError) {
        console.error('[CheckinScreen] ❌ Erreur lors du parsing:', parseError);
        console.error('[CheckinScreen] Données brutes (premiers 500 chars):', data.substring(0, 500));
        // Parsing error - continue
      }

      // ✅ ÉTAPE 2: Vérifier si le numéro de vol a été extrait
      if (!flightNumber || flightNumber === 'UNKNOWN') {
        await playErrorSound();
        isProcessingRef.current = false;
        setProcessing(false);
        setScanned(false);
        
        // Message d'erreur plus explicite selon le cas
        let errorDetail = '';
        if (data.length < 50) {
          errorDetail = `\n\nCause probable: Code-barres incorrect scanné (${data.length} caractères).\nAssurez-vous de scanner le grand code-barres PDF417 du boarding pass (rectangle avec lignes horizontales), pas les petits codes 1D.`;
        } else if (!data.startsWith('M1') && !data.startsWith('M2')) {
          errorDetail = `\n\nCause probable: Format non reconnu. Le boarding pass doit commencer par "M1" ou "M2" (standard IATA).`;
        } else {
          errorDetail = `\n\nDonnées: ${data.length} chars, Format: ${parsedData?.format || 'N/A'}`;
        }
        
        Alert.alert(
          'ERREUR DE SCAN',
          `Impossible d'extraire le numéro de vol du boarding pass.${errorDetail}`,
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

      // ✅ ÉTAPE 3: Valider que le vol est programmé pour aujourd'hui
      const validation = await flightService.validateFlightForToday(
        flightNumber,
        user.airportCode,
        departure,
        arrival
      );

      if (!validation.isValid) {
        await playErrorSound();
        isProcessingRef.current = false;
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

      // ✅ ÉTAPE 4: Vérifier que l'aéroport correspond
      if (departure && arrival && departure !== user.airportCode && arrival !== user.airportCode) {
        await playErrorSound();
        setToastMessage(`❌ Ce vol ne concerne pas votre aéroport (${user.airportCode})\nRoute: ${departure} → ${arrival}`);
        setToastType('error');
        setShowToast(true);
        isProcessingRef.current = false;
        setProcessing(false);
        setScanned(false);
        setShowScanner(true);
        return;
      }

      // ✅ ÉTAPE 4: Stockage brut du scan
      // ✅ OPTIMISATION: Import statique

      // Vérifier si ce scan existe déjà avec le statut check-in
      const existingScan = await rawScanService.findByRawData(data);
      if (existingScan && existingScan.statusCheckin) {
        await playErrorSound();
        setToastMessage('⚠️ Déjà scanné au check-in !');
        setToastType('warning');
        setShowToast(true);
        isProcessingRef.current = false;
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
      // ✅ OPTIMISATION: Import statique
      if (parsedData) {
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
            baggageBaseNumber: parsedData.baggageInfo?.baseNumber || undefined,
            rawData: data,
            format: parsedData.format,
            checkedInAt: new Date().toISOString(),
            checkedInBy: user.id,
            airportCode: user.airportCode,
            synced: false,
          });
          
          // 🚀 AUSSI créer le passager au serveur via SYNC (pour que le boarding puisse le chercher)
          // ✅ OPTIMISATION: Import statique pour AsyncStorage
          try {
            const apiKey = await AsyncStorage.getItem('@bfs:api_key');
            const apiUrl = await AsyncStorage.getItem('@bfs:api_url') || 'https://api.brsats.com';
            
            // Timeout 10s pour éviter les blocages en production
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
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
                  departure: parsedData.departure,
                  arrival: parsedData.arrival,
                  airport_code: user.airportCode,
                  baggage_count: parsedData.baggageInfo?.count ?? 0,
                  baggage_base_number: parsedData.baggageInfo?.baseNumber || null,
                  checked_in_at: new Date().toISOString(),
                }]
              }),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            
            if (syncResponse.ok) {
              const syncResult = await syncResponse.json();
              if (syncResult.count > 0) {
                console.log('[CHECKIN] ✅ Passager synchronisé au serveur:', parsedData.pnr);
              } else {
                console.warn('[CHECKIN] ⚠️ Passager non inséré:', syncResult.errors || 'Raison inconnue');
              }
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
      // ✅ OPTIMISATION: Import statique
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
      isProcessingRef.current = false;
      setProcessing(false);
      setScanned(false);
      setShowScanner(true);
    }
  };

  const resetScanner = () => {
    // Réinitialiser tous les états pour permettre un nouveau check-in
    isProcessingRef.current = false;
    setLastPassenger(null);
    setScanned(false);
    setProcessing(false);
    setShowScanner(true);
    setScanning(true);
  };

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
        <View style={[styles.pdaScanContainer, { backgroundColor: colors.background.default }]}>
          {/* TextInput invisible pour recevoir les données du scanner PDA */}
          <TextInput
            ref={pdaInputRef}
            style={styles.pdaInput}
            value={pdaScanData}
            onChangeText={handlePdaInput}
            autoFocus={true}
            showSoftInputOnFocus={false}
            caretHidden={true}
            blurOnSubmit={false}
            onSubmitEditing={() => {
              if (pdaScanData.length > 0) {
                handlePdaScanComplete(pdaScanData);
              }
            }}
          />
          
          {/* Interface visuelle pour le scan PDA */}
          <View style={styles.pdaScanContent}>
            <View style={[styles.pdaIconContainer, { backgroundColor: colors.primary.light }]}>
              <Ionicons name="scan" size={80} color={colors.primary.main} />
            </View>
            
            <Text style={[styles.pdaScanTitle, { color: colors.text.primary }]}>
              Scanner PDA Prêt
            </Text>
            
            <Text style={[styles.pdaScanSubtitle, { color: colors.text.secondary }]}>
              Appuyez sur le bouton de scan du PDA{'\n'}pour scanner le boarding pass
            </Text>

            <Card style={styles.pdaInfoCard}>
              <View style={styles.pdaInfoRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success.main} />
                <Text style={[styles.pdaInfoText, { color: colors.text.secondary }]}>
                  Check-in passagers
                </Text>
              </View>
              <View style={styles.pdaInfoRow}>
                <Ionicons name="today" size={20} color={colors.primary.main} />
                <Text style={[styles.pdaInfoText, { color: colors.text.secondary }]}>
                  Scans aujourd'hui: {scansToday}
                </Text>
              </View>
            </Card>

            {processing && (
              <View style={styles.pdaProcessingContainer}>
                <ActivityIndicator size="large" color={colors.primary.main} />
                <Text style={[styles.pdaProcessingText, { color: colors.text.secondary }]}>
                  Traitement en cours...
                </Text>
              </View>
            )}
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
  // TextInput invisible pour le scanner PDA
  pdaInput: {
    position: 'absolute',
    top: -100,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
  // Styles pour l'interface de scan PDA
  pdaScanContainer: {
    flex: 1,
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
  pdaScanTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  pdaScanSubtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  pdaInfoCard: {
    width: '100%',
    maxWidth: 300,
    padding: Spacing.lg,
  },
  pdaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  pdaInfoText: {
    fontSize: FontSizes.sm,
  },
  pdaProcessingContainer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  pdaProcessingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
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

