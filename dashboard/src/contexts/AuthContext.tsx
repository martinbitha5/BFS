import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../config/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  airport_code: string;
  role: 'supervisor' | 'admin';
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, airportCode: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('bfs_token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Vérifier le token auprès de l'API
      const response = await api.get('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setUser(response.data.data);
      } else {
        localStorage.removeItem('bfs_token');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      localStorage.removeItem('bfs_token');
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

      if (response.data.success) {
        const { user: userData, token } = response.data.data;
        setUser(userData);
        localStorage.setItem('bfs_token', token);
      } else {
        throw new Error(response.data.error || 'Erreur de connexion');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Gérer les différents types d'erreurs avec des messages en français
      if (error.response?.status === 401) {
        throw new Error('Email ou mot de passe incorrect. Veuillez réessayer.');
      } else if (error.response?.status === 404) {
        throw new Error('Aucun compte trouvé avec cet email. Veuillez vous inscrire.');
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('Erreur de connexion. Vérifiez votre connexion internet.');
      }
    }
  };

  const register = async (email: string, password: string, name: string, airportCode: string) => {
    try {
      const response = await api.post('/api/v1/auth/register', {
        email,
        password,
        name,
        airportCode
      });

      if (response.data.success) {
        const { user: userData, token } = response.data.data;
        setUser(userData);
        localStorage.setItem('bfs_token', token);
      } else {
        throw new Error(response.data.error || 'Erreur d\'inscription');
      }
    } catch (error: any) {
      console.error('Register error:', error);
      
      // Gérer les différents types d'erreurs d'inscription
      if (error.response?.status === 400) {
        const errorMsg = error.response.data?.error;
        if (errorMsg?.includes('already') || errorMsg?.includes('existe')) {
          throw new Error('Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.');
        } else {
          throw new Error(errorMsg || 'Veuillez remplir tous les champs requis.');
        }
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('Erreur lors de l\'inscription. Vérifiez votre connexion internet.');
      }
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bfs_token');
    // Optionnel : appeler l'API de logout
    api.post('/api/v1/auth/logout').catch(console.error);
  };

  const value = {
    user,
    loading,
    login,
    register,
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
