import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from './AuthContext';

const POLLING_INTERVAL_MS = 5000; // 5 secondes quand SSE est déconnecté

interface RealtimeContextType {
  /** Timestamp du dernier update reçu - déclencher refetch quand il change */
  lastUpdate: number;
  /** Connexion SSE active */
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lastUpdate, setLastUpdate] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback(() => {
    if (!user?.airport_code) return;

    const airport = user.airport_code === 'ALL' ? 'ALL' : user.airport_code;
    const token = localStorage.getItem('bfs_token');
    const url = `${API_BASE_URL}/api/v1/realtime/subscribe/${airport}${token ? `?token=${token}` : ''}`;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setIsConnected(true);
    });

    es.addEventListener('stats_update', () => setLastUpdate(Date.now()));
    es.addEventListener('new_passenger', () => setLastUpdate(Date.now()));
    es.addEventListener('new_baggage', () => setLastUpdate(Date.now()));
    es.addEventListener('boarding_update', () => setLastUpdate(Date.now()));
    es.addEventListener('sync_complete', () => setLastUpdate(Date.now()));

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      eventSourceRef.current = null;
      setTimeout(connect, 5000);
    };
  }, [user?.airport_code]);

  useEffect(() => {
    if (user?.airport_code) {
      connect();
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsConnected(false);
    };
  }, [user?.airport_code, connect]);

  /** Fallback: polling toutes les 5s quand SSE est déconnecté */
  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (!user?.airport_code) return;

    if (!isConnected) {
      pollingRef.current = setInterval(() => setLastUpdate(Date.now()), POLLING_INTERVAL_MS);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isConnected, user?.airport_code]);

  return (
    <RealtimeContext.Provider value={{ lastUpdate, isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
