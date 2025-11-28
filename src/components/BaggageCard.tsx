import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Baggage } from '../types/baggage.types';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import Card from './Card';
import Badge from './Badge';

interface BaggageCardProps {
  baggage: Baggage;
  showPassengerInfo?: boolean;
  passengerName?: string;
  onPress?: () => void;
}

export default function BaggageCard({ baggage, showPassengerInfo, passengerName, onPress }: BaggageCardProps) {
  const { colors } = useTheme();
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
          <Text style={[styles.tagLabel, { color: colors.text.secondary }]}>Tag RFID</Text>
          <Text style={[styles.tagValue, { color: colors.text.primary }]}>{baggage.rfidTag}</Text>
        </View>
        <Badge label={getStatusLabel(baggage.status)} variant={getStatusColor(baggage.status)} />
      </View>

      {showPassengerInfo && passengerName && (
        <View style={[styles.passengerInfo, { borderBottomColor: colors.border.light }]}>
          <Text style={[styles.passengerLabel, { color: colors.text.secondary }]}>Passager</Text>
          <Text style={[styles.passengerName, { color: colors.text.primary }]}>{passengerName}</Text>
        </View>
      )}

      <View style={styles.details}>
        {baggage.checkedAt && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Scanné le</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>{formatDate(baggage.checkedAt)}</Text>
          </View>
        )}
        {baggage.arrivedAt && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Arrivé le</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>{formatDate(baggage.arrivedAt)}</Text>
          </View>
        )}
        {baggage.expectedTag && baggage.expectedTag === baggage.rfidTag && (
          <View style={[styles.expectedBadge, { backgroundColor: colors.success.light + '15' }]}>
            <Text style={[styles.expectedText, { color: colors.success.dark }]}>✓ Tag attendu</Text>
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
    marginBottom: Spacing.xs / 2,
    fontWeight: FontWeights.medium,
  },
  tagValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  passengerInfo: {
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
  },
  passengerLabel: {
    fontSize: FontSizes.xs,
    marginBottom: Spacing.xs / 2,
  },
  passengerName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
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
  },
  detailValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  expectedBadge: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  expectedText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
});

