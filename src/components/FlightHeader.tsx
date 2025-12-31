/**
 * Composant pour afficher le vol sélectionné
 * Affiché en haut des écrans Baggage, Boarding, Arrival
 */

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFlightContext } from '../contexts/FlightContext';
import { useTheme } from '../contexts/ThemeContext';
import { FontSizes, FontWeights, Spacing } from '../theme';
import Card from './Card';

interface FlightHeaderProps {
  showChangeButton?: boolean;
}

export default function FlightHeader({ showChangeButton = true }: FlightHeaderProps) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { currentFlight, clearCurrentFlight } = useFlightContext();

  if (!currentFlight) {
    return null;
  }

  const handleChangeFlight = async () => {
    await clearCurrentFlight();
    navigation.goBack();
  };

  return (
    <Card style={styles.container}>
      <View style={styles.content}>
        <View style={styles.flightInfo}>
          <View style={styles.iconContainer}>
            <Ionicons name="airplane" size={24} color={colors.primary.main} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.flightNumber, { color: colors.text.primary }]}>
              {currentFlight.flightNumber}
            </Text>
            <Text style={[styles.airline, { color: colors.text.secondary }]}>
              {currentFlight.airline || currentFlight.airlineCode}
            </Text>
            <View style={styles.route}>
              <Text style={[styles.airport, { color: colors.text.primary }]}>
                {currentFlight.departure}
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.text.secondary} />
              <Text style={[styles.airport, { color: colors.text.primary }]}>
                {currentFlight.arrival}
              </Text>
            </View>
          </View>
        </View>
        
        {showChangeButton && (
          <TouchableOpacity
            style={[styles.changeButton, { backgroundColor: colors.error.light + '20' }]}
            onPress={handleChangeFlight}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-horizontal" size={20} color={colors.error.main} />
            <Text style={[styles.changeText, { color: colors.error.main }]}>
              Changer
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  flightNumber: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: 2,
  },
  airline: {
    fontSize: FontSizes.sm,
    marginBottom: 4,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  airport: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.xs,
  },
  changeText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
});
