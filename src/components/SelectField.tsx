import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../theme';
import SelectModal from './SelectModal';

interface Option {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label: string;
  placeholder: string;
  options: Option[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  error?: string;
  required?: boolean;
}

export default function SelectField({
  label,
  placeholder,
  options,
  selectedValue,
  onSelect,
  error,
  required = false,
}: SelectFieldProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.select, error && styles.selectError]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}>
        <Text
          style={[
            styles.selectText,
            !selectedValue && styles.placeholderText,
          ]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>▼</Text>
        </View>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <SelectModal
        visible={modalVisible}
        title={label}
        options={options}
        selectedValue={selectedValue}
        onSelect={onSelect}
        onClose={() => setModalVisible(false)}
      />
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
  required: {
    color: Colors.error.main,
  },
  select: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border.main,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background.paper,
    minHeight: 50,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  selectError: {
    borderColor: Colors.error.main,
    backgroundColor: '#fff5f5',
  },
  selectText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text.primary,
  },
  placeholderText: {
    color: Colors.text.hint,
  },
  arrowContainer: {
    marginLeft: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: FontSizes.sm,
    color: Colors.text.secondary,
  },
  errorText: {
    color: Colors.error.main,
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
    fontWeight: FontWeights.medium,
  },
});

