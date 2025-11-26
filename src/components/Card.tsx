import React from 'react';
import { Platform, View, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, Spacing } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  variant?: 'default' | 'outlined';
}

export default function Card({ children, style, elevated = true, variant = 'default' }: CardProps) {
  const { colors } = useTheme();
  
  return (
    <View
      style={[
        {
          backgroundColor: colors.background.paper,
          borderRadius: BorderRadius.xl,
          padding: Spacing.lg,
        },
        variant === 'outlined' && {
          borderWidth: 1,
          borderColor: colors.border.light,
        },
        Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: variant === 'outlined' ? 0 : (elevated ? 2 : 1) },
            shadowOpacity: variant === 'outlined' ? 0 : (elevated ? 0.08 : 0.05),
            shadowRadius: elevated ? 8 : 4,
          },
          android: {
            elevation: variant === 'outlined' ? 0 : (elevated ? 4 : 2),
          },
        }),
        style,
      ]}>
      {children}
    </View>
  );
}

