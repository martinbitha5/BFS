import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../config/api';

// Types
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

/**
 * Hook simplifié pour les statistiques temps réel
 * Utilise le polling API au lieu du SSE complexe pour éviter les incohérences
 */
export function useRealtimeStats(airportCode: string | undefined) {
  const [data, setData] = useState<RealtimeData>({
    stats: null,
    rawScansStats: null,
    isConnected: true,
    lastUpdate: null,
    error: null,
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Fonction principale pour récupérer toutes les stats
  const fetchStats = useCallback(async () => {
    if (!airportCode || !isMountedRef.current) return;
    
    try {
      // Fetch stats et rawScansStats en parallèle
      const [statsRes, rawScansRes] = await Promise.all([
        api.get(`/api/v1/stats/airport/${airportCode}`).catch(() => null),
        api.get(`/api/v1/raw-scans/stats?airport=${airportCode}`).catch(() => null),
      ]);

      if (!isMountedRef.current) return;

      setData(prev => {
        const newStats = statsRes?.data?.data || prev.stats;
        const newRawScans = rawScansRes?.data?.data || prev.rawScansStats;
        
        return {
          stats: newStats,
          rawScansStats: newRawScans,
          isConnected: true,
          lastUpdate: new Date(),
          error: null,
        };
      });
    } catch (err: any) {
      console.error('[useRealtimeStats] Erreur fetch:', err);
      if (isMountedRef.current) {
        setData(prev => ({
          ...prev,
          isConnected: false,
        }));
      }
    }
  }, [airportCode]);

  // Fetch initial au montage
  useEffect(() => {
    isMountedRef.current = true;
    
    if (airportCode) {
      // Fetch immédiat
      fetchStats();
      
      // Polling toutes les 30 secondes
      intervalRef.current = setInterval(fetchStats, 30000);
    }

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [airportCode, fetchStats]);

  // Fonction pour forcer une mise à jour manuelle
  const triggerUpdate = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  return {
    ...data,
    triggerUpdate,
    fetchStats,
    reconnect: fetchStats,
  };
}

