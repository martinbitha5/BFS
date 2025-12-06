import { useState, useEffect } from 'react';
import api from '../config/api';

export interface Airport {
  code: string;
  name: string;
  iataCode: string;
  country: string;
}

export function useAirports() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [activeAirports, setActiveAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAirports = async () => {
      try {
        setLoading(true);
        
        // Charger tous les aéroports supportés
        const allResponse = await api.get('/api/v1/airports');
        setAirports(allResponse.data.data);

        // Charger les aéroports actifs (avec données)
        try {
          const activeResponse = await api.get('/api/v1/airports/active');
          setActiveAirports(activeResponse.data.data);
        } catch (err) {
          // Si l'endpoint active échoue, utiliser tous les aéroports
          console.warn('Could not fetch active airports, using all airports');
          setActiveAirports(allResponse.data.data);
        }
      } catch (err: any) {
        console.error('Error fetching airports:', err);
        setError(err.response?.data?.error || 'Erreur lors du chargement des aéroports');
        
        // Fallback sur aéroports RDC de base
        const fallbackAirports = [
          { code: 'FIH', name: 'Kinshasa', iataCode: 'FIH', country: 'RDC' },
          { code: 'GOM', name: 'Goma', iataCode: 'GOM', country: 'RDC' },
          { code: 'FBM', name: 'Lubumbashi', iataCode: 'FBM', country: 'RDC' },
        ];
        setAirports(fallbackAirports);
        setActiveAirports(fallbackAirports);
      } finally {
        setLoading(false);
      }
    };

    fetchAirports();
  }, []);

  return { airports, activeAirports, loading, error };
}
