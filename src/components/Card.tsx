import React, { memo, useMemo } from 'react';
import { Platform, View, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, Spacing } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  variant?: 'default' | 'outlined';
}

// ✅ Mémorisé avec React.memo pour éviter les re-renders inutiles
const Card = memo(function Card({ children, style, elevated = true, variant = 'default' }: CardProps) {
  const { colors } = useTheme();
  
  // ✅ Mémoiser les styles pour éviter de recréer des objets à chaque render
  const cardStyle = useMemo(() => [
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
  ], [colors.background.paper, colors.border.light, variant, elevated, style]);
  
  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
});

export default Card;
