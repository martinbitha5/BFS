import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Toast } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { authServiceInstance, databaseServiceInstance, rawScanService } from '../services';
import { birsDatabaseService } from '../services/birs-database.service';
import { parserService } from '../services/parser.service';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { Passenger } from '../types/passenger.types';
import { cachedFetch } from '../utils/cachedFetch';
import { logAudit } from '../utils/audit.util';
import { playErrorSound, playScanSound, playSuccessSound } from '../utils/sound.util';

type Props = NativeStackScreenProps<RootStackParamList, 'ManualBaggage'>;

export default function ManualBaggageScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [manualTag, setManualTag] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');

  const handleSubmit = async () => {
    Keyboard.dismiss();
    const data = manualTag.trim();
    if (!data || data.length < 4) {
      await playErrorSound();
      setToastMessage('Veuillez saisir un numéro de tag valide');
      setToastType('error');
      setShowToast(true);
      return;
    }
    setProcessing(true);
    await playScanSound();
    try {
      const user = await authServiceInstance.getCurrentUser();
      if (!user) {
        await playErrorSound();
        setToastMessage('Utilisateur non connecté');
        setToastType('error');
        setShowToast(true);
        setProcessing(false);
        return;
      }
      let baggageTagData: any;
      let tagNumber: string;
      try {
        baggageTagData = parserService.parseBaggageTag(data);
        tagNumber = baggageTagData.tagNumber?.trim() || data;
        if (!tagNumber || tagNumber === 'UNKNOWN') tagNumber = data;
      } catch {
        tagNumber = data;
        baggageTagData = { passengerName: 'UNKNOWN', tagNumber: data, pnr: 'UNKNOWN', rawData: data };
      }
      const existing = await databaseServiceInstance.getBaggageByTagNumber(tagNumber);
      if (existing) {
        await playErrorSound();
        setToastMessage(`⚠️ Bagage déjà enregistré: ${tagNumber}`);
        setToastType('warning');
        setShowToast(true);
        setProcessing(false);
        return;
      }
      const existingIntl = await birsDatabaseService.getInternationalBaggageByTagNumber(tagNumber);
      if (existingIntl) {
        await playErrorSound();
        setToastMessage(`⚠️ Bagage international déjà enregistré`);
        setToastType('warning');
        setShowToast(true);
        setProcessing(false);
        return;
      }
      let passenger: Passenger | null = null;
      try {
        const apiUrl = await AsyncStorage.getItem('@bfs:api_url');
        const apiKey = await AsyncStorage.getItem('@bfs:api_key');
        if (apiUrl && apiKey) {
          const tagBase = tagNumber.replace(/\D/g, '').substring(0, 10);
          let response = await cachedFetch(`${apiUrl}/api/v1/passengers/by-baggage-tag?tag=${tagBase}&airport=${user.airportCode}`, {
            headers: { 'x-api-key': apiKey || '', 'x-airport-code': user.airportCode || '', ...(user.airlineCode && { 'x-airline-code': user.airlineCode }), 'Content-Type': 'application/json' },
          });
          if (!response.ok && baggageTagData.pnr && baggageTagData.pnr !== 'UNKNOWN') {
            response = await cachedFetch(`${apiUrl}/api/v1/passengers/pnr/${baggageTagData.pnr}`, {
              headers: { 'x-api-key': apiKey || '', 'x-airport-code': user.airportCode || '', ...(user.airlineCode && { 'x-airline-code': user.airlineCode }), 'Content-Type': 'application/json' },
            });
          }
          if (response.ok) {
            const result = await response.json();
            if (result.data && result.data.full_name) {
              const fullName = result.data.full_name.trim();
              const nameParts = fullName.split(/\s+/);
              const passengerId = await databaseServiceInstance.createPassenger({
                pnr: result.data.pnr,
                fullName,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                flightNumber: result.data.flight_number,
                airline: result.data.airline || '',
                airlineCode: result.data.airline_code || '',
                departure: result.data.departure || user.airportCode,
                arrival: result.data.arrival || '',
                route: result.data.route || `${result.data.departure}-${result.data.arrival}`,
                baggageCount: result.data.baggage_count || 1,
                baggageBaseNumber: result.data.baggage_base_number,
                airportCode: user.airportCode,
                checkedInAt: result.data.checked_in_at || new Date().toISOString(),
                checkedInBy: result.data.checked_in_by || user.id,
                synced: true,
              });
              passenger = await databaseServiceInstance.getPassengerById(passengerId);
            }
          }
        }
      } catch (e) {
        console.error('[ManualBaggage] API error:', e);
      }
      if (!passenger) {
        passenger = await databaseServiceInstance.getPassengerByExpectedTag(tagNumber);
        if (!passenger && baggageTagData.pnr !== 'UNKNOWN') {
          passenger = await databaseServiceInstance.getPassengerByPnr(baggageTagData.pnr);
        }
        if (!passenger && baggageTagData.passengerName !== 'UNKNOWN') {
          passenger = await databaseServiceInstance.getPassengerByName(baggageTagData.passengerName);
        }
      }
      if (!passenger || !passenger.id) {
        await playErrorSound();
        Alert.alert('⚠️ TAG NON RECONNU', `Le tag ${tagNumber} n'appartient à aucun passager enregistré.`, [
          { text: 'Compris', onPress: () => setProcessing(false) },
        ]);
        return;
      }
      const existingBaggages = await databaseServiceInstance.getBaggagesByPassengerId(passenger.id);
      const expectedCount = passenger.baggageCount || 1;
      if (existingBaggages && existingBaggages.length >= expectedCount) {
        await playErrorSound();
        setToastMessage('Quota de bagages dépassé pour ce passager');
        setToastType('error');
        setShowToast(true);
        setProcessing(false);
        return;
      }
      await databaseServiceInstance.createBaggage({
        passengerId: passenger.id,
        tagNumber,
        status: 'checked',
        flightNumber: passenger.flightNumber,
        airportCode: user.airportCode,
        checkedAt: new Date().toISOString(),
        checkedBy: user.id,
        synced: false,
      });
      await rawScanService.createOrUpdateRawScan({
        rawData: data,
        scanType: 'baggage_tag',
        statusField: 'baggage',
        userId: user.id,
        airportCode: user.airportCode,
        baggageRfidTag: tagNumber,
      });
      await logAudit('REGISTER_BAGGAGE', 'baggage', `Saisie manuelle: ${tagNumber} - ${passenger.fullName}`, tagNumber);
      await playSuccessSound();
      setManualTag('');
      setToastMessage(`✅ Bagage enregistré ! ${passenger.fullName}`);
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      console.error('[ManualBaggage]', error);
      await playErrorSound();
      setToastMessage(error instanceof Error ? error.message : 'Erreur');
      setToastType('error');
      setShowToast(true);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background.default }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <Toast message={toastMessage} type={toastType} visible={showToast} onHide={() => setShowToast(false)} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.pdaScanContent}>
            <View style={[styles.pdaIconContainer, { backgroundColor: colors.primary.light }]}>
              <Ionicons name="create-outline" size={80} color={colors.primary.main} />
            </View>
            <Text style={[styles.pdaScanTitle, { color: colors.text.primary }]}>Saisie manuelle</Text>
            <Text style={[styles.pdaScanSubtitle, { color: colors.text.secondary }]}>
              Si le scan ne fonctionne pas (étiquette floue)
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background.paper, borderColor: colors.border.light, color: colors.text.primary }]}
              placeholder="Numéro du tag (ex: 4071 ET201605)"
              placeholderTextColor={colors.text.tertiary}
              value={manualTag}
              onChangeText={setManualTag}
              autoCapitalize="characters"
              editable={!processing}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary.main }]}
              onPress={handleSubmit}
              disabled={processing || !manualTag.trim()}
              activeOpacity={0.8}>
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: Spacing.xl },
  pdaScanContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
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
  input: {
    width: '100%',
    maxWidth: 300,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.lg,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginBottom: Spacing.lg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  buttonText: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
});
