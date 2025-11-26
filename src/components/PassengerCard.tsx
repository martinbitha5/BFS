import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Passenger } from '../types/passenger.types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../theme';
import Card from './Card';
import Badge from './Badge';

interface PassengerCardProps {
  passenger: Passenger;
  onPress?: () => void;
  showDetails?: boolean;
}

export default function PassengerCard({ passenger, onPress, showDetails = true }: PassengerCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const Content = (
    <Card style={styles.card} elevated={!!onPress}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {passenger.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2)}
            </Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{passenger.fullName}</Text>
            <Text style={styles.pnr}>PNR: {passenger.pnr}</Text>
          </View>
        </View>
        {passenger.baggageCount > 0 && (
          <Badge label={`${passenger.baggageCount} bagage${passenger.baggageCount > 1 ? 's' : ''}`} variant="info" />
        )}
      </View>

      {showDetails && (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Vol</Text>
              <Text style={styles.detailValue}>{passenger.flightNumber}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Route</Text>
              <Text style={styles.detailValue}>{passenger.route}</Text>
            </View>
          </View>

          {passenger.flightTime && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Heure</Text>
                <Text style={styles.detailValue}>{passenger.flightTime}</Text>
              </View>
              {passenger.seatNumber && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Siège</Text>
                  <Text style={styles.detailValue}>{passenger.seatNumber}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.dateText}>
              Enregistré le {formatDate(passenger.checkedInAt)}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {Content}
      </TouchableOpacity>
    );
  }

  return Content;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.primary.contrast,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    letterSpacing: -0.2,
  },
  pnr: {
    fontSize: FontSizes.sm,
    color: Colors.text.secondary,
    fontWeight: FontWeights.medium,
    letterSpacing: 0.2,
  },
  details: {
    marginTop: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs / 2,
    fontWeight: FontWeights.medium,
  },
  detailValue: {
    fontSize: FontSizes.md,
    color: Colors.text.primary,
    fontWeight: FontWeights.semibold,
    letterSpacing: 0.1,
  },
  footer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  dateText: {
    fontSize: FontSizes.xs,
    color: Colors.text.secondary,
  },
});

