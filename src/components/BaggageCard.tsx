import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Baggage } from '../types/baggage.types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../theme';
import Card from './Card';
import Badge from './Badge';

interface BaggageCardProps {
  baggage: Baggage;
  showPassengerInfo?: boolean;
  passengerName?: string;
  onPress?: () => void;
}

export default function BaggageCard({ baggage, showPassengerInfo, passengerName, onPress }: BaggageCardProps) {
  const getStatusColor = (status: string): 'success' | 'warning' | 'info' => {
    switch (status) {
      case 'arrived':
        return 'success';
      case 'checked':
        return 'info';
      default:
        return 'warning';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'arrived':
        return 'Arrivé';
      case 'checked':
        return 'En transit';
      default:
        return status;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
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
        <View style={styles.tagContainer}>
          <Text style={styles.tagLabel}>Tag RFID</Text>
          <Text style={styles.tagValue}>{baggage.rfidTag}</Text>
        </View>
        <Badge label={getStatusLabel(baggage.status)} variant={getStatusColor(baggage.status)} />
      </View>

      {showPassengerInfo && passengerName && (
        <View style={styles.passengerInfo}>
          <Text style={styles.passengerLabel}>Passager</Text>
          <Text style={styles.passengerName}>{passengerName}</Text>
        </View>
      )}

      <View style={styles.details}>
        {baggage.checkedAt && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Scanné le</Text>
            <Text style={styles.detailValue}>{formatDate(baggage.checkedAt)}</Text>
          </View>
        )}
        {baggage.arrivedAt && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Arrivé le</Text>
            <Text style={styles.detailValue}>{formatDate(baggage.arrivedAt)}</Text>
          </View>
        )}
        {baggage.expectedTag && baggage.expectedTag === baggage.rfidTag && (
          <View style={styles.expectedBadge}>
            <Text style={styles.expectedText}>✓ Tag attendu</Text>
          </View>
        )}
      </View>
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
  tagContainer: {
    flex: 1,
  },
  tagLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs / 2,
    fontWeight: FontWeights.medium,
  },
  tagValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text.primary,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  passengerInfo: {
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  passengerLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs / 2,
  },
  passengerName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text.primary,
    letterSpacing: -0.1,
  },
  details: {
    marginTop: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  detailLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text.secondary,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    color: Colors.text.primary,
    fontWeight: FontWeights.medium,
  },
  expectedBadge: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.success.light + '15',
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  expectedText: {
    fontSize: FontSizes.xs,
    color: Colors.success.dark,
    fontWeight: FontWeights.semibold,
  },
});

