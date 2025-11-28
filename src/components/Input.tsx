import React from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Input({ label, error, leftIcon, rightIcon, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            error && styles.inputError,
            style,
          ]}
          placeholderTextColor={Colors.text.hint}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSizes.md,
    backgroundColor: Colors.background.paper,
    color: Colors.text.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputWithLeftIcon: {
    paddingLeft: 40,
  },
  inputWithRightIcon: {
    paddingRight: 40,
  },
  inputError: {
    borderColor: Colors.error.main,
    backgroundColor: Colors.error.light + '10',
  },
  leftIcon: {
    position: 'absolute',
    left: Spacing.md,
    zIndex: 1,
  },
  rightIcon: {
    position: 'absolute',
    right: Spacing.md,
    zIndex: 1,
  },
  errorText: {
    color: Colors.error.main,
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
    fontWeight: FontWeights.medium,
  },
});

