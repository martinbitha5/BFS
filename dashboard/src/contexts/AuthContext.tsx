import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../config/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  airport_code: string;
  role: 'checkin' | 'baggage' | 'boarding' | 'arrival' | 'supervisor' | 'baggage_dispute' | 'support';
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
        const userData = response.data.data;
        setUser(userData);
        localStorage.setItem('bfs_user', JSON.stringify(userData)); // Mettre à jour les données utilisateur
      } else {
        localStorage.removeItem('bfs_token');
        localStorage.removeItem('bfs_user');
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
        localStorage.setItem('bfs_user', JSON.stringify(userData)); // Stocker aussi les données utilisateur
      } else {
        throw new Error(response.data.error || 'Erreur de connexion');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Utiliser le message d'erreur professionnel de l'API
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.response?.status === 401) {
        throw new Error('Les identifiants saisis sont incorrects. Veuillez vérifier votre email et votre mot de passe.');
      } else if (error.response?.status === 404) {
        throw new Error('Aucun compte n\'a été trouvé avec cet email. Veuillez vérifier votre adresse email ou créer un compte.');
      } else {
        throw new Error('Problème de connexion. Vérifiez votre connexion internet et réessayez.');
      }
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bfs_token');
    localStorage.removeItem('bfs_user'); // Nettoyer aussi les données utilisateur
    // Optionnel : appeler l'API de logout
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
