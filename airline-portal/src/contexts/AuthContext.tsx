import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import api from '../config/api';

interface Airline {
  id: string;
  name: string;
  code: string;
  email: string;
}

interface AuthContextType {
  airline: Airline | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [airline, setAirline] = useState<Airline | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si une session existe
    const storedAirline = localStorage.getItem('airline');
    if (storedAirline && storedAirline !== 'undefined' && storedAirline !== 'null') {
      try {
        const parsed = JSON.parse(storedAirline);
        if (parsed && parsed.id) {
          setAirline(parsed);
        } else {
          localStorage.removeItem('airline');
          localStorage.removeItem('airline_token');
        }
      } catch (e) {
        console.warn('Invalid airline data in localStorage, clearing...');
        localStorage.removeItem('airline');
        localStorage.removeItem('airline_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/v1/airlines/login', {
        email,
        password,
      });

      const { airline: airlineData, token } = response.data as { airline: Airline; token: string };
      setAirline(airlineData);
      localStorage.setItem('airline', JSON.stringify(airlineData));
      localStorage.setItem('airline_token', token);
      // Le token sera automatiquement ajouté par l'intercepteur
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erreur de connexion');
    }
  };

  const logout = () => {
    setAirline(null);
    localStorage.removeItem('airline');
    localStorage.removeItem('airline_token');
    // Le token sera automatiquement retiré par l'intercepteur (pas de token = pas de header)
  };

  return (
    <AuthContext.Provider value={{ airline, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
