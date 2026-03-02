import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Toast } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { apiService, authServiceInstance, flightService } from '../services';
import { cachedFetch, invalidateCache } from '../utils/cachedFetch';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { AvailableFlight } from '../types/flight.types';
import { playErrorSound, playSuccessSound } from '../utils/sound.util';

type Props = NativeStackScreenProps<RootStackParamList, 'ConfirmLoad'>;

export default function ConfirmLoadScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [flights, setFlights] = useState<AvailableFlight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<AvailableFlight | null>(null);
  const [loadingFlights, setLoadingFlights] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadFlights();
  }, []);

  const loadFlights = async () => {
    try {
      const user = await authServiceInstance.getCurrentUser();
      if (!user) return;

      const apiUrl = await AsyncStorage.getItem('@bfs:api_url');
      const apiKey = await AsyncStorage.getItem('@bfs:api_key');
      const headers: Record<string, string> = {
        'x-api-key': apiKey || '',
        'x-airport-code': user.airportCode || '',
      };
      if (user.airlineCode) headers['x-airline-code'] = user.airlineCode;

      setLoadingFlights(true);

      if (apiUrl && apiKey) {
        const url = `${apiUrl}/api/v1/baggage/flights-with-checked`;
        const res = await cachedFetch(url, { headers });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.length > 0) {
            setFlights(json.data);
            setLoadingFlights(false);
            return;
          }
        }
      }
      const availableFlights = await flightService.getAvailableFlights(user.airportCode, undefined, user.airlineCode);
      setFlights(availableFlights);
    } catch {
      setFlights([]);
    } finally {
      setLoadingFlights(false);
    }
  };

  const handleConfirmLoad = async () => {
    if (!selectedFlight) {
      await playErrorSound();
      setToastMessage('Sélectionnez un vol');
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

      const apiUrl = await AsyncStorage.getItem('@bfs:api_url');
      const apiKey = await AsyncStorage.getItem('@bfs:api_key');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
        'x-airport-code': user.airportCode || '',
      };
      if (user.airlineCode) headers['x-airline-code'] = user.airlineCode;
      const response = await fetch(`${apiUrl || 'https://api.brsats.com'}/api/v1/baggage/confirm-load`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ flight_number: selectedFlight.flightNumber }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        apiService.invalidateGetCache();
        invalidateCache();
        flightService.clearFlightsCache();
        await playSuccessSound();
        setToastMessage(
          data.loaded_count > 0
            ? `✅ ${data.loaded_count} bagage(s) confirmé(s) chargé(s)`
            : 'Aucun bagage checked à charger (rush exclus)'
        );
        setToastType('success');
        setShowToast(true);
      } else {
        await playErrorSound();
        setToastMessage(data.error || 'Erreur lors de la confirmation');
        setToastType('error');
        setShowToast(true);
      }
    } catch {
      await playErrorSound();
      setToastMessage('Erreur réseau');
      setToastType('error');
      setShowToast(true);
    } finally {
      setProcessing(false);
    }
  };

  if (loadingFlights) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.default }]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Chargement des vols...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.default }]}>
      <Toast message={toastMessage} type={toastType} visible={showToast} onHide={() => setShowToast(false)} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.iconContainer, { backgroundColor: colors.success.light + '30' }]}>
          <Ionicons name="airplane" size={80} color={colors.success.main} />
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>Confirmer le chargement</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          Sélectionnez le vol puis confirmez que les bagages sont chargés à bord
        </Text>

        <Text style={[styles.label, { color: colors.text.secondary }]}>Vol</Text>
        <View style={styles.flightList}>
          {flights.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
              Aucun vol disponible
            </Text>
          ) : (
            flights.map((flight) => (
              <TouchableOpacity
                key={flight.flightNumber}
                style={[
                  styles.flightItem,
                  {
                    backgroundColor: colors.background.paper,
                    borderColor:
                      selectedFlight?.flightNumber === flight.flightNumber
                        ? colors.primary.main
                        : colors.border.light,
                    borderWidth: selectedFlight?.flightNumber === flight.flightNumber ? 2 : 1,
                  },
                ]}
                onPress={() => setSelectedFlight(flight)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.flightNumber,
                    {
                      color:
                        selectedFlight?.flightNumber === flight.flightNumber
                          ? colors.primary.main
                          : colors.text.primary,
                      fontWeight:
                        selectedFlight?.flightNumber === flight.flightNumber
                          ? FontWeights.bold
                          : FontWeights.medium,
                    },
                  ]}>
                  {flight.flightNumber}
                </Text>
                <Text style={[styles.flightRoute, { color: colors.text.secondary }]}>
                  {flight.departure} → {flight.arrival}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: selectedFlight ? colors.success.main : colors.border.light,
              opacity: processing ? 0.7 : 1,
            },
          ]}
          onPress={handleConfirmLoad}
          disabled={!selectedFlight || processing}
          activeOpacity={0.8}>
          {processing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.buttonText}>Chargement</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSizes.md,
    marginTop: Spacing.md,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    color: '#666',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  label: {
    fontSize: FontSizes.sm,
    alignSelf: 'stretch',
    marginBottom: Spacing.sm,
  },
  flightList: {
    width: '100%',
    maxWidth: 320,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  flightItem: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  flightNumber: {
    fontSize: FontSizes.xl,
  },
  flightRoute: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    padding: Spacing.xl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    minWidth: 200,
  },
  buttonText: {
    color: '#fff',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
});
