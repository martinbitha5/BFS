import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, BaggageCard, Button, Card, PassengerCard, Toast } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { authServiceInstance, databaseServiceInstance } from '../services';
import { birsDatabaseService } from '../services/birs-database.service';
import { birsService } from '../services/birs.service';
import { parserService } from '../services/parser.service';
import { FontSizes, FontWeights, Spacing } from '../theme';
import { Baggage } from '../types/baggage.types';
import { Passenger } from '../types/passenger.types';
import { getScanErrorMessage, getScanResultMessage } from '../utils/scanMessages.util';
import { playErrorSound, playScanSound, playSuccessSound } from '../utils/sound.util';

type Props = NativeStackScreenProps<RootStackParamList, 'Baggage'>;

type ScanMode = 'boarding_pass' | 'rfid';

export default function BaggageScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [scanMode, setScanMode] = useState<ScanMode>('boarding_pass');
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [lastScannedRfidTag, setLastScannedRfidTag] = useState<string | null>(null);
  const [scannedBaggagesCount, setScannedBaggagesCount] = useState(0); // Compteur pour mode test
  const [scannedTagInfo, setScannedTagInfo] = useState<any>(null); // Informations extraites du tag RFID
  
  // Ref pour bloquer les scans multiples (mise à jour synchrone)
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (passenger) {
      loadBaggages();
    }
  }, [passenger]);

  const loadBaggages = async () => {
    if (!passenger) return;
    try {
      const passengerBaggages = await databaseServiceInstance.getBaggagesByPassengerId(passenger.id);
      setBaggages(passengerBaggages);
      // En mode test, initialiser le compteur avec le nombre de bagages existants
      if (__DEV__) {
        setScannedBaggagesCount(passengerBaggages.length);
      }
    } catch (error) {
      console.error('Error loading baggages:', error);
    }
  };

  const handleBoardingPassScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) {
      console.log('Scan ignoré - déjà en cours de traitement');
      return;
    }

    console.log('Boarding pass scanné:', data);
    
    // Jouer le son de scan automatique
    await playScanSound();
    
    setScanned(true);
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

      const passengerData = parserService.parse(data);
      
      // Vérifier que le vol concerne l'aéroport de l'agent
      if (
        passengerData.departure !== user.airportCode &&
        passengerData.arrival !== user.airportCode
      ) {
        await playErrorSound();
        const errorMsg = getScanErrorMessage(user.role as any, 'baggage', 'wrong_airport');
        setToastMessage(errorMsg.message);
        setToastType(errorMsg.type);
        setShowToast(true);
        isProcessingRef.current = false;
        setProcessing(false);
        setScanned(false);
        setShowScanner(true);
        return;
      }

      const found = await databaseServiceInstance.getPassengerByPnr(passengerData.pnr);
      
      if (!found) {
        await playErrorSound();
        const errorMsg = getScanErrorMessage(user.role as any, 'baggage', 'not_checked_in');
        setToastMessage(errorMsg.message);
        setToastType(errorMsg.type);
        setShowToast(true);
        isProcessingRef.current = false;
        setProcessing(false);
        setScanned(false);
        setShowScanner(true);
        return;
      }

      setPassenger(found);
      setScanMode('rfid');
      setShowScanner(true); // S'assurer que le scanner reste visible pour scanner les bagages
      setScanned(false); // Réinitialiser pour permettre le scan immédiat
      isProcessingRef.current = false; // Débloquer pour scan bagage
      setProcessing(false); // Réinitialiser pour permettre le scan immédiat
      setScannedBaggagesCount(0); // Réinitialiser le compteur
      
      console.log('[BAGGAGE SCAN] Mode changé vers RFID, scanner prêt');
      
      // Jouer le son de succès
      await playSuccessSound();
      
      setToastMessage(`Passager trouvé: ${found.fullName} (${found.baggageCount} bagage${found.baggageCount > 1 ? 's' : ''}). Scannez maintenant les tags RFID des bagages.`);
      setToastType('success');
      setShowToast(true);
      resetScanner();
    } catch (error) {
      await playErrorSound();
      setToastMessage('Erreur lors du parsing du boarding pass');
      setToastType('error');
      setShowToast(true);
      isProcessingRef.current = false;
      setProcessing(false);
      setScanned(false);
      setShowScanner(true);
    } finally {
      isProcessingRef.current = false;
      setProcessing(false);
    }
  };

  const handleRfidScanned = async ({ data }: { data: string }) => {
    // Log pour déboguer
    console.log('[BAGGAGE SCAN] handleRfidScanned appelé', { 
      data, 
      scanned, 
      processing, 
      hasPassenger: !!passenger,
      scanMode 
    });

    if (scanned || processing) {
      console.log('[BAGGAGE SCAN] Scan ignoré - déjà en cours de traitement', { scanned, processing });
      return;
    }

    console.log('[BAGGAGE SCAN] Tag RFID scanné:', data);
    console.log('[BAGGAGE SCAN] Passager:', passenger ? passenger.fullName : 'Aucun (bagage international)');
    
    // Jouer le son de scan automatique
    await playScanSound();
    
    isProcessingRef.current = true; // Bloquer AVANT les setState
    setScanned(true);
    setProcessing(true);
    
    console.log('[BAGGAGE SCAN] État après setScanned/setProcessing:', { scanned: true, processing: true });

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

      // Nettoyer les données scannées
      const cleanedData = data.trim();
      
      if (!cleanedData || cleanedData.length === 0) {
        await playErrorSound();
        setToastMessage('Données de scan vides');
        setToastType('error');
        setShowToast(true);
        isProcessingRef.current = false;
        setProcessing(false);
        setScanned(false);
        setShowScanner(true);
        return;
      }

      // Parser l'étiquette de bagage pour extraire les informations
      let baggageTagData;
      let rfidTag: string;
      
      try {
        baggageTagData = parserService.parseBaggageTag(cleanedData);
        rfidTag = baggageTagData.rfidTag.trim();
        
        // Si le parsing n'a pas extrait de tag RFID valide, utiliser les données brutes
        if (!rfidTag || rfidTag === 'UNKNOWN' || rfidTag.length === 0) {
          console.log('Tag RFID non extrait par le parser, utilisation des données brutes');
          rfidTag = cleanedData;
        }
      } catch (parseError) {
        console.error('Erreur lors du parsing de l\'étiquette:', parseError);
        // En cas d'erreur de parsing, utiliser les données brutes comme tag RFID
        rfidTag = cleanedData;
        baggageTagData = {
          passengerName: 'UNKNOWN',
          rfidTag: cleanedData,
          rawData: cleanedData,
        };
      }

      // Validation finale du tag RFID
      if (!rfidTag || rfidTag.length === 0) {
        await playErrorSound();
        setToastMessage('Impossible d\'extraire le tag RFID du scan');
        setToastType('error');
        setShowToast(true);
        isProcessingRef.current = false;
        setProcessing(false);
        setScanned(false);
        setShowScanner(true);
        return;
      }

      console.log('Tag RFID extrait:', rfidTag);

      // ✅ Vérifier dans raw_scans si ce bagage a déjà été scanné
      const { rawScanService } = await import('../services');
      const existingScan = await rawScanService.findByRawData(data);
      if (existingScan && existingScan.statusBaggage) {
        await playErrorSound();
        setToastMessage('⚠️ Bagage déjà scanné !');
        setToastType('warning');
        setShowToast(true);
        isProcessingRef.current = false;
        setProcessing(false);
        setScanned(false);
        setShowScanner(true);
        return;
      }

      // Vérifier si le bagage existe déjà dans la table normale
      const existing = await databaseServiceInstance.getBaggageByRfidTag(rfidTag);
      if (existing) {
        await playErrorSound();
        setToastMessage(`Bagage déjà scanné: ${rfidTag}`);
        setToastType('error');
        setShowToast(true);
        isProcessingRef.current = false;
        setProcessing(false);
        setScanned(false);
        setShowScanner(true); // Remettre le scanner visible pour permettre un nouveau scan
        return;
      }

      // Vérifier si le bagage existe déjà dans la table internationale
      const existingInternational = await birsDatabaseService.getInternationalBaggageByRfidTag(rfidTag);
      if (existingInternational) {
        await playErrorSound();
        setToastMessage(`Bagage international déjà scanné: ${rfidTag}`);
        setToastType('error');
        setShowToast(true);
        isProcessingRef.current = false;
        setProcessing(false);
        setScanned(false);
        setShowScanner(true); // Remettre le scanner visible pour permettre un nouveau scan
        return;
      }

      // Afficher les informations extraites
      const baggageInfo = `
Tag RFID: ${rfidTag}
${baggageTagData.passengerName !== 'UNKNOWN' ? `Passager: ${baggageTagData.passengerName}\n` : ''}
${baggageTagData.flightNumber ? `Vol: ${baggageTagData.flightNumber}\n` : ''}
${baggageTagData.pnr ? `PNR: ${baggageTagData.pnr}\n` : ''}
${passenger ? `Passager: ${passenger.fullName}` : 'Passager non enregistré'}
      `.trim();

      // Afficher les informations dans un toast
      console.log('[BAGGAGE SCAN] Affichage du toast avec tag RFID:', rfidTag);
      setToastMessage(`Tag RFID extrait: ${rfidTag}\nEnregistrement en cours...`);
      setToastType('success');
      setShowToast(true);

      // Enregistrer automatiquement le bagage
      console.log('[BAGGAGE SCAN] Début de l\'enregistrement automatique...');
      try {
        let updatedBaggages: Baggage[] = [];
        let baggageId: string | undefined;
        
        // Si le passager existe, créer un bagage normal
        if (passenger) {
          console.log('[BAGGAGE SCAN] Passager trouvé - Création bagage normal');
            
            // Vérifier si c'est un tag attendu (format Air Congo)
            const expectedTags = passenger.baggageBaseNumber
              ? generateExpectedTags(passenger.baggageBaseNumber, passenger.baggageCount)
              : [];

            const isExpected = expectedTags.includes(rfidTag);

            // Créer le bagage
            baggageId = await databaseServiceInstance.createBaggage({
              passengerId: passenger.id,
              rfidTag,
              expectedTag: isExpected ? rfidTag : undefined,
              status: 'checked',
              checkedAt: new Date().toISOString(),
              checkedBy: user.id,
              synced: false,
            });

            // Enregistrer l'action d'audit
            const { logAudit } = await import('../utils/audit.util');
            await logAudit(
              'REGISTER_BAGGAGE',
              'baggage',
              `Enregistrement bagage RFID: ${rfidTag} pour passager ${passenger.fullName} (PNR: ${passenger.pnr})`,
              baggageId
            );

            // Ajouter à la file de synchronisation
            await databaseServiceInstance.addToSyncQueue({
              tableName: 'baggages',
              recordId: rfidTag,
              operation: 'insert',
              data: JSON.stringify({ passengerId: passenger.id, rfidTag }),
              retryCount: 0,
              userId: user.id,
            });

            // ✅ Enregistrer dans raw_scans
            await rawScanService.createOrUpdateRawScan({
              rawData: data,
              scanType: 'baggage_tag',
              statusField: 'baggage',
              userId: user.id,
              airportCode: user.airportCode,
              baggageRfidTag: rfidTag,
            });

            // Recharger les bagages
            updatedBaggages = await databaseServiceInstance.getBaggagesByPassengerId(passenger.id);
          } else {
            // Si le passager n'existe pas, créer un bagage international
            console.log('[BAGGAGE SCAN] Passager non trouvé - Création bagage INTERNATIONAL');
            
            const internationalBaggage = await birsService.createInternationalBaggage(
              rfidTag,
              user.id,
              user.airportCode,
              baggageTagData.passengerName !== 'UNKNOWN' ? baggageTagData.passengerName : undefined,
              baggageTagData.pnr,
              baggageTagData.flightNumber,
              baggageTagData.origin
            );

            // Enregistrer l'action d'audit
            const { logAudit } = await import('../utils/audit.util');
            await logAudit(
              'REGISTER_INTERNATIONAL_BAGGAGE',
              'international_baggage',
              `Enregistrement bagage international: ${rfidTag} - ${baggageTagData.passengerName || 'INCONNU'} (PNR: ${baggageTagData.pnr || 'N/A'})`,
              internationalBaggage.id
            );

            // ✅ Enregistrer dans raw_scans
            await rawScanService.createOrUpdateRawScan({
              rawData: data,
              scanType: 'baggage_tag',
              statusField: 'baggage',
              userId: user.id,
              airportCode: user.airportCode,
              baggageRfidTag: rfidTag,
            });

            console.log('[BAGGAGE SCAN] Bagage international créé:', internationalBaggage.id);
        }

        // Jouer le son de succès
        await playSuccessSound();
        
        // Obtenir le message selon le rôle
        let successMsg;
        if (passenger) {
          successMsg = getScanResultMessage(user.role as any, 'baggage', true, {
            passengerName: passenger.fullName,
            baggageCount: passenger.baggageCount,
            scannedCount: __DEV__ ? baggages.length + 1 : updatedBaggages.length,
          });
        } else {
          // Message pour bagage international
          successMsg = {
            title: 'Bagage International',
            message: `Bagage international enregistré`,
            type: 'success' as const
          };
        }
        
        // Mettre à jour le toast avec le message de succès
        if (__DEV__) {
          console.log('[BAGGAGE SCAN] MODE TEST - Scan simulé (non enregistré)');
          console.log('[BAGGAGE SCAN] Tag RFID:', rfidTag);
        } else {
          if (passenger) {
            console.log('[BAGGAGE SCAN] Enregistrement réussi dans la base de données');
            console.log('[BAGGAGE SCAN] Bagage ID:', baggageId);
            console.log('[BAGGAGE SCAN] Tag RFID:', rfidTag);
            console.log('[BAGGAGE SCAN] Nombre de bagages scannés:', updatedBaggages.length);
          } else {
            console.log('[BAGGAGE SCAN] Bagage INTERNATIONAL enregistré');
            console.log('[BAGGAGE SCAN] Tag RFID:', rfidTag);
            console.log('[BAGGAGE SCAN] Type: INTERNATIONAL');
          }
        }
        
        setToastMessage(`${successMsg.message}\nTag RFID: ${rfidTag}${!passenger ? '\nBAGAGE INTERNATIONAL' : ''}`);
        setToastType('success');
        setShowToast(true);
        
        // Stocker le tag RFID scanné pour l'afficher dans l'écran de succès
        setLastScannedRfidTag(rfidTag);
        
        // Ensuite masquer le scanner et afficher l'écran de succès
        // Le résultat restera affiché jusqu'à ce que l'utilisateur clique sur "Scanner à nouveau"
        setShowScanner(false);
        
        // IMPORTANT: Garder scanned à true pour empêcher tout nouveau scan automatique
        // Il sera réinitialisé uniquement quand l'utilisateur clique sur le bouton
        
        console.log('[BAGGAGE SCAN] ÉTATS MIS À JOUR:', { 
          showScanner: false, 
          processing: false, 
          scanned: true,
          lastScannedRfidTag: rfidTag,
          type: passenger ? 'NORMAL' : 'INTERNATIONAL'
        });
        console.log('[BAGGAGE SCAN] Écran de succès devrait maintenant être visible');
        // Le résultat reste affiché jusqu'à ce que l'utilisateur clique sur "Scanner à nouveau"
      } catch (error) {
        await playErrorSound();
        setToastMessage(`Erreur lors de l'enregistrement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        setToastType('error');
        setShowToast(true);
        isProcessingRef.current = false;
        setProcessing(false);
        setScanned(false);
        setShowScanner(true); // Remettre le scanner visible en cas d'erreur
      }
    } catch (error) {
      await playErrorSound();
      const user = await authServiceInstance.getCurrentUser();
      const errorMsg = getScanErrorMessage(user?.role as any || 'baggage', 'baggage', 'unknown');
      setToastMessage(error instanceof Error ? error.message : errorMsg.message);
      setToastType('error');
      setShowToast(true);
      isProcessingRef.current = false;
      setProcessing(false);
      setScanned(false);
      setShowScanner(true); // Remettre le scanner visible en cas d'erreur
    }
  };

  const generateExpectedTags = (baseNumber: string, count: number): string[] => {
    const tags: string[] = [];
    const base = parseInt(baseNumber, 10);
    for (let i = 0; i < count; i++) {
      tags.push((base + i).toString());
    }
    return tags;
  };

  const resetScanner = () => {
    console.log('[BAGGAGE SCAN] resetScanner appelé');
    // Réinitialiser processing immédiatement pour permettre de nouveaux scans
    isProcessingRef.current = false;
    setProcessing(false);
    // Réinitialiser scanned après un court délai pour éviter les scans multiples rapides
    setTimeout(() => {
      console.log('[BAGGAGE SCAN] Réinitialisation de scanned à false');
      setScanned(false);
    }, 1500);
    // S'assurer que le scanner est visible
    setShowScanner(true);
  };

  const resetPassenger = () => {
    setPassenger(null);
    setBaggages([]);
    setScanMode('boarding_pass');
    setShowScanner(true);
    setLastScannedRfidTag(null);
    setScannedBaggagesCount(0);
  };

  const handleScanAgain = () => {
    isProcessingRef.current = false; // Débloquer pour nouveau scan
    setScanned(false);
    setProcessing(false);
    setLastScannedRfidTag(null);
    setShowScanner(true);
    setPassenger(null);
    setBaggages([]);
    setScannedTagInfo(null);
    setScannedBaggagesCount(0);
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
        duration={5000}
        onHide={() => setShowToast(false)}
      />
      

      {processing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.processingText, { color: colors.text.secondary }]}>Traitement en cours...</Text>
        </View>
      ) : !showScanner && lastScannedRfidTag ? (
        <ScrollView 
          style={styles.successContainer}
          contentContainerStyle={styles.successContentContainer}
          showsVerticalScrollIndicator={true}>
          <Card style={styles.successCard}>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success.main} />
              <Text style={[styles.successTitle, { color: colors.text.primary }]}>Bagage enregistré</Text>
            </View>
            <View style={styles.successInfo}>
              {/* Section: Informations Passager ou Tag */}
              {(passenger || scannedTagInfo) ? (
                <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="person" size={20} color={colors.primary.main} />
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations {passenger ? 'Passager' : 'Extraites du Tag'}</Text>
                  </View>
                  
                  {/* Nom complet - mise en avant */}
                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Nom complet:</Text>
                    <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.bold, fontSize: FontSizes.md }]}>
                      {passenger ? passenger.fullName : (scannedTagInfo?.passengerName || 'INCONNU')}
                    </Text>
                  </View>

                  {/* Origine - mise en avant */}
                  {(passenger?.departure || scannedTagInfo?.origin) && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Origine:</Text>
                      <Badge label={passenger ? passenger.departure : scannedTagInfo.origin} variant="info" />
                    </View>
                  )}

                  {/* Destination - mise en avant */}
                  {(passenger?.arrival || scannedTagInfo?.destination) && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Destination:</Text>
                      <Badge label={passenger ? passenger.arrival : scannedTagInfo.destination} variant="success" />
                    </View>
                  )}

                  {/* Nombre de bagages - mise en avant */}
                  {(passenger?.baggageCount || scannedTagInfo?.baggageCount) && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Nombre de bagages:</Text>
                      <Badge 
                        label={passenger 
                          ? `${passenger.baggageCount} bagage${passenger.baggageCount > 1 ? 's' : ''}`
                          : `${scannedTagInfo?.baggageCount} bagage${(scannedTagInfo?.baggageCount || 0) > 1 ? 's' : ''}`
                        }
                        variant="warning"
                      />
                    </View>
                  )}
                  
                  {/* Séquence du bagage (uniquement depuis le tag) */}
                  {!passenger && scannedTagInfo?.baggageSequence && scannedTagInfo?.baggageCount && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Bagage n°:</Text>
                      <Badge 
                        label={`${scannedTagInfo.baggageSequence} / ${scannedTagInfo.baggageCount}`}
                        variant="info"
                      />
                    </View>
                  )}

                  {(passenger?.flightNumber || scannedTagInfo?.flightNumber) && (
                    <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Vol:</Text>
                      <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.semibold }]}>
                        {passenger ? passenger.flightNumber : scannedTagInfo?.flightNumber}
                      </Text>
                    </View>
                  )}

                  {(passenger?.pnr || scannedTagInfo?.pnr) && (
                    <View style={styles.resultRow}>
                      <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>PNR:</Text>
                      <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace', letterSpacing: 2 }]}>
                        {passenger ? passenger.pnr : scannedTagInfo?.pnr}
                      </Text>
                    </View>
                  )}

                  {/* Section: Progression Bagages (seulement si passager) */}
                  {passenger && (
                    <>
                      <View style={[styles.sectionHeader, { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.border.light }]}>
                        <Ionicons name="checkmark-done" size={20} color={colors.primary.main} />
                        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Progression</Text>
                      </View>

                      <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
                        <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Scannés:</Text>
                        <Badge 
                          label={`${__DEV__ ? scannedBaggagesCount : baggages.length} / ${passenger.baggageCount}`}
                          variant={(__DEV__ ? scannedBaggagesCount : baggages.length) >= passenger.baggageCount ? "success" : "info"}
                        />
                      </View>
                      <View style={styles.resultRow}>
                        <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Restants:</Text>
                        <Badge 
                          label={`${Math.max(0, passenger.baggageCount - (__DEV__ ? scannedBaggagesCount : baggages.length))}`}
                          variant={Math.max(0, passenger.baggageCount - (__DEV__ ? scannedBaggagesCount : baggages.length)) === 0 ? "success" : "warning"}
                        />
                      </View>
                    </>
                  )}
                </View>
              ) : null}
              
              {/* Section: Numéro d'étiquette */}
              <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light, marginTop: Spacing.md }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="barcode" size={20} color={colors.primary.main} />
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Numéro d'Étiquette Bagage</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace', letterSpacing: 1, textAlign: 'center', flex: 1, fontSize: FontSizes.lg, fontWeight: FontWeights.bold }]}>
                    {lastScannedRfidTag}
                  </Text>
                </View>
              </View>
              
              <Text style={[styles.successText, { color: colors.text.secondary }]}>
                {passenger && (__DEV__ ? scannedBaggagesCount : baggages.length) >= passenger.baggageCount
                  ? 'Tous les bagages ont été scannés avec succès.'
                  : 'Le bagage a été enregistré avec succès.'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.scanAgainButton, { backgroundColor: colors.primary.main }]}
              onPress={() => {
                console.log('[BAGGAGE SCAN] Bouton "Scanner à nouveau" cliqué');
                // Réinitialiser tous les états pour permettre un nouveau scan
                setLastScannedRfidTag(null);
                setScannedTagInfo(null);
                setScanned(false);
                isProcessingRef.current = false;
                setProcessing(false);
                setShowScanner(true);
                // Recharger les bagages pour mettre à jour le compteur
                if (passenger) {
                  loadBaggages();
                }
                console.log('[BAGGAGE SCAN] Scanner réactivé - Prêt pour un nouveau scan');
              }}
              activeOpacity={0.8}>
              <Ionicons name="barcode-outline" size={24} color={colors.primary.contrast} />
              <Text style={[styles.scanAgainButtonText, { color: colors.primary.contrast }]}>
                Scanner à nouveau
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
            // Guard: Ignorer si déjà en cours (utilise ref pour update synchrone)
            if (isProcessingRef.current || event.data === lastScannedRfidTag) {
              return;
            }
            
            // Bloquer immédiatement les autres scans
            isProcessingRef.current = true;
            
            // Vérifier données valides
            if (!event || !event.data || event.data.trim().length === 0) {
              return;
            }
            
            // Détection automatique tag bagage
            const isBaggageTagType = ['interleaved2of5', 'itf14', 'code128', 'code39', 'ean13', 'ean8', 'aztec'].includes(event.type?.toLowerCase() || '');
            const isBaggageTagData = /^\d{4,}$/.test(event.data.trim());
            
            if (scanMode === 'boarding_pass' && (isBaggageTagType || isBaggageTagData)) {
              handleRfidScanned(event);
            } else if (scanMode === 'boarding_pass') {
              handleBoardingPassScanned(event);
            } else {
              handleRfidScanned(event);
            }
          }}
          barcodeScannerSettings={{
            // En mode debug, permettre tous les formats même en mode boarding_pass pour tester
            barcodeTypes: scanMode === 'boarding_pass' 
              ? (__DEV__ 
                  ? ['pdf417', 'qr', 'ean13', 'ean8', 'code128', 'code39', 'codabar', 'itf14', 'interleaved2of5', 'upc_a', 'upc_e', 'datamatrix', 'aztec']
                  : ['pdf417', 'qr'])
              : ['qr', 'ean13', 'ean8', 'code128', 'code39', 'codabar', 'itf14', 'interleaved2of5', 'upc_a', 'upc_e', 'datamatrix', 'aztec'],
            interval: 1000, // Intervalle de 1 seconde pour éviter les scans multiples rapides
          }}
          onCameraReady={() => {
            const barcodeTypes = scanMode === 'boarding_pass' 
              ? (__DEV__ 
                  ? ['pdf417', 'qr', 'itf14', 'interleaved2of5', 'code128', 'code39', 'ean13', 'ean8']
                  : ['pdf417', 'qr'])
              : ['qr', 'ean13', 'ean8', 'code128', 'code39', 'codabar', 'itf14', 'interleaved2of5', 'upc_a', 'upc_e', 'datamatrix', 'aztec'];
            
            console.log('[BAGGAGE SCAN] Caméra prête pour le scan', {
              mode: scanMode,
              hasPassenger: !!passenger,
              passengerName: passenger?.fullName || 'Aucun',
              barcodeTypes: barcodeTypes,
              debugMode: __DEV__,
              message: scanMode === 'boarding_pass' 
                ? (__DEV__ ? 'MODE DEBUG: Tous formats activés (y compris étiquettes bagage)' : 'En attente du scan du boarding pass...')
                : (passenger ? `Prêt à scanner les bagages de ${passenger.fullName}` : 'Passager requis - Scannez d\'abord le boarding pass')
            });
            setCameraReady(true);
          }}
          onMountError={(error) => {
            console.error('[BAGGAGE SCAN] Erreur de montage de la caméra:', error);
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
                {scanMode === 'boarding_pass'
                  ? 'Scannez le boarding pass du passager'
                  : 'Scannez le tag RFID du bagage'}
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

      {passenger && (
        <ScrollView style={styles.infoContainer}>
          <PassengerCard passenger={passenger} showDetails={true} />
          
          <Card style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Progression</Text>
              <Badge
                label={`${baggages.length}/${passenger.baggageCount}`}
                variant={baggages.length >= passenger.baggageCount ? 'success' : 'info'}
              />
            </View>
            {baggages.length >= passenger.baggageCount && (
              <View style={styles.completeContainer}>
                <Text style={styles.completeText}>Tous les bagages ont été scannés</Text>
              </View>
            )}
          </Card>

          {baggages.length > 0 && (
            <View style={styles.baggagesList}>
              <Text style={styles.listTitle}>Bagages scannés</Text>
              {baggages.map((baggage) => (
                <BaggageCard
                  key={baggage.id}
                  baggage={baggage}
                  showPassengerInfo={false}
                />
              ))}
            </View>
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
    gap: Spacing.md,
  },
  resultContainer: {
    padding: Spacing.md,
    borderRadius: 8,
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
  listTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
  },
  successText: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginVertical: Spacing.sm,
  },
  scanAgainButton: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.lg,
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
    justifyContent: 'space-between',
  },
  scanArea: {
    width: 300,
    height: 200,
    position: 'relative',
    alignSelf: 'center',
    marginTop: 100,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionCard: {
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.lg,
  },
  instruction: {
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
  torchButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: Spacing.md,
    borderRadius: 50,
  },
  infoContainer: {
    padding: Spacing.lg,
  },
  progressCard: {
    marginTop: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  completeContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  completeText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  baggagesList: {
    marginTop: Spacing.md,
  },
});
