import { Ionicons } from '@expo/vector-icons';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CameraView, useCameraPermissions } from 'expo-camera';

import React, { useState } from 'react';

import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card, Toast } from '../components';

import { useTheme } from '../contexts/ThemeContext';

import { RootStackParamList } from '../navigation/RootStack';

import { authServiceInstance, flightService, parserService } from '../services';

import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';

import { BoardingConfirmation } from '../types/boarding-new.types';

import { BoardingStatus } from '../types/boarding.types';

import { Passenger, PassengerData } from '../types/passenger.types';

import { getScanErrorMessage } from '../utils/scanMessages.util';

import { playErrorSound, playScanSound, playSuccessSound } from '../utils/sound.util';



type Props = NativeStackScreenProps<RootStackParamList, 'Boarding'>;



export default function BoardingScreen({ navigation }: Props) {

  const { colors } = useTheme();

  const insets = useSafeAreaInsets();

  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);

  const [processing, setProcessing] = useState(false);

  const [showScanner, setShowScanner] = useState(true);

  const [lastPassenger, setLastPassenger] = useState<Passenger | null>(null);

  const [boardingStatus, setBoardingStatus] = useState<BoardingStatus | null>(null);

  const [showToast, setShowToast] = useState(false);

  const [toastMessage, setToastMessage] = useState('');

  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');

  const [torchEnabled, setTorchEnabled] = useState(false);

  

  // MODIFICATION 1: États pour le boarding confirmation

  const [boardingConfirmation, setBoardingConfirmation] = useState<BoardingConfirmation | null>(null);

  const [recentBoardings, setRecentBoardings] = useState<BoardingConfirmation[]>([]);



  const handleBarCodeScanned = async ({ data }: { data: string }) => {

    if (scanned || processing) return;



    // Jouer le son de scan automatique

    await playScanSound();

    

    setScanned(true);

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

        console.log('[BoardingScreen] 🔍 Parsing boarding pass - Longueur données:', data.length);

        console.log('[BoardingScreen] 📋 Données brutes (premiers 200 chars):', data.substring(0, 200));

        

        parsedData = parserService.parse(data);

        flightNumber = parsedData.flightNumber || '';

        departure = parsedData.departure || '';

        arrival = parsedData.arrival || '';

        

        console.log('[BoardingScreen] ✅ Parsing terminé:', {

          flightNumber,

          departure,

          arrival,

          format: parsedData.format,

        });

        

        if (!flightNumber || flightNumber === 'UNKNOWN') {

          console.error('[BoardingScreen] ❌ Numéro de vol non trouvé ou UNKNOWN');

          console.error('[BoardingScreen] Données complètes (premiers 500 chars):', data.substring(0, 500));

        }

      } catch (parseError) {

        console.error('[BoardingScreen] ❌ Erreur lors du parsing:', parseError);

        console.error('[BoardingScreen] Données brutes (premiers 500 chars):', data.substring(0, 500));

        // Parsing error - continue

      }



      // ✅ ÉTAPE 2: Vérifier si le numéro de vol a été extrait

      if (!flightNumber || flightNumber === 'UNKNOWN') {

        await playErrorSound();

        setProcessing(false);

        setScanned(false);

        

        setToastMessage('❌ Erreur de scan: Impossible d\'extraire le numéro de vol du boarding pass. Veuillez réessayer.');

        setToastType('error');

        setShowToast(true);

        resetScanner();

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

        setToastMessage(`❌ Vol non autorisé !\n${validation.reason || 'Le vol n\'est pas programmé pour aujourd\'hui.'}`);

        setToastType('error');

        setShowToast(true);

        resetScanner();

        return;

      }



      // ✅ ÉTAPE 4: Vérifier que l'aéroport correspond

      if (departure && arrival && departure !== user.airportCode && arrival !== user.airportCode) {

        await playErrorSound();

        setToastMessage(`❌ Ce vol ne concerne pas votre aéroport (${user.airportCode})\nRoute: ${departure} → ${arrival}`);

        setToastType('error');

        setShowToast(true);

        resetScanner();

        return;

      }



      // ✅ ÉTAPE 5: Chercher dans raw_scans par raw_data

      const { rawScanService } = await import('../services');

      const existingScan = await rawScanService.findByRawData(data);

      

      // Vérifier que le scan existe (check-in effectué)

      if (!existingScan || !existingScan.statusCheckin) {

        await playErrorSound();

        const errorMsg = getScanErrorMessage(user.role as any, 'boarding', 'not_checked_in');

        setToastMessage(errorMsg.message);

        setToastType(errorMsg.type);

        setShowToast(true);

        resetScanner();

        return;

      }



      // Vérifier si déjà embarqué

      if (existingScan.statusBoarding) {

        await playErrorSound();

        setToastMessage('⚠️ Passager déjà embarqué !');

        setToastType('warning');

        setShowToast(true);

        setProcessing(false);

        setScanned(false);

        setShowScanner(true);

        return;

      }



      // ✅ ÉTAPE 5: Mettre à jour le statut boarding dans raw_scans

      const result = await rawScanService.createOrUpdateRawScan({

        rawData: data,

        scanType: 'boarding_pass',

        statusField: 'boarding',

        userId: user.id,

        airportCode: user.airportCode,

      });



      // Enregistrer l'action d'audit

      const { logAudit } = await import('../utils/audit.util');

      await logAudit(

        'BOARD_PASSENGER',

        'boarding',

        `Embarquement confirmé - Vol: ${flightNumber || 'N/A'} - Scan #${result.scanCount}`,

        result.id

      );



      // Créer un objet Passenger pour l'affichage (avec les données parsées si disponibles)

      const displayPassenger: Passenger = {

        id: existingScan.id,

        pnr: parsedData?.pnr || 'En attente parsing web',

        fullName: parsedData?.fullName || 'Passager embarqué',

        firstName: parsedData?.firstName || '',

        lastName: parsedData?.lastName || '',

        flightNumber: flightNumber || 'Voir dashboard',

        route: departure && arrival ? `${departure}-${arrival}` : `${user.airportCode}-...`,

        departure: departure || user.airportCode,

        arrival: arrival || 'En attente',

        baggageCount: 0,

        checkedInAt: (existingScan.checkinAt || new Date().toISOString()) as string,

        checkedInBy: (existingScan.checkinBy || user.id) as string,

        createdAt: new Date().toISOString(),

        updatedAt: new Date().toISOString(),

        synced: false,

      };



      // Créer un statut boarding simplifié

      const boardingStatusData: BoardingStatus = {

        id: result.id,

        passengerId: existingScan.id,

        boarded: true,

        boardedAt: new Date().toISOString(),

        boardedBy: user.id,

        synced: false,

        createdAt: new Date().toISOString(),

      };



      // Stocker pour affichage

      setLastPassenger(displayPassenger);

      setBoardingStatus(boardingStatusData);

      

      // Jouer le son de succès

      await playSuccessSound();

      

      const successMessage = `✅ Embarquement confirmé ! (Vol: ${flightNumber || 'N/A'})`;

      

      setToastMessage(successMessage);

      setToastType('success');

      setShowToast(true);

      

      // 🚀 SYNCHRONISER AVEC LE SERVEUR (asynchrone, ne pas bloquer)

      await syncBoardingToServer(data, displayPassenger, boardingStatusData, user);

      

      // Masquer le scanner et afficher le résultat en plein écran

      setProcessing(false);

      setShowScanner(false);

    } catch (error) {

      console.error('Error processing boarding:', error);

      await playErrorSound();

      const user = await authServiceInstance.getCurrentUser();

      const errorMsg = getScanErrorMessage(user?.role as any || 'boarding', 'boarding', 'unknown');

      setToastMessage(error instanceof Error ? error.message : errorMsg.message);

      setToastType('error');

      setShowToast(true);

      setProcessing(false);

      setScanned(false);

      setShowScanner(true);

    } finally {

      setProcessing(false);

    }

  };



  const resetScanner = () => {

    // Réinitialiser tous les états pour permettre un nouveau scan

    setScanned(false);

    setProcessing(false);

    setShowScanner(true);

    setLastPassenger(null);

    setBoardingStatus(null);

  };



  /**

   * Synchronise l'embarquement avec le serveur en utilisant un checksum du boarding pass

   * Au lieu d'envoyer le rawData (gros fichier), on envoie un checksum simple

   */

  const syncBoardingToServer = async (

    rawData: string,

    passengerData: Passenger,

    boardingStatusData: BoardingStatus,

    user: any

  ) => {

    try {

      const AsyncStorage = require('@react-native-async-storage/async-storage').default;



      setImmediate(async () => {

        try {

          const apiKey = await AsyncStorage.getItem('@bfs:api_key');

          const apiUrl = await AsyncStorage.getItem('@bfs:api_url') || 'https://api.brsats.com';



          // Créer un AbortController pour le timeout (10s)

          const controller1 = new AbortController();

          const timeout1 = setTimeout(() => controller1.abort(), 10000);



          // ÉTAPE 1: Chercher le passager par PNR (doit déjà exister du check-in)

          console.log('[Boarding] 1️⃣  Looking for passenger by PNR:', passengerData.pnr);

          const checkResponse = await fetch(

            `${apiUrl}/api/v1/passengers?pnr=${encodeURIComponent(passengerData.pnr)}&airport=${encodeURIComponent(user.airportCode)}`,

            {

              method: 'GET',

              headers: {

                'x-api-key': apiKey || '',

                'x-airport-code': user.airportCode || '',

              },

              signal: controller1.signal,

            }

          );

          clearTimeout(timeout1);



          if (!checkResponse.ok) {

            const errorText = await checkResponse.text();

            console.warn('⚠️  Failed to search for passenger -', checkResponse.status, ':', errorText);

            return;

          }



          const checkData = await checkResponse.json();

          console.log('[Boarding] API Response:', JSON.stringify(checkData));

          

          if (!checkData.data || checkData.data.length === 0) {

            console.warn('⚠️  Passenger not found - must be checked in first!', 'Response:', checkData);

            return;

          }



          const serverPassengerId = checkData.data[0].id;

          console.log('[Boarding] ✅ Passenger found, ID:', serverPassengerId);



          // ÉTAPE 2: Synchroniser JUSTE le statut d'embarquement

          console.log('[Boarding] 2️⃣  Syncing boarding status...');

          const boardingUpdate = {

            passenger_id: serverPassengerId,

            boarded_at: new Date().toISOString(),

            boarded_by: user.id,

          };



          // Timeout 10s pour le sync

          const controller2 = new AbortController();

          const timeout2 = setTimeout(() => controller2.abort(), 10000);



          const response = await fetch(`${apiUrl}/api/v1/boarding/sync-hash`, {

            method: 'POST',

            headers: {

              'Content-Type': 'application/json',

              'x-api-key': apiKey || '',

            },

            body: JSON.stringify(boardingUpdate),

            signal: controller2.signal,

          });

          clearTimeout(timeout2);



          if (response.ok) {

            console.log('✅ Embarquement synchronisé au serveur');

          } else {

            console.warn('⚠️  Erreur lors de la synchronisation:', response.status);

            const errorText = await response.text();

            console.warn('Détails:', errorText);

          }

        } catch (error) {

          console.warn('⚠️  Erreur réseau lors de la sync:', error);

        }

      });

    } catch (error) {

      console.error('Erreur sync boarding:', error);

    }

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

      



      {processing ? (

        <View style={styles.processingContainer}>

          <ActivityIndicator size="large" color={colors.primary.main} />

          <Text style={[styles.processingText, { color: colors.text.secondary }]}>Validation en cours...</Text>

        </View>

      ) : !showScanner && lastPassenger ? (

        <ScrollView 

          style={styles.successContainer}

          contentContainerStyle={styles.successContentContainer}

          showsVerticalScrollIndicator={true}>

          

          <Card style={styles.successCard}>

            <View style={styles.successHeader}>

              <Ionicons name="checkmark-circle" size={48} color={colors.success.main} />

              <Text style={[styles.successTitle, { color: colors.text.primary }]}>Passager embarqué</Text>

            </View>

            <View style={styles.successInfo}>

              <View style={[styles.resultContainer, { backgroundColor: colors.background.paper, borderColor: colors.border.light }]}>

                {/* Section: Informations Passager */}

                <View style={styles.sectionHeader}>

                  <Ionicons name="person" size={20} color={colors.primary.main} />

                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations Passager</Text>

                </View>

                

                <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>

                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Nom complet:</Text>

                  <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.bold }]}>

                    {lastPassenger.fullName}

                  </Text>

                </View>



                {lastPassenger.pnr && (

                  <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>

                    <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>PNR:</Text>

                    <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace', letterSpacing: 2 }]}>

                      {lastPassenger.pnr}

                    </Text>

                  </View>

                )}



                {/* Section: Informations Vol */}

                {(lastPassenger.flightNumber || lastPassenger.departure || lastPassenger.arrival) && (

                  <>

                    <View style={[styles.sectionHeader, { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.border.light }]}>

                      <Ionicons name="airplane" size={20} color={colors.primary.main} />

                      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Informations Vol</Text>

                    </View>



                    {lastPassenger.flightNumber && (

                      <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>

                        <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Numéro de vol:</Text>

                        <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.semibold }]}>

                          {lastPassenger.flightNumber}

                        </Text>

                      </View>

                    )}



                    {lastPassenger.departure && lastPassenger.arrival && (

                      <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>

                        <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Route:</Text>

                        <View style={styles.routeContainer}>

                          <Badge label={lastPassenger.departure} variant="info" />

                          <Ionicons name="arrow-forward" size={16} color={colors.text.secondary} style={{ marginHorizontal: Spacing.xs }} />

                          <Badge label={lastPassenger.arrival} variant="info" />

                        </View>

                      </View>

                    )}

                  </>

                )}



                {/* Section: Statut Embarquement */}

                <View style={[styles.sectionHeader, { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.border.light }]}>

                  <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />

                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Statut Embarquement</Text>

                </View>

                <View style={styles.resultRow}>

                  <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Statut:</Text>

                  <Badge 

                    label={boardingStatus?.boarded ? "Embarqué" : "En attente"} 

                    variant={boardingStatus?.boarded ? "success" : "warning"} 

                  />

                </View>

              </View>

            </View>

            <TouchableOpacity

              style={[styles.scanAgainButton, { backgroundColor: colors.primary.main }]}

              onPress={resetScanner}

              activeOpacity={0.8}>

              <Ionicons name="barcode-outline" size={24} color={colors.primary.contrast} />

              <Text style={[styles.scanAgainButtonText, { color: colors.primary.contrast }]}>

                Nouveau scan

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
            if (scanned || processing || !showScanner || lastPassenger) return;
            // IMPORTANT: Ignorer les scans trop courts (< 40 chars)
            if (event.data.length < 40) {
              console.log('[BoardingScreen] Scan ignoré - données trop courtes:', event.data.length);
              return;
            }
            handleBarCodeScanned({ data: event.data });
          }}
          barcodeScannerSettings={{
            // Accepter tous les formats pour trouver le bon code-barres
            barcodeTypes: ['pdf417', 'qr', 'aztec', 'datamatrix', 'code128', 'code39'],
          }}

          onCameraReady={() => {}}

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

                Scannez le boarding pass pour valider l&apos;embarquement

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

  successContainer: {

    flex: 1,

  },

  successContentContainer: {

    flexGrow: 1,

    justifyContent: 'center',

    alignItems: 'center',

    padding: Spacing.lg,

  },

  successCard: {

    width: '100%',

    maxWidth: 400,

    padding: Spacing.xl,

  },

  successHeader: {

    alignItems: 'center',

    marginBottom: Spacing.lg,

  },

  successTitle: {

    fontSize: FontSizes.xl,

    fontWeight: FontWeights.bold,

    marginTop: Spacing.md,

  },

  successInfo: {

    marginBottom: Spacing.xl,

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

  },

  resultValue: {

    fontSize: FontSizes.lg,

    flex: 1,

    textAlign: 'right',

    marginLeft: Spacing.md,

    letterSpacing: 0.5,

  },

  scanAgainButton: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: Spacing.md + 4,

    paddingHorizontal: Spacing.xl,

    borderRadius: BorderRadius.lg,

    marginTop: Spacing.md,

    gap: Spacing.sm,

  },

  scanAgainButtonText: {

    fontSize: FontSizes.md,

    fontWeight: FontWeights.semibold,

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



