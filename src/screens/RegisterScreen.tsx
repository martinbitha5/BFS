import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AIRPORTS as AIRPORTS_DATA } from '../../constants/airports';
import Button from '../components/Button';
import Input from '../components/Input';
import SelectField from '../components/SelectField';
import { RootStackParamList } from '../navigation/RootStack';
import { authServiceInstance } from '../services';
import { Colors, Spacing } from '../theme';
import { UserRole } from '../types/user.types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Check-in', value: 'checkin' },
  { label: 'Bagages', value: 'baggage' },
  { label: 'Embarquement', value: 'boarding' },
  { label: 'Arrivée', value: 'arrival' },
];

// Convertir les aéroports au format SelectField
const AIRPORTS = AIRPORTS_DATA.map((airport) => ({
  label: `${airport.name} (${airport.code})`,
  value: airport.code,
}));

export default function RegisterScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [airportCode, setAirportCode] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Le nom complet est requis';
    }

    if (!email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email invalide';
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (!airportCode) {
      newErrors.airportCode = 'L\'aéroport est requis';
    }

    if (!role) {
      newErrors.role = 'Le rôle est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const session = await authServiceInstance.register(
        email.trim(),
        password,
        fullName.trim(),
        airportCode,
        role as UserRole
      );
      
      Alert.alert(
        'Inscription réussie',
        'Votre compte a été créé avec succès',
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('Login'),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Erreur d\'inscription',
        error instanceof Error ? error.message : 'Une erreur est survenue',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Remplissez les informations ci-dessous</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Nom complet"
            placeholder="Jean Dupont"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (errors.fullName) {
                const newErrors = { ...errors };
                delete newErrors.fullName;
                setErrors(newErrors);
              }
            }}
            error={errors.fullName}
            autoCapitalize="words"
          />

          <Input
            label="Email"
            placeholder="votre.email@exemple.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) {
                const newErrors = { ...errors };
                delete newErrors.email;
                setErrors(newErrors);
              }
            }}
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Input
            label="Mot de passe"
            placeholder="••••••••"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) {
                const newErrors = { ...errors };
                delete newErrors.password;
                setErrors(newErrors);
              }
            }}
            error={errors.password}
            secureTextEntry
            autoComplete="password"
          />

          <Input
            label="Confirmer le mot de passe"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) {
                const newErrors = { ...errors };
                delete newErrors.confirmPassword;
                setErrors(newErrors);
              }
            }}
            error={errors.confirmPassword}
            secureTextEntry
            autoComplete="password"
          />

          <SelectField
            label="Aéroport assigné"
            placeholder="Sélectionner un aéroport"
            options={AIRPORTS}
            selectedValue={airportCode}
            onSelect={(value) => {
              setAirportCode(value);
              if (errors.airportCode) {
                const newErrors = { ...errors };
                delete newErrors.airportCode;
                setErrors(newErrors);
              }
            }}
            error={errors.airportCode}
            required
          />

          <SelectField
            label="Rôle"
            placeholder="Sélectionner un rôle"
            options={ROLES}
            selectedValue={role}
            onSelect={(value) => {
              setRole(value as UserRole);
              if (errors.role) {
                const newErrors = { ...errors };
                delete newErrors.role;
                setErrors(newErrors);
              }
            }}
            error={errors.role}
            required
          />

          <Button
            title="S'inscrire"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            style={styles.registerButton}
          />

          <Button
            title="Déjà un compte ? Se connecter"
            onPress={() => navigation.goBack()}
            variant="outline"
            fullWidth
            style={styles.loginButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  form: {
    width: '100%',
  },
  registerButton: {
    marginTop: Spacing.md,
  },
  loginButton: {
    marginTop: Spacing.md,
  },
});
