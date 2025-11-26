import React, { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import RootStack from './src/navigation/RootStack';
import SplashScreen from './src/screens/SplashScreen';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { databaseServiceInstance } from './src/services';

function AppContent() {
  const { mode } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeApp() {
      try {
        await databaseServiceInstance.initialize();
        setIsReady(true);
      } catch (err) {
        console.error('Failed to initialize app:', err);
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
      <NavigationContainer theme={mode === 'dark' ? DarkTheme : DefaultTheme}>
        <RootStack />
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
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

