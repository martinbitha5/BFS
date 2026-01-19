/**
 * Composant: Affichage de Confirmation d'Embarquement
 * Réutilisable pour afficher les détails après scan réussi
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { BoardingConfirmation } from '../types/boarding-new.types';
import Card from './Card';

interface BoardingConfirmationCardProps {
  confirmation: BoardingConfirmation;
  onRetrySync: () => void;
}

export default function BoardingConfirmationCard({
  confirmation,
  onRetrySync,
}: BoardingConfirmationCardProps) {
  const { colors } = useTheme();

  const getSyncStatusColor = () => {
    switch (confirmation.syncStatus) {
      case 'synced':
        return colors.success.main;
      case 'failed':
        return colors.error.main;
      case 'pending':
      default:
        return colors.warning.main;
    }
  };

  const getSyncStatusIcon = () => {
    switch (confirmation.syncStatus) {
      case 'synced':
        return 'cloud-done';
      case 'failed':
        return 'cloud-offline';
      case 'pending':
      default:
        return 'cloud-upload';
    }
  };

  const getSyncStatusLabel = () => {
    switch (confirmation.syncStatus) {
      case 'synced':
        return 'Synchronisé';
      case 'failed':
        return 'Erreur sync';
      case 'pending':
      default:
        return 'Synchronisation...';
    }
  };

  return (
    <Card style={{
      ...styles.container,
      backgroundColor: colors.background.paper,
      borderTopColor: colors.success.main,
    }}>
      {/* En-tête avec icône de succès */}
      <View style={styles.header}>
        <View style={[
          styles.successIcon,
          { backgroundColor: colors.success.light }
        ]}>
          <Ionicons
            name="checkmark-circle"
            size={48}
            color={colors.success.main}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Embarquement Confirmé
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            {new Date(confirmation.boardedAt).toLocaleTimeString('fr-FR')}
          </Text>
        </View>
      </View>

      {/* Détails du passager */}
      <View style={[styles.detailsContainer, { borderColor: colors.border.light }]}>
        <DetailRow
          label="Passager"
          value={confirmation.passagerName}
          icon="person"
          colors={colors}
        />
        <Divider color={colors.border.light} />

        <DetailRow
          label="Vol"
          value={confirmation.flightNumber}
          icon="airplane"
          colors={colors}
          accent
        />

        {confirmation.seatNumber && (
          <>
            <Divider color={colors.border.light} />
            <DetailRow
              label="Siège"
              value={confirmation.seatNumber}
              icon="chair"
              colors={colors}
            />
          </>
        )}

        {confirmation.gate && (
          <>
            <Divider color={colors.border.light} />
            <DetailRow
              label="Porte"
              value={confirmation.gate}
              icon="door-open"
              colors={colors}
            />
          </>
        )}

        {confirmation.pnr && (
          <>
            <Divider color={colors.border.light} />
            <DetailRow
              label="PNR"
              value={confirmation.pnr}
              icon="document"
              colors={colors}
            />
          </>
        )}
      </View>

      {/* Statut de synchronisation */}
      <View style={[
        styles.syncStatus,
        {
          backgroundColor: colors.background.default,
          borderColor: getSyncStatusColor(),
        }
      ]}>
        <Ionicons
          name={getSyncStatusIcon()}
          size={20}
          color={getSyncStatusColor()}
        />
        <Text style={[
          styles.syncStatusText,
          { color: getSyncStatusColor() }
        ]}>
          {getSyncStatusLabel()}
        </Text>
      </View>

      {/* Boutons d'action */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary.main }
          ]}
          onPress={onRetrySync}
          activeOpacity={0.8}
        >
          <Ionicons name="scan" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Retry Sync</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

/**
 * Composant pour afficher une ligne de détail
 */
interface DetailRowProps {
  label: string;
  value: string;
  icon: string;
  colors: any;
  accent?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon, colors, accent }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailLeft}>
      <Ionicons
        name={icon as any}
        size={20}
        color={accent ? colors.primary.main : colors.text.secondary}
      />
      <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>
        {label}
      </Text>
    </View>
    <Text style={[
      styles.detailValue,
      {
        color: accent ? colors.primary.main : colors.text.primary,
        fontWeight: accent ? FontWeights.bold : FontWeights.semibold,
      }
    ]}>
      {value}
    </Text>
  </View>
);

/**
 * Composant pour les séparateurs
 */
interface DividerProps {
  color: string;
}

const Divider: React.FC<DividerProps> = ({ color }) => (
  <View style={[styles.divider, { backgroundColor: color }]} />
);

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 4,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  detailsContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginVertical: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  detailLabel: {
    fontSize: FontSizes.sm,
  },
  detailValue: {
    fontSize: FontSizes.md,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  syncStatusText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  actions: {
    flexDirection: 'column',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
});
