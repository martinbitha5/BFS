import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, UserRole, UserSession } from '../types/user.types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const STORAGE_KEYS = {
  SESSION: '@bfs:session',
  USER: '@bfs:user',
  API_URL: '@bfs:api_url',
  API_KEY: '@bfs:api_key',
};

class AuthService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      console.warn('Supabase credentials not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
    }
  }

  async register(
    email: string,
    password: string,
    fullName: string,
    airportCode: string,
    role: UserRole
  ): Promise<UserSession> {
    if (!this.supabase) {
      throw new Error('Supabase not configured');
    }

    // Créer le compte dans Supabase Auth
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      throw new Error(`Erreur d'inscription: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Erreur: utilisateur non créé');
    }

    // Créer le profil dans la table users
    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        airport_code: airportCode,
        role,
      })
      .select()
      .single();

    if (userError) {
      // Si l'insertion échoue, supprimer le compte auth créé
      await this.supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Erreur de création du profil: ${userError.message}`);
    }

    const user: User = {
      id: userData.id,
      email: userData.email,
      fullName: userData.full_name,
      airportCode: userData.airport_code,
      role: userData.role,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    };

    const session: UserSession = {
      user,
      accessToken: authData.session?.access_token || '',
      refreshToken: authData.session?.refresh_token,
    };

    // Sauvegarder la session localement
    await this.saveSession(session);

    return session;
  }

  async login(email: string, password: string): Promise<UserSession> {
    if (!this.supabase) {
      throw new Error('Supabase not configured');
    }

    const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      throw new Error(`Erreur de connexion: ${authError.message}`);
    }

    if (!authData.user || !authData.session) {
      throw new Error('Erreur: session non créée');
    }

    // Récupérer le profil utilisateur
    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      throw new Error(`Erreur de récupération du profil: ${userError?.message}`);
    }

    const user: User = {
      id: userData.id,
      email: userData.email,
      fullName: userData.full_name,
      airportCode: userData.airport_code,
      role: userData.role,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    };

    const session: UserSession = {
      user,
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
    };

    // Sauvegarder la session localement
    await this.saveSession(session);

    return session;
  }

  async logout(): Promise<void> {
    if (this.supabase) {
      await this.supabase.auth.signOut();
    }
    await AsyncStorage.multiRemove([STORAGE_KEYS.SESSION, STORAGE_KEYS.USER]);
  }

  async getCurrentSession(): Promise<UserSession | null> {
    try {
      const sessionJson = await AsyncStorage.getItem(STORAGE_KEYS.SESSION);
      if (sessionJson) {
        return JSON.parse(sessionJson);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
    return null;
  }

  async saveSession(session: UserSession): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(session.user));
      
      // ✅ SAUVEGARDER API_URL ET API_KEY POUR LA SYNCHRONISATION
      // Ces valeurs sont nécessaires pour sync.service.ts
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const apiKey = process.env.EXPO_PUBLIC_API_KEY || ''; // Vide si non requise
      
      await AsyncStorage.setItem(STORAGE_KEYS.API_URL, apiUrl);
      await AsyncStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
      
      console.log('[Auth] ✅ Session + API config sauvegardées');
      console.log('[Auth]    API_URL:', apiUrl);
      console.log('[Auth]    API_KEY:', apiKey ? 'SET' : 'EMPTY (non requise)');
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const session = await this.getCurrentSession();
    return session?.user || null;
  }

  isAuthenticated(): Promise<boolean> {
    return this.getCurrentSession().then(session => session !== null);
  }
}

export const authService = new AuthService();

