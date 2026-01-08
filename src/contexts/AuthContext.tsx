import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/auth.service';
import { User, UserSession } from '../types/user.types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<UserSession>;
  logout: () => Promise<void>;
  register: (email: string, password: string, fullName: string, airportCode: string, role: string) => Promise<UserSession>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const session = await authService.login(email, password);
    setUser(session.user);
    setIsAuthenticated(true);
    return session;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const register = async (email: string, password: string, fullName: string, airportCode: string, role: string) => {
    const session = await authService.register(email, password, fullName, airportCode, role as any);
    setUser(session.user);
    setIsAuthenticated(true);
    return session;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        register,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
