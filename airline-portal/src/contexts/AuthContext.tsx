import axios from 'axios';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { API_URL } from '../config/api';

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
    if (storedAirline) {
      setAirline(JSON.parse(storedAirline));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/v1/airlines/login`, {
        email,
        password,
      });

      const { airline: airlineData, token } = response.data;
      setAirline(airlineData);
      localStorage.setItem('airline', JSON.stringify(airlineData));
      localStorage.setItem('airline_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erreur de connexion');
    }
  };

  const logout = () => {
    setAirline(null);
    localStorage.removeItem('airline');
    localStorage.removeItem('airline_token');
    delete axios.defaults.headers.common['Authorization'];
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
