/**
 * Liste complète des compagnies aériennes supportées par l'application
 * Avec leurs codes IATA et destinations principales
 */

export interface Airline {
  code: string;          // Code IATA à 2 lettres
  name: string;          // Nom complet de la compagnie
  destinations: string[]; // Codes aéroports des destinations principales
}

export const KNOWN_AIRLINES: Airline[] = [
  // Compagnies africaines
  {
    code: 'ET',
    name: 'Ethiopian Airlines',
    destinations: ['FIH', 'ADD', 'GMA', 'NBO', 'EBB', 'LAD', 'JNB', 'CMN', 'IST'],
  },
  {
    code: '9U',
    name: 'Air Congo',
    destinations: ['FIH', 'FBM', 'BZV', 'LAD', 'GMA'],
  },
  {
    code: 'KP',
    name: 'ASKY Airlines',
    destinations: ['FIH', 'LFW', 'ABJ', 'NBO', 'LAD'],
  },
  {
    code: 'KQ',
    name: 'Kenya Airways',
    destinations: ['FIH', 'NBO', 'ADD', 'JNB', 'LAD', 'EBB'],
  },
  {
    code: 'HF',
    name: 'Air Côte d\'Ivoire',
    destinations: ['FIH', 'ABJ', 'LFW', 'NBO', 'LAD'],
  },
  {
    code: 'U7',
    name: 'Uganda Airlines',
    destinations: ['FIH', 'EBB', 'NBO', 'ADD', 'JNB'],
  },
  {
    code: 'AT',
    name: 'Royal Air Maroc',
    destinations: ['FIH', 'CMN', 'LAD', 'ABJ', 'LFW'],
  },
  {
    code: 'TK',
    name: 'Turkish Airlines',
    destinations: ['FIH', 'IST', 'LAD', 'NBO', 'CMN', 'ADD'],
  },
];

/**
 * Récupère le nom complet d'une compagnie à partir de son code IATA
 */
export function getAirlineName(code: string): string {
  const airline = KNOWN_AIRLINES.find(a => a.code === code);
  return airline ? airline.name : code;
}

/**
 * Vérifie si un code IATA est une compagnie connue
 */
export function isKnownAirline(code: string): boolean {
  return KNOWN_AIRLINES.some(a => a.code === code);
}

/**
 * Récupère les destinations d'une compagnie
 */
export function getAirlineDestinations(code: string): string[] {
  const airline = KNOWN_AIRLINES.find(a => a.code === code);
  return airline ? airline.destinations : [];
}

/**
 * Liste de tous les codes IATA des compagnies supportées
 */
export const AIRLINE_CODES = KNOWN_AIRLINES.map(a => a.code);
