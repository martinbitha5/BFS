import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeMode, getTheme, ThemeColors } from '../theme/themes';
import { settingsService } from '../services/settings.service';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleMode: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const settings = await settingsService.loadSettings();
      // Utiliser le mode sombre si activé, sinon suivre le système
      const themeMode = settings.darkModeEnabled ? 'dark' : (systemColorScheme === 'dark' ? 'dark' : 'light');
      setModeState(themeMode);
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setMode = async (newMode: ThemeMode) => {
    try {
      await settingsService.updateSetting('darkModeEnabled', newMode === 'dark');
      setModeState(newMode);
    } catch (error) {
      console.error('Error setting theme mode:', error);
    }
  };

  const toggleMode = async () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    await setMode(newMode);
  };

  if (isLoading) {
    return null; // Ou un loader si nécessaire
  }

  const colors = getTheme(mode);

  return (
    <ThemeContext.Provider value={{ mode, colors, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

