import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/contexts/AuthContext';
import { FlightProvider } from './src/contexts/FlightContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import RootStack from './src/navigation/RootStack';
import SplashScreen from './src/screens/SplashScreen';
import { authServiceInstance, flightService } from './src/services';
import { databaseService } from './src/services/database.service';

function AppContent() {
  const { mode } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeApp() {
      try {
        // ✅ ÉTAPE 1: INITIALISER LES VARIABLES D'ENVIRONNEMENT EN ASYNCSTORAGE
        // Ceci assure que même en PRODUCTION AAB, les variables sont disponibles
        // Ces variables DOIVENT être définies dans .env et .env.production !
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.brsats.com';
        const apiKey = process.env.EXPO_PUBLIC_API_KEY || 'bfs-api-key-secure-2025';
        
        await AsyncStorage.setItem('@bfs:api_url', apiUrl);
        await AsyncStorage.setItem('@bfs:api_key', apiKey);
        
        console.log('[App] ✅ ÉTAPE 1: Variables d\'environnement initialisées');
        console.log('[App]    API_URL:', apiUrl);
        console.log('[App]    API_KEY:', apiKey ? '✅ SET' : '❌ MISSING');
        
        // ✅ ÉTAPE 2: Initialiser la base de données SQLite
        await databaseService.initialize();
        console.log('[App] ✅ ÉTAPE 2: Base de données SQLite initialisée');
        
        // ✅ ÉTAPE 3: Pré-charger les vols en background (si connecté)
        // Ceci assure que les vols sont disponibles immédiatement au boarding
        try {
          const user = await authServiceInstance.getCurrentUser();
          if (user && user.airportCode) {
            console.log('[App] ✅ ÉTAPE 3: Pré-chargement des vols pour', user.airportCode);
            // Appel asynchrone, ne pas attendre
            flightService.getAvailableFlights(user.airportCode).catch(err => {
              console.warn('[App] ⚠️ Erreur pré-chargement vols:', err);
            });
          } else {
            console.log('[App] ℹ️ ÉTAPE 3: Utilisateur non connecté, pré-chargement vols ignoré');
          }
        } catch (flightError) {
          console.warn('[App] ⚠️ Erreur lors du pré-chargement des vols:', flightError);
        }
        
        setIsReady(true);
      } catch (err) {
        console.error('[App] ❌ Erreur lors de l\'initialisation:', err);
        setError(err instanceof Error ? err.message : 'Erreur d\'initialisation');
        setIsReady(true); // On continue même en cas d'erreur
      }
    }

    initializeApp();
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // Afficher le splash screen pendant l'initialisation et l'animation
  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <FlightProvider>
        <NavigationContainer theme={mode === 'dark' ? DarkTheme : DefaultTheme}>
          <RootStack />
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        </NavigationContainer>
      </FlightProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    marginTop: 16,
    color: '#ff0000',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

