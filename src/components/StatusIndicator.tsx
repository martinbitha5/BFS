import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Spacing, BorderRadius, FontSizes } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface StatusIndicatorProps {
  online: boolean;
  syncing?: boolean;
  pendingSync?: number;
}

export default function StatusIndicator({ online, syncing, pendingSync = 0 }: StatusIndicatorProps) {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background.paper, borderColor: colors.border.light }]}>
      <View style={[styles.dot, { backgroundColor: online ? colors.success.main : colors.error.main }]} />
      <Text style={[styles.text, { color: colors.text.secondary }]}>
        {online ? 'En ligne' : 'Hors ligne'}
        {syncing && ' • Synchronisation...'}
        {pendingSync > 0 && !syncing && ` • ${pendingSync} en attente`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.round,
    marginRight: Spacing.sm,
  },
  text: {
    fontSize: FontSizes.xs,
  },
});

