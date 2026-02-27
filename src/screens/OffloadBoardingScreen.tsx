import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Toast } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { authServiceInstance } from '../services';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { playErrorSound, playSuccessSound } from '../utils/sound.util';

type Props = NativeStackScreenProps<RootStackParamList, 'OffloadBoarding'>;

export default function OffloadBoardingScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [pnr, setPnr] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const handleOffload = async () => {
    const pnrClean = pnr.trim().toUpperCase();
    if (!pnrClean || pnrClean.length < 5) {
      await playErrorSound();
      setToastMessage('Veuillez saisir un PNR valide (6-7 caractères)');
      setToastType('error');
      setShowToast(true);
      return;
    }
    setProcessing(true);
    try {
      const user = await authServiceInstance.getCurrentUser();
      if (!user) {
        await playErrorSound();
        setToastMessage('Utilisateur non connecté');
        setToastType('error');
        setShowToast(true);
        return;
      }
      const apiKey = await AsyncStorage.getItem('@bfs:api_key');
      const apiUrl = await AsyncStorage.getItem('@bfs:api_url') || 'https://api.brsats.com';
      const response = await fetch(`${apiUrl}/api/v1/boarding/offload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
          'x-airport-code': user.airportCode || '',
        },
        body: JSON.stringify({ pnr: pnrClean }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await playSuccessSound();
        setPnr('');
        setToastMessage('✅ Passager débarqué avec succès');
        setToastType('success');
        setShowToast(true);
      } else {
        await playErrorSound();
        setToastMessage(data.error || 'Erreur lors du débarquement');
        setToastType('error');
        setShowToast(true);
      }
    } catch (error) {
      await playErrorSound();
      setToastMessage('Erreur réseau. Vérifiez votre connexion.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.default }]}>
      <Toast message={toastMessage} type={toastType} visible={showToast} onHide={() => setShowToast(false)} />
      <View style={styles.pdaScanContent}>
        <View style={[styles.pdaIconContainer, { backgroundColor: colors.warning.light }]}>
          <Ionicons name="log-out-outline" size={80} color={colors.warning.main} />
        </View>
        <Text style={[styles.pdaScanTitle, { color: colors.text.primary }]}>Débarquement passager</Text>
        <Text style={[styles.pdaScanSubtitle, { color: colors.text.secondary }]}>
          Saisissez le PNR du passager qui n'embarque pas
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background.paper, borderColor: colors.border.light, color: colors.text.primary }]}
          placeholder="PNR (ex: ABC123)"
          placeholderTextColor={colors.text.tertiary}
          value={pnr}
          onChangeText={setPnr}
          autoCapitalize="characters"
          maxLength={7}
          editable={!processing}
        />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.warning.main }]}
          onPress={handleOffload}
          disabled={processing || !pnr.trim()}
          activeOpacity={0.8}>
          {processing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.buttonText}>Débarquer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  input: {
    width: '100%',
    maxWidth: 300,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.lg,
    fontFamily: 'monospace',
    letterSpacing: 2,
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
