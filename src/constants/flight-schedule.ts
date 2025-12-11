/**
 * Vols fréquents pré-configurés
 * Ces vols sont affichés par défaut dans la sélection
 * Le superviseur peut ajouter d'autres vols manuellement
 */

export interface FrequentFlight {
  flightNumber: string;
  airline: string;
  airlineCode: string;
  departure: string;
  arrival: string;
  frequency: 'daily' | 'weekly' | 'frequent'; // Fréquence du vol
  active: boolean; // Actif ou non
}

/**
 * Liste des vols fréquents configurés
 * VIDE PAR DÉFAUT - Le superviseur ajoutera les vols via le dashboard
 */
export const FREQUENT_FLIGHTS: FrequentFlight[] = [
  // Les vols seront ajoutés par le superviseur via le dashboard web
  // L'app mobile récupérera automatiquement les vols depuis la base de données
];

/**
 * Récupère les vols fréquents pour un aéroport donné
 */
export function getFrequentFlightsByAirport(airportCode: string): FrequentFlight[] {
  return FREQUENT_FLIGHTS.filter(
    flight => 
      flight.active && 
      (flight.departure === airportCode || flight.arrival === airportCode)
  );
}

/**
 * Récupère un vol fréquent par son numéro
 */
export function getFrequentFlightByNumber(flightNumber: string): FrequentFlight | undefined {
  return FREQUENT_FLIGHTS.find(
    flight => flight.flightNumber.toUpperCase() === flightNumber.toUpperCase()
  );
}

/**
 * Vérifie si un vol est dans la liste des vols fréquents
 */
export function isFrequentFlight(flightNumber: string): boolean {
  return FREQUENT_FLIGHTS.some(
    flight => flight.flightNumber.toUpperCase() === flightNumber.toUpperCase()
  );
}
