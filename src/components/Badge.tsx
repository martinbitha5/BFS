import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  size?: 'sm' | 'md';
}

// ✅ Mémorisé avec React.memo pour éviter les re-renders inutiles
const Badge = memo(function Badge({ label, variant = 'primary', size = 'md' }: BadgeProps) {
  const { colors } = useTheme();
  
  // ✅ Mémoiser les styles calculés
  const variantStyle = useMemo(() => {
    const variantColors = colors[variant];
    return {
      backgroundColor: variantColors.light + '15',
    };
  }, [colors, variant]);

  const variantTextStyle = useMemo(() => {
    const variantColors = colors[variant];
    return {
      color: variantColors.dark,
    };
  }, [colors, variant]);

  return (
    <View style={[styles.badge, styles[size], variantStyle]}>
      <Text style={[styles.text, styles[`${size}Text`], variantTextStyle]}>
        {label}
      </Text>
    </View>
  );
});

export default Badge;

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  md: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  text: {
    fontWeight: FontWeights.semibold,
  },
  smText: {
    fontSize: FontSizes.xs,
  },
  mdText: {
    fontSize: FontSizes.sm,
  },
});

