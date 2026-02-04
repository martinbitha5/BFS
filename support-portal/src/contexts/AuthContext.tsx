import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import api from '../config/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  airport_code: string;
  role: 'supervisor' | 'baggage_dispute' | 'support';
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Clés localStorage spécifiques au support portal
const TOKEN_KEY = 'bfs_support_token';
const USER_KEY = 'bfs_support_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const resData = response.data as { success: boolean; data: User };
      if (resData.success) {
        const userData = resData.data;
        
        // Vérifier que c'est bien un utilisateur support
        if (userData.role !== 'support') {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setLoading(false);
          return;
        }
        
        setUser(userData);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/v1/auth/login', {
        email,
        password
      });

      const resData = response.data as { success: boolean; data: { user: User; token: string }; error?: string };
      if (resData.success) {
        const { user: userData, token } = resData.data;
        
        // Vérifier que c'est bien un utilisateur support
        if (userData.role !== 'support') {
          throw new Error('Ce portail est réservé aux utilisateurs Support. Veuillez utiliser le portail approprié à votre rôle.');
        }
        
        setUser(userData);
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      } else {
        throw new Error(resData.error || 'Erreur de connexion');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.message?.includes('Ce portail est réservé')) {
        throw error;
      }
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.response?.status === 401) {
        throw new Error('Les identifiants saisis sont incorrects.');
      } else if (error.response?.status === 404) {
        throw new Error('Aucun compte n\'a été trouvé avec cet email.');
      } else {
        throw new Error('Problème de connexion. Vérifiez votre connexion internet.');
      }
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    api.post('/api/v1/auth/logout').catch(console.error);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
