/**
 * Configuration de l'application
 * Changez USE_MOCK_DATA à false quand Supabase est configuré
 */

export const USE_MOCK_DATA = false; // Production: utilise Supabase

export const CONFIG = {
  USE_MOCK_DATA,
  // Quand USE_MOCK_DATA est false, ces valeurs seront utilisées
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
};

