import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../config/api';

// Types pour les événements SSE
export interface AirportStats {
  totalPassengers: number;
  totalBaggages: number;
  boardedPassengers: number;
  notBoardedPassengers: number;
  arrivedBaggages: number;
  inTransitBaggages: number;
  todayPassengers: number;
  todayBaggages: number;
  flightsCount: number;
  uniqueFlights: string[];
}

export interface RawScansStats {
  total: number;
  by_type: {
    boarding_pass: number;
    baggage_tag: number;
  };
  by_status: {
    checkin: number;
    baggage: number;
    boarding: number;
    arrival: number;
  };
}

export interface RealtimeData {
  stats: AirportStats | null;
  rawScansStats: RawScansStats | null;
  isConnected: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

interface SSEMessage {
  stats?: AirportStats;
  rawScansStats?: RawScansStats;
  timestamp?: string;
  [key: string]: any;
}

// Construire l'URL SSE avec les bons headers
function getSSEUrl(airportCode: string): string {
  const baseUrl = import.meta.env.MODE === 'development' || import.meta.env.DEV
    ? 'http://localhost:3000'
    : (import.meta.env.VITE_API_URL || 'https://api.brsats.com');
  
  return `${baseUrl}/api/v1/realtime/subscribe/${airportCode}`;
}

export function useRealtimeStats(airportCode: string | undefined) {
  const [data, setData] = useState<RealtimeData>({
    stats: null,
    rawScansStats: null,
    isConnected: false,
    lastUpdate: null,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Fonction pour se connecter au flux SSE
  const connect = useCallback(() => {
    if (!airportCode) return;

    // Fermer la connexion existante
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const token = localStorage.getItem('bfs_token');
    const apiKey = import.meta.env.VITE_API_KEY;

    // Construire l'URL avec les paramètres d'authentification
    const url = new URL(getSSEUrl(airportCode));
    if (token) {
      url.searchParams.append('token', token);
    }
    if (apiKey) {
      url.searchParams.append('api_key', apiKey);
    }


    console.log('Connexion SSE a:', url.toString());

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    // Événement de connexion réussie
    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('SSE Connecte:', data);
      reconnectAttempts.current = 0;
      setData(prev => ({
        ...prev,
        isConnected: true,
        error: null,
      }));
    });

    // Mise à jour des statistiques
    eventSource.addEventListener('stats_update', (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        console.log('Stats update recu:', message.timestamp);
        
        setData(prev => ({
          ...prev,
          stats: message.stats || prev.stats,
          rawScansStats: message.rawScansStats || prev.rawScansStats,
          lastUpdate: new Date(),
          error: null,
        }));
      } catch (err) {
        console.error('Erreur parsing stats_update:', err);
      }
    });

    // Nouveau passager
    eventSource.addEventListener('new_passenger', (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Nouveau passager:', message.passenger?.pnr);
        // Déclencher un refresh des stats
        setData(prev => ({
          ...prev,
          lastUpdate: new Date(),
        }));
      } catch (err) {
        console.error('Erreur parsing new_passenger:', err);
      }
    });

    // Nouveau bagage
    eventSource.addEventListener('new_baggage', (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Nouveau bagage:', message.baggage?.tag_number);
        setData(prev => ({
          ...prev,
          lastUpdate: new Date(),
        }));
      } catch (err) {
        console.error('Erreur parsing new_baggage:', err);
      }
    });

    // Nouveau scan brut
    eventSource.addEventListener('raw_scan', (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Nouveau scan:', message.scan?.scan_type);
        setData(prev => ({
          ...prev,
          lastUpdate: new Date(),
        }));
      } catch (err) {
        console.error('Erreur parsing raw_scan:', err);
      }
    });

    // Synchronisation terminée
    eventSource.addEventListener('sync_complete', (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Sync terminee:', message.syncStats);
        setData(prev => ({
          ...prev,
          lastUpdate: new Date(),
        }));
      } catch (err) {
        console.error('Erreur parsing sync_complete:', err);
      }
    });

    // Mise à jour embarquement
    eventSource.addEventListener('boarding_update', (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Boarding update:', message);
        setData(prev => ({
          ...prev,
          lastUpdate: new Date(),
        }));
      } catch (err) {
        console.error('Erreur parsing boarding_update:', err);
      }
    });

    // Heartbeat (keep-alive)
    eventSource.addEventListener('heartbeat', () => {
      // Juste pour garder la connexion active
    });

    // Gestion des erreurs
    eventSource.onerror = (error) => {
      console.error('SSE Erreur:', error);
      eventSource.close();
      
      // NE PAS réinitialiser les stats - garder les dernières données valides
      // L'indicateur isConnected suffit pour informer l'utilisateur
      setData(prev => ({
        ...prev,
        isConnected: false,
        // Ne pas définir error ici pour ne pas déclencher l'affichage d'erreur
        // qui pourrait cacher les données existantes
      }));

      // Tentative de reconnexion
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        console.log(`Reconnexion dans ${delay/1000}s (tentative ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      } else {
        // Après échec de toutes les tentatives, ne pas définir d'erreur
        // pour ne pas cacher les données. L'indicateur isConnected=false suffit.
        console.warn('SSE: Toutes les tentatives de reconnexion ont échoué');
      }
    };

    return () => {
      eventSource.close();
    };
  }, [airportCode]);

  // Démarrer la connexion SSE
  useEffect(() => {
    if (airportCode) {
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [airportCode, connect]);

  // Fonction pour forcer une mise à jour
  const triggerUpdate = useCallback(async () => {
    if (!airportCode) return;
    
    try {
      await api.post(`/api/v1/realtime/trigger/${airportCode}`);
    } catch (err) {
      console.error('Erreur trigger update:', err);
    }
  }, [airportCode]);

  // Fonction pour récupérer les stats manuellement (fallback)
  const fetchStats = useCallback(async () => {
    if (!airportCode) return;
    
    try {
      const [statsRes, rawScansRes] = await Promise.all([
        api.get(`/api/v1/stats/airport/${airportCode}`),
        api.get(`/api/v1/raw-scans/stats?airport=${airportCode}`),
      ]);

      setData(prev => ({
        ...prev,
        stats: statsRes.data.data || prev.stats,
        rawScansStats: rawScansRes.data.data || prev.rawScansStats,
        lastUpdate: new Date(),
        error: null,
      }));
    } catch (err: any) {
      console.error('Erreur fetch stats:', err);
      // Ne pas définir d'erreur pour ne pas cacher les données existantes
      // Juste logger l'erreur
    }
  }, [airportCode]);

  return {
    ...data,
    triggerUpdate,
    fetchStats,
    reconnect: connect,
  };
}

