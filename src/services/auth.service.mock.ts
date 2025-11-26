import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserSession, UserRole } from '../types/user.types';
import { mockService } from './mock.service';

const STORAGE_KEYS = {
  SESSION: '@bfs:session',
  USER: '@bfs:user',
};

/**
 * Service d'authentification mocké utilisant mockService
 * Utilise AsyncStorage pour persister la session
 */
class AuthServiceMock {
  async register(
    email: string,
    password: string,
    fullName: string,
    airportCode: string,
    role: UserRole
  ): Promise<UserSession> {
    try {
      const user = await mockService.register(email, password, fullName, airportCode, role);
      
      const session: UserSession = {
        user,
        accessToken: `mock_token_${user.id}_${Date.now()}`,
        refreshToken: `mock_refresh_${user.id}_${Date.now()}`,
      };

      await this.saveSession(session);
      return session;
    } catch (error) {
      throw error;
    }
  }

  async login(email: string, password: string): Promise<UserSession> {
    try {
      const user = await mockService.login(email, password);
      
      const session: UserSession = {
        user,
        accessToken: `mock_token_${user.id}_${Date.now()}`,
        refreshToken: `mock_refresh_${user.id}_${Date.now()}`,
      };

      await this.saveSession(session);
      return session;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
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
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const session = await this.getCurrentSession();
    return session?.user || null;
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return session !== null;
  }
}

export const authServiceMock = new AuthServiceMock();

