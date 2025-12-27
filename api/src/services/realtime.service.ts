import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
  airportCode: string;
  connectedAt: Date;
}

class RealtimeService {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Démarrer le heartbeat pour garder les connexions actives
    this.startHeartbeat();
  }

  /**
   * Ajoute un nouveau client SSE
   */
  addClient(id: string, res: Response, airportCode: string): void {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2e82e369-b2c3-4892-be74-bf76a361a519',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'realtime.service.ts:addClient',message:'Adding SSE client',data:{id,airportCode,totalBefore:this.clients.size},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    this.clients.set(id, {
      id,
      res,
      airportCode: airportCode.toUpperCase(),
      connectedAt: new Date(),
    });
    
    console.log(`SSE Client connecte: ${id} (${airportCode}) - Total: ${this.clients.size}`);
  }

  /**
   * Supprime un client SSE
   */
  removeClient(id: string): void {
    const client = this.clients.get(id);
    if (client) {
      this.clients.delete(id);
      console.log(`SSE Client deconnecte: ${id} (${client.airportCode}) - Total: ${this.clients.size}`);
    }
  }

  /**
   * Envoie un événement à tous les clients d'un aéroport
   */
  broadcast(airportCode: string, eventType: string, data: any): void {
    const normalizedAirport = airportCode.toUpperCase();
    let sentCount = 0;

    this.clients.forEach((client) => {
      // Envoyer si l'aéroport correspond ou si le client écoute ALL
      if (client.airportCode === normalizedAirport || client.airportCode === 'ALL') {
        try {
          this.sendEvent(client.res, eventType, data);
          sentCount++;
        } catch (error) {
          console.error(`Erreur SSE pour client ${client.id}:`, error);
          this.removeClient(client.id);
        }
      }
    });

    if (sentCount > 0) {
      console.log(`SSE Broadcast [${eventType}] vers ${airportCode}: ${sentCount} clients`);
    }
  }

  /**
   * Envoie un événement à un client spécifique
   */
  private sendEvent(res: Response, eventType: string, data: any): void {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    res.write(payload);
  }

  /**
   * Heartbeat pour garder les connexions actives
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date().toISOString();
      this.clients.forEach((client, id) => {
        try {
          this.sendEvent(client.res, 'heartbeat', { timestamp: now });
        } catch (error) {
          console.error(`Heartbeat echoue pour ${id}:`, error);
          this.removeClient(id);
        }
      });
    }, 15000); // Heartbeat toutes les 15 secondes
  }

  /**
   * Arrête le service
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.clients.clear();
  }

  /**
   * Retourne le nombre de clients connectés
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Retourne les stats des connexions
   */
  getStats(): { total: number; byAirport: Record<string, number> } {
    const byAirport: Record<string, number> = {};
    this.clients.forEach((client) => {
      byAirport[client.airportCode] = (byAirport[client.airportCode] || 0) + 1;
    });
    return { total: this.clients.size, byAirport };
  }
}

// Singleton pour partager entre les routes
export const realtimeService = new RealtimeService();

// Types d'événements
export const SSE_EVENTS = {
  STATS_UPDATE: 'stats_update',
  NEW_PASSENGER: 'new_passenger',
  NEW_BAGGAGE: 'new_baggage',
  BOARDING_UPDATE: 'boarding_update',
  FLIGHT_UPDATE: 'flight_update',
  RAW_SCAN: 'raw_scan',
  ALERT: 'alert',
  SYNC_COMPLETE: 'sync_complete',
} as const;

export type SSEEventType = typeof SSE_EVENTS[keyof typeof SSE_EVENTS];

