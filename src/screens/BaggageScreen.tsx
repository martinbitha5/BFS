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
// ✅ OPTIMISATION: Imports statiques pour réduire la latence
import { authServiceInstance, databaseServiceInstance, rawScanService } from '../services';
import { birsDatabaseService } from '../services/birs-database.service';
import { parserService } from '../services/parser.service';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { Passenger } from '../types/passenger.types';
import { logAudit } from '../utils/audit.util';
import { getScanErrorMessage } from '../utils/scanMessages.util';
import { playErrorSound, playScanSound, playSuccessSound } from '../utils/sound.util';

type Props = NativeStackScreenProps<RootStackParamList, 'Baggage'>;

export default function BaggageScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { currentFlight } = useFlightContext();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [lastScannedTagNumber, setLastScannedTagNumber] = useState<string | null>(null);
  const [scannedTagInfo, setScannedTagInfo] = useState<any>(null);
  const [foundPassenger, setFoundPassenger] = useState<Passenger | null>(null);
  
  // Ref pour bloquer les scans multiples (mise à jour synchrone)
  const isProcessingRef = useRef(false);

  // ========== PDA LASER SCANNER SUPPORT ==========
  const pdaInputRef = useRef<TextInput>(null);
  const [pdaScanData, setPdaScanData] = useState('');
  const pdaScanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusPdaInput = useCallback(() => {
    if (showScanner && !processing && !scannedTagInfo) {
      setTimeout(() => {
        pdaInputRef.current?.focus();
      }, 100);
    }
  }, [showScanner, processing, scannedTagInfo]);

  const handlePdaScanComplete = useCallback((data: string) => {
    // Ignorer si traitement en cours ou scanner non affiché
    if (isProcessingRef.current || !showScanner) {
      console.log('[PDA SCAN - BAGGAGE] ⏳ Scan ignoré (traitement en cours)');
      setPdaScanData('');
      return;
    }

    if (data.length >= 6) {
      console.log('[PDA SCAN - BAGGAGE] ✅ Tag bagage reçu:', data.length, 'chars');
      isProcessingRef.current = true;
      setPdaScanData('');
      if (pdaScanTimeoutRef.current) {
        clearTimeout(pdaScanTimeoutRef.current);
        pdaScanTimeoutRef.current = null;
      }
      handleRfidScanned({ data });
    } else if (data.length > 0) {
      console.log('[PDA SCAN - BAGGAGE] ⚠️ Données ignorées:', data.length, 'chars');
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

  /**
   * Scan du tag RFID du bagage
   * - Parse le tag pour extraire les informations (PNR, nom, vol, etc.)
   * - Cherche le passager correspondant dans la base de données
   * - Enregistre le bagage associé au passager
   */
  const handleRfidScanned = async ({ data }: { data: string }) => {
    // Note: isProcessingRef.current est déjà vérifié et mis à true dans handlePdaScanComplete
    if (scanned || processing) {
      return;
    }

    // Bloquer les scans multiples via les états React
    setScanned(true);
    setProcessing(true);

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

      // Nettoyer les données scannées
      const cleanedData = data.trim();
      
      if (!cleanedData || cleanedData.length === 0) {
        await playErrorSound();
        setToastMessage('Données de scan vides');
        setToastType('error');
        setShowToast(true);
        resetScanner();
        return;
      }


      // ✅ Parser l'étiquette de bagage pour extraire les informations
      let baggageTagData;
      let tagNumber: string;
      
      try {
        baggageTagData = parserService.parseBaggageTag(cleanedData);
        tagNumber = baggageTagData.tagNumber.trim();
        
        // Si le parsing n'a pas extrait de tag RFID valide, utiliser les données brutes
        if (!tagNumber || tagNumber === 'UNKNOWN' || tagNumber.length === 0) {
          tagNumber = cleanedData;
        }
      } catch (parseError) {
        // En cas d'erreur de parsing, utiliser les données brutes comme tag RFID
        tagNumber = cleanedData;
        baggageTagData = {
          passengerName: 'UNKNOWN',
          tagNumber: cleanedData,
          rawData: cleanedData,
        };
      }

      // Stocker les infos du tag pour l'affichage
      setScannedTagInfo(baggageTagData);

      // ✅ Vérifier si ce bagage a déjà été scanné dans raw_scans
      // ✅ OPTIMISATION: Import statique
      const existingScan = await rawScanService.findByRawData(data);
      if (existingScan && existingScan.statusBaggage) {
        await playErrorSound();
        setToastMessage('⚠️ Bagage déjà scanné !');
        setToastType('warning');
        setShowToast(true);
        resetScanner();
        return;
      }

      // ✅ Vérifier si le bagage existe déjà dans la table normale
      const existing = await databaseServiceInstance.getBaggageByTagNumber(tagNumber);
      if (existing) {
        await playErrorSound();
        setToastMessage(`⚠️ Bagage déjà enregistré: ${tagNumber}`);
        setToastType('warning');
        setShowToast(true);
        resetScanner();
        return;
      }

      // ✅ Vérifier si le bagage existe déjà dans la table internationale
      const existingInternational = await birsDatabaseService.getInternationalBaggageByTagNumber(tagNumber);
      if (existingInternational) {
        await playErrorSound();
        setToastMessage(`⚠️ Bagage international déjà enregistré: ${tagNumber}`);
        setToastType('warning');
        setShowToast(true);
        resetScanner();
        return;
      }

      // ✅ Chercher le passager - PRIORITÉ: par numéro de tag attendu (expectedTags)
      let passenger: Passenger | null = null;
      
      // 1. D'abord chercher localement par tag attendu (le plus fiable pour les tags numériques)
      passenger = await databaseServiceInstance.getPassengerByExpectedTag(tagNumber);

      // 2. Si pas trouvé, chercher par PNR (si le tag contient un PNR)
      if (!passenger && baggageTagData.pnr && baggageTagData.pnr !== 'UNKNOWN') {
        passenger = await databaseServiceInstance.getPassengerByPnr(baggageTagData.pnr);
      }

      // 3. Si toujours pas trouvé, chercher par nom
      if (!passenger && baggageTagData.passengerName && baggageTagData.passengerName !== 'UNKNOWN') {
        passenger = await databaseServiceInstance.getPassengerByName(baggageTagData.passengerName);
      }

      // 4. ✅ FIX: Si pas trouvé localement, chercher via l'API Supabase
      if (!passenger) {
        console.log('[BAGGAGE] Passager non trouve localement, recherche via API...');
        try {
          const apiUrl = await AsyncStorage.getItem('@bfs:api_url');
          const apiKey = await AsyncStorage.getItem('@bfs:api_key');
          
          if (apiUrl && apiKey) {
            // Extraire la base du tag (10 premiers chiffres)
            const tagBase = tagNumber.replace(/\D/g, '').substring(0, 10);
            
            const response = await fetch(`${apiUrl}/api/v1/passengers/by-baggage-tag?tag=${tagBase}&airport=${user.airportCode}`, {
              headers: {
                'x-api-key': apiKey,
                'x-airport-code': user.airportCode,
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              const result = await response.json();
              if (result.data) {
                console.log('[BAGGAGE] Passager trouve via API:', result.data.full_name);
                
                // Créer le passager localement pour les futurs scans
                const passengerId = await databaseServiceInstance.createPassenger({
                  pnr: result.data.pnr,
                  fullName: result.data.full_name,
                  firstName: result.data.first_name,
                  lastName: result.data.last_name,
                  flightNumber: result.data.flight_number,
                  airline: result.data.airline,
                  airlineCode: result.data.airline_code,
                  departure: result.data.departure,
                  arrival: result.data.arrival,
                  baggageCount: result.data.baggage_count || 1,
                  baggageBaseNumber: result.data.baggage_base_number,
                  airportCode: user.airportCode,
                  synced: true,
                });
                
                passenger = await databaseServiceInstance.getPassengerById(passengerId);
              }
            }
          }
        } catch (apiError) {
          console.error('[BAGGAGE] Erreur recherche API:', apiError);
        }
      }

      // ❌ REFUSER LE SCAN SI LE PASSAGER N'EST PAS TROUVÉ
      if (!passenger) {
        await playErrorSound();
        setProcessing(false);
        
        Alert.alert(
          'TAG NON RECONNU',
          `Le tag ${tagNumber} n'appartient a aucun passager enregistre.\n\nVerifiez que le passager a bien fait son check-in.`,
          [
            {
              text: 'Nouveau scan',
              onPress: () => {
                isProcessingRef.current = false;
                setScanned(false);
                setShowScanner(true);
              },
            },
          ],
          { cancelable: false }
        );
        return;
      }

      // ✅ Vérifier le nombre de bagages déjà enregistrés vs nombre attendu
      const existingBaggages = await databaseServiceInstance.getBaggagesByPassengerId(passenger.id);
      const baggageCount = existingBaggages?.length || 0;
      
      // Récupérer le nombre de bagages attendus depuis les données du passager
      const expectedBaggageCount = passenger.baggageCount || 1;
      
      // Si le passager a déjà atteint ou dépassé son quota de bagages
      if (baggageCount >= expectedBaggageCount) {
        await playErrorSound();
        setProcessing(false);
        
        Alert.alert(
          'QUOTA DE BAGAGES DÉPASSÉ',
          `Le passager ${passenger.fullName} a déjà ${baggageCount} bagage(s) enregistré(s).

Nombre de bagages autorisés: ${expectedBaggageCount}

Ce bagage supplémentaire ne peut pas être accepté.`,
          [
            {
              text: 'Nouveau scan',
              onPress: () => {
                isProcessingRef.current = false;
                setScanned(false);
                setShowScanner(true);
              },
            },
          ],
          { cancelable: false }
        );
        return;
      }

      // ✅ Passager trouvé et quota OK → Enregistrer le bagage
      // Créer le bagage avec TOUTES les données nécessaires pour la sync
      const baggageId = await databaseServiceInstance.createBaggage({
        passengerId: passenger.id,
        tagNumber,
        status: 'checked',
        flightNumber: passenger.flightNumber,
        airportCode: user.airportCode,
        checkedAt: new Date().toISOString(),
        checkedBy: user.id,
        synced: false,
      });

      // Enregistrer l'action d'audit
      // ✅ OPTIMISATION: Import statique
      await logAudit(
        'REGISTER_BAGGAGE',
        'baggage',
        `Enregistrement bagage RFID: ${tagNumber} pour passager ${passenger.fullName} (PNR: ${passenger.pnr})`,
        baggageId
      );

      // Note: createBaggage ajoute déjà à la sync queue, pas besoin de doublon

      // Enregistrer dans raw_scans
      await rawScanService.createOrUpdateRawScan({
        rawData: data,
        scanType: 'baggage_tag',
        statusField: 'baggage',
        userId: user.id,
        airportCode: user.airportCode,
        baggageRfidTag: tagNumber,
      });

      setFoundPassenger(passenger);
      
      await playSuccessSound();
      setToastMessage(`✅ Bagage enregistré !\nPassager: ${passenger.fullName}\nTag: ${tagNumber}`);
      setToastType('success');

      setLastScannedTagNumber(tagNumber);
      setShowToast(true);
      setShowScanner(false);
      isProcessingRef.current = false;
      setProcessing(false);

    } catch (error) {
      console.error('[BAGGAGE] Erreur:', error);
      await playErrorSound();
      const user = await authServiceInstance.getCurrentUser();
      const errorMsg = getScanErrorMessage(user?.role as any || 'baggage', 'baggage', 'unknown');
      setToastMessage(error instanceof Error ? error.message : errorMsg.message);
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
    setLastScannedTagNumber(null);
    setScannedTagInfo(null);
    setFoundPassenger(null);
    setShowScanner(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.default }]}>
      <Toast
        message={toastMessage}
        type={toastType}
        visible={showToast}
        duration={5000}
        onHide={() => setShowToast(false)}
      />

      {processing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.processingText, { color: colors.text.secondary }]}>Traitement en cours...</Text>
        </View>
      ) : !showScanner && lastScannedTagNumber ? (
        <ScrollView 
          style={styles.successContainer}
          contentContainerStyle={styles.successContentContainer}
          showsVerticalScrollIndicator={true}>
          <Card style={styles.successCard}>
            <View style={styles.successHeader}>
              <Ionicons 
                name="checkmark-circle" 
                size={48} 
                color={colors.success.main} 
              />
              <Text style={[styles.successTitle, { color: colors.text.primary }]}>
                Bagage Enregistré
              </Text>
            </View>
            
            <View style={styles.successInfo}>
              {/* Section: Tag RFID */}
              <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="barcode" size={20} color={colors.primary.main} />
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Numéro d'Étiquette</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace', letterSpacing: 1, textAlign: 'center', flex: 1, fontSize: FontSizes.lg, fontWeight: FontWeights.bold }]}>
                    {lastScannedTagNumber}
                  </Text>
                </View>
              </View>

              {/* Section: Informations extraites du tag */}
              {scannedTagInfo && (
                <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light, marginTop: Spacing.md }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="information-circle" size={20} color={colors.primary.main} />
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations Extraites</Text>
                  </View>
                  
                  {scannedTagInfo.passengerName && scannedTagInfo.passengerName !== 'UNKNOWN' && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Nom:</Text>
                      <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.bold }]}>
                        {scannedTagInfo.passengerName}
                      </Text>
                    </View>
                  )}

                  {scannedTagInfo.pnr && scannedTagInfo.pnr !== 'UNKNOWN' && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>PNR:</Text>
                      <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace', letterSpacing: 2 }]}>
                        {scannedTagInfo.pnr}
                      </Text>
                    </View>
                  )}

                  {scannedTagInfo.flightNumber && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Vol:</Text>
                      <Badge label={scannedTagInfo.flightNumber} variant="info" />
                    </View>
                  )}

                  {scannedTagInfo.origin && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Origine:</Text>
                      <Badge label={scannedTagInfo.origin} variant="info" />
                    </View>
                  )}

                  {scannedTagInfo.destination && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Destination:</Text>
                      <Badge label={scannedTagInfo.destination} variant="success" />
                    </View>
                  )}

                  {scannedTagInfo.baggageCount && scannedTagInfo.baggageSequence && (
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Bagage:</Text>
                      <Badge 
                        label={`${scannedTagInfo.baggageSequence} / ${scannedTagInfo.baggageCount}`}
                        variant="warning"
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Section: Passager Associé */}
              {foundPassenger && (
                <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.success.main, marginTop: Spacing.md }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons 
                      name="person" 
                      size={20} 
                      color={colors.success.main} 
                    />
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                      Passager Associé
                    </Text>
                  </View>
                  
                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Nom:</Text>
                    <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.bold }]}>
                      {foundPassenger.fullName}
                    </Text>
                  </View>
                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>PNR:</Text>
                    <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace' }]}>
                      {foundPassenger.pnr}
                    </Text>
                  </View>
                  {foundPassenger.flightNumber && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Vol:</Text>
                      <Badge label={foundPassenger.flightNumber} variant="info" />
                    </View>
                  )}
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Route:</Text>
                    <View style={styles.routeContainer}>
                      <Badge label={foundPassenger.departure} variant="info" />
                      <Ionicons name="arrow-forward" size={16} color={colors.text.secondary} style={{ marginHorizontal: 4 }} />
                      <Badge label={foundPassenger.arrival} variant="success" />
                    </View>
                  </View>
                </View>
              )}

              <Text style={[styles.successText, { color: colors.text.secondary }]}>
                Le bagage a été associé au passager avec succès.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.scanAgainButton, { backgroundColor: colors.primary.main }]}
              onPress={handleScanAgain}
              activeOpacity={0.8}>
              <Ionicons name="barcode-outline" size={24} color={colors.primary.contrast} />
              <Text style={[styles.scanAgainButtonText, { color: colors.primary.contrast }]}>
                Scanner un autre bagage
              </Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      ) : showScanner ? (
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
            <View style={[styles.pdaIconContainer, { backgroundColor: colors.warning.light }]}>
              <Ionicons name="briefcase" size={80} color={colors.warning.main} />
            </View>
            
            <Text style={[styles.pdaScanTitle, { color: colors.text.primary }]}>
              Scanner PDA Prêt
            </Text>
            
            <Text style={[styles.pdaScanSubtitle, { color: colors.text.secondary }]}>
              Appuyez sur le bouton de scan du PDA{'\n'}pour scanner le tag bagage
            </Text>

            {currentFlight && (
              <Card style={styles.pdaInfoCard}>
                <View style={styles.pdaInfoRow}>
                  <Ionicons name="airplane" size={20} color={colors.primary.main} />
                  <Text style={[styles.pdaInfoText, { color: colors.text.secondary }]}>
                    Vol: {currentFlight.flightNumber}
                  </Text>
                </View>
                <View style={styles.pdaInfoRow}>
                  <Ionicons name="navigate" size={20} color={colors.primary.main} />
                  <Text style={[styles.pdaInfoText, { color: colors.text.secondary }]}>
                    {currentFlight.departure} → {currentFlight.arrival}
                  </Text>
                </View>
              </Card>
            )}

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
  // Styles pour l'interface de scan PDA
  pdaInput: {
    position: 'absolute',
    top: -100,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
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
  successContainer: {
    flex: 1,
  },
  successContentContainer: {
    padding: Spacing.lg,
  },
  successCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  successTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  successInfo: {
    gap: Spacing.sm,
  },
  resultContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  resultLabel: {
    fontSize: FontSizes.sm,
    flex: 1,
  },
  resultValue: {
    fontSize: FontSizes.sm,
    flex: 2,
    textAlign: 'right',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 22,
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  flightInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  flightInfoText: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },
  instruction: {
    color: '#fff',
    fontSize: FontSizes.lg,
    textAlign: 'center',
    fontWeight: FontWeights.bold,
  },
  subInstruction: {
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
});
