import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from './AuthContext';

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

    es.addEventListener('stats_update', (e: MessageEvent) => {
      setLastUpdate(Date.now());
    });

    es.addEventListener('new_passenger', () => setLastUpdate(Date.now()));
    es.addEventListener('new_baggage', () => setLastUpdate(Date.now()));
    es.addEventListener('boarding_update', () => setLastUpdate(Date.now()));
    es.addEventListener('sync_complete', () => setLastUpdate(Date.now()));

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      eventSourceRef.current = null;
      // Reconnect après 5s
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
      setIsConnected(false);
    };
  }, [user?.airport_code, connect]);

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
