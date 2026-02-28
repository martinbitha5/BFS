/**
 * Service BagJourney pour le passenger-portal
 * Gère la communication avec l'API BagJourney via le backend BFS
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface BagJourneyEvent {
  code: string;
  description: string;
  timestamp: string;
  location: string;
  airportCode: string;
  flightNumber?: string;
}

export interface BagJourneyHistory {
  tagNumber: string;
  flightDate: string;
  events: BagJourneyEvent[];
  currentStatus: {
    code: string;
    description: string;
    location: string;
    timestamp: string;
  };
  lastUpdate: string;
}

export interface BagJourneyResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface BagJourneyFlightBags {
  flightNumber: string;
  flightDate: string;
  bags: Array<{
    tagNumber: string;
    passengerName?: string;
    currentStatus: string;
    lastLocation: string;
    lastUpdate: string;
    isDelayed: boolean;
    isRush: boolean;
  }>;
  totalBags: number;
  delayedBags: number;
  rushBags: number;
}

class BagJourneyService {
  private api;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_URL}/api/v1/bagjourney`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Intercepteur pour gérer les erreurs
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('BagJourney API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Récupère l'historique d'un bagage par numéro de tag
   */
  async getBagHistory(tagNumber: string, flightDate?: string): Promise<BagJourneyResponse<BagJourneyHistory>> {
    try {
      const params = new URLSearchParams();
      if (flightDate) params.append('flightDate', flightDate);

      const response = await this.api.get<BagJourneyResponse<BagJourneyHistory>>(`/status/${tagNumber}?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Erreur lors de la récupération de l\'historique du bagage',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Récupère les bagages pour un vol spécifique
   */
  async getFlightBags(flightNumber: string, flightDate: string): Promise<BagJourneyResponse<BagJourneyFlightBags>> {
    try {
      const response = await this.api.get<BagJourneyResponse<BagJourneyFlightBags>>(`/flight/${flightNumber}/${flightDate}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Erreur lors de la récupération des bagages du vol',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Vérifie la disponibilité du service BagJourney
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.api.get<{ success?: boolean }>('/health');
      return response.data?.success === true;
    } catch {
      return false;
    }
  }

  /**
   * Convertit les données BagJourney au format BFS local
   */
  convertToBFSFormat(bagData: BagJourneyHistory): any {
    return {
      bag_id: bagData.tagNumber,
      status: this.mapBagJourneyStatusToBFS(bagData.currentStatus.code),
      current_location: bagData.currentStatus.location,
      last_scanned_at: bagData.currentStatus.timestamp,
      baggage_type: 'international', // BagJourney est principalement pour les vols internationaux
      origin: bagData.events.find(e => e.code === 'CHECKED_IN')?.location || 'Unknown',
      destination: bagData.events.find(e => e.code === 'EXPECTED')?.location || 'Unknown',
      notes: `BagJourney: ${bagData.currentStatus.description}`,
    };
  }

  /**
   * Mappe les statuts BagJourney (SITA) aux statuts BFS
   * Aligné avec api/src/utils/bagjourney-status.util.ts
   */
  private mapBagJourneyStatusToBFS(bagJourneyStatus: string): string {
    const statusMap: Record<string, string> = {
      CHECKED_IN: 'checked',
      PAX_BOARDED: 'checked',
      SCREENED: 'checked',
      SCREENING_PASSED: 'checked',
      SCREENING_FAILED: 'rush',
      SORTED: 'checked',
      LOADED_IN_CONTAINER: 'loaded',
      LOADED_ON_AIRCRAFT: 'loaded',
      NAL: 'loaded',
      OFFLOADED: 'rush',
      EXPECTED: 'arrived',
      REROUTED: 'rush',
      REFLIGHTED: 'rush',
      CANCELLED: 'lost',
      MISHANDLED: 'lost',
      ONA: 'in_transit',
      OND: 'rush',
      UNS: 'checked',
    };
    return statusMap[(bagJourneyStatus || '').trim().toUpperCase()] || 'checked';
  }
}

// Instance singleton
let bagJourneyServiceInstance: BagJourneyService | null = null;

export function getBagJourneyService(): BagJourneyService {
  if (!bagJourneyServiceInstance) {
    bagJourneyServiceInstance = new BagJourneyService();
  }
  return bagJourneyServiceInstance;
}

export default BagJourneyService;