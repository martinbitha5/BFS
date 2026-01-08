import { useColorScheme } from 'react-native';

interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  buttonText: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  disabled: string;
  textDisabled: string;
  inputBackground: string;
}

const lightColors: ThemeColors = {
  primary: '#0066CC',
  secondary: '#6B7280',
  background: '#F3F4F6',
  cardBackground: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#4B5563',
  textTertiary: '#9CA3AF',
  buttonText: '#FFFFFF',
  border: '#E5E7EB',
  error: '#DC2626',
  success: '#059669',
  warning: '#D97706',
  info: '#2563EB',
  disabled: '#D1D5DB',
  textDisabled: '#9CA3AF',
  inputBackground: '#FFFFFF',
};

const darkColors: ThemeColors = {
  primary: '#60A5FA',
  secondary: '#9CA3AF',
  background: '#111827',
  cardBackground: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#6B7280',
  buttonText: '#FFFFFF',
  border: '#374151',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  disabled: '#4B5563',
  textDisabled: '#6B7280',
  inputBackground: '#374151',
};

export function useTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
  };
}
