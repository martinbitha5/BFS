/**
 * Types pour la gestion des vols et du contexte vol de l'agent
 */

export interface FlightContext {
  flightNumber: string;
  airline: string;
  airlineCode: string;
  departure: string;
  arrival: string;
  selectedAt: string;
  selectedBy: string;
}

export interface AvailableFlight {
  flightNumber: string;
  airline: string;
  airlineCode: string;
  departure: string;
  arrival: string;
  passengerCount?: number; // Nombre de passagers enregistrés
  baggageCount?: number; // Nombre de bagages enregistrés
  source: 'schedule' | 'passengers' | 'frequent'; // Source de la donnée
}

export interface FlightSchedule {
  id: string;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  departure: string;
  arrival: string;
  scheduledDate: string;
  scheduledTime?: string;
  airportCode: string;
  status: 'scheduled' | 'boarding' | 'departed' | 'arrived' | 'cancelled';
  createdAt: string;
  createdBy: string;
}
