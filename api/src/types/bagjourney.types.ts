/**
 * Types pour l'API BagJourney de SITA
 * Documentation: https://www.developer.aero/api-catalog/bag-journey-overview
 */

export interface BagJourneyConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
}

export interface BagJourneyEvent {
  code: BagJourneyEventCode;
  description: string;
  timestamp: string;
  location: string;
  airportCode: string;
  flightNumber?: string;
}

export type BagJourneyEventCode = 
  | 'CHECKED_IN'
  | 'PAX_BOARDED'
  | 'SCREENED'
  | 'SCREENING_PASSED'
  | 'SCREENING_FAILED'
  | 'SORTED'
  | 'LOADED_IN_CONTAINER'
  | 'LOADED_ON_AIRCRAFT'
  | 'OFFLOADED'
  | 'EXPECTED'
  | 'REROUTED'
  | 'REFLIGHTED'
  | 'CANCELLED'
  | 'MISHANDLED'
  | 'ONA'
  | 'OND'
  | 'NAL'
  | 'UNS';

export interface BagJourneyHistory {
  tagNumber: string;
  flightDate: string;
  events: BagJourneyEvent[];
  currentStatus: BagJourneyStatus;
  lastUpdate: string;
}

export interface BagJourneyStatus {
  code: string;
  description: string;
  location: string;
  timestamp: string;
}

export interface BagJourneyFlightRequest {
  flightNumber: string;
  flightDate: string;
  airportCode?: string;
}

export interface BagJourneyTagRequest {
  tagNumber: string;
  flightDate?: string;
}

export interface BagJourneyPassengerRequest {
  passengerName: string;
  flightNumber?: string;
  flightDate?: string;
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
  bags: BagJourneyBagInfo[];
  totalBags: number;
  delayedBags: number;
  rushBags: number;
}

export interface BagJourneyBagInfo {
  tagNumber: string;
  passengerName?: string;
  currentStatus: string;
  lastLocation: string;
  lastUpdate: string;
  isDelayed: boolean;
  isRush: boolean;
}

export interface BagJourneySyncOptions {
  enableRealTimeSync: boolean;
  syncInterval: number; // minutes
  batchSize: number;
  retryAttempts: number;
}