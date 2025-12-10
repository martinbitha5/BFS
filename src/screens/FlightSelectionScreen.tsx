/**
 * Écran de sélection du vol
 * Affiché après le login pour les rôles: Baggage, Arrival
 * (Boarding n'a pas besoin de sélection de vol)
 */

import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components';
import { useFlightContext } from '../contexts/FlightContext';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/RootStack';
import { authServiceInstance, flightService } from '../services';
import { FontSizes, FontWeights, Spacing } from '../theme';
import { AvailableFlight } from '../types/flight.types';

type Props = NativeStackScreenProps<RootStackParamList, 'FlightSelection'>;

export default function FlightSelectionScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { setCurrentFlight } = useFlightContext();
  const [user, setUser] = useState<any>(null);
  const [flights, setFlights] = useState<AvailableFlight[]>([]);
  const [loading, setLoading] = useState(true);

  const targetScreen = route.params?.targetScreen || 'Baggage';

  useEffect(() => {
    loadUserAndFlights();
  }, []);

  const loadUserAndFlights = async () => {
    try {
      const currentUser = await authServiceInstance.getCurrentUser();
      if (!currentUser) {
        navigation.replace('Login');
        return;
      }
      setUser(currentUser);

      console.log('[FlightSelection] 🔍 Chargement des vols pour:', currentUser.airportCode);
      
      // Charger les vols disponibles
      const availableFlights = await flightService.getAvailableFlights(currentUser.airportCode);
      
      console.log('[FlightSelection] ✅ Vols chargés:', availableFlights.length);
      console.log('[FlightSelection] 📋 Détails:', JSON.stringify(availableFlights, null, 2));
      
      setFlights(availableFlights);
    } catch (error) {
      console.error('[FlightSelection] ❌ Erreur:', error);
      Alert.alert('Erreur', 'Impossible de charger les vols disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFlight = async (flight: AvailableFlight) => {
    if (!user) return;

    try {
      await setCurrentFlight({
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        airlineCode: flight.airlineCode,
        departure: flight.departure,
        arrival: flight.arrival,
        selectedAt: new Date().toISOString(),
        selectedBy: user.id,
      });

      // Naviguer vers l'écran cible
      navigation.replace(targetScreen as any);
    } catch (error) {
      console.error('[FlightSelection] Erreur sélection:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le vol');
    }
  };


  if (loading) {
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.lg }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="airplane" size={48} color={colors.primary.main} />
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Sélectionnez votre vol
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            {user?.fullName} • {user?.airportCode}
          </Text>
        </View>

        {/* Liste des vols disponibles */}
        {flights.length > 0 && (
          <Card style={styles.flightsCard}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Vols disponibles aujourd'hui
            </Text>
            {flights.map((flight, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.flightItem,
                  { borderBottomColor: colors.border.light },
                  index === flights.length - 1 && styles.lastFlightItem,
                ]}
                onPress={() => handleSelectFlight(flight)}
                activeOpacity={0.7}
              >
                <View style={styles.flightInfo}>
                  <View style={styles.flightHeader}>
                    <Text style={[styles.flightNumber, { color: colors.text.primary }]}>
                      {flight.flightNumber}
                    </Text>
                    <View
                      style={[
                        styles.sourceBadge,
                        {
                          backgroundColor:
                            flight.source === 'frequent'
                              ? colors.info.light
                              : colors.success.light,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sourceText,
                          {
                            color:
                              flight.source === 'frequent'
                                ? colors.info.main
                                : colors.success.main,
                          },
                        ]}
                      >
                        {flight.source === 'frequent' ? 'Fréquent' : 'Actif'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.airline, { color: colors.text.secondary }]}>
                    {flight.airline}
                  </Text>
                  <View style={styles.route}>
                    <Text style={[styles.routeText, { color: colors.text.primary }]}>
                      {flight.departure}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.text.secondary} />
                    <Text style={[styles.routeText, { color: colors.text.primary }]}>
                      {flight.arrival}
                    </Text>
                  </View>
                  {flight.passengerCount !== undefined && (
                    <Text style={[styles.stats, { color: colors.text.secondary }]}>
                      {flight.passengerCount} passagers • {flight.baggageCount || 0} bagages
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Message si aucun vol */}
        {flights.length === 0 && (
          <Card style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.text.secondary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              Aucun vol disponible
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              Les vols apparaîtront ici dès que des passagers seront enregistrés.
            </Text>
          </Card>
        )}
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
    padding: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSizes.md,
    marginTop: Spacing.xs,
  },
  flightsCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.md,
  },
  flightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  lastFlightItem: {
    borderBottomWidth: 0,
  },
  flightInfo: {
    flex: 1,
  },
  flightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  flightNumber: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginRight: Spacing.sm,
  },
  sourceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  airline: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  routeText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginHorizontal: Spacing.xs,
  },
  stats: {
    fontSize: FontSizes.sm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
});
