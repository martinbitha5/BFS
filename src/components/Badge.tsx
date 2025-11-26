import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BorderRadius, FontSizes, FontWeights, Spacing } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  size?: 'sm' | 'md';
}

export default function Badge({ label, variant = 'primary', size = 'md' }: BadgeProps) {
  const { colors } = useTheme();
  
  const getVariantStyle = () => {
    const variantColors = colors[variant];
    return {
      backgroundColor: variantColors.light + '15',
    };
  };

  const getVariantTextStyle = () => {
    const variantColors = colors[variant];
    return {
      color: variantColors.dark,
    };
  };

  return (
    <View style={[styles.badge, styles[size], getVariantStyle()]}>
      <Text style={[styles.text, styles[`${size}Text`], getVariantTextStyle()]}>
        {label}
      </Text>
    </View>
  );
}

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

