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
    code: 'DT',
    name: 'TAAG Angola Airlines',
    destinations: ['LAD', 'FIH', 'JNB', 'CPT', 'LIS', 'GRU', 'BZV', 'POG', 'LOS', 'NBO'],
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
  // NOUVELLES COMPAGNIES AJOUTÉES
  // Tanzania
  {
    code: 'TC',
    name: 'Air Tanzania',
    destinations: ['DAR', 'JRO', 'NBO', 'EBB', 'JNB', 'ADD'],
  },
  {
    code: 'PW',
    name: 'Precision Air',
    destinations: ['DAR', 'JRO', 'NBO', 'EBB', 'JNB'],
  },
  // Rwanda
  {
    code: 'WB',
    name: 'RwandAir',
    destinations: ['KGL', 'FIH', 'NBO', 'EBB', 'ADD', 'JNB', 'LAD'],
  },
  // Afrique du Sud
  {
    code: 'SA',
    name: 'South African Airways',
    destinations: ['JNB', 'CPT', 'FIH', 'LAD', 'NBO', 'ADD', 'LOS'],
  },
  {
    code: '4Z',
    name: 'SA Airlink',
    destinations: ['JNB', 'CPT', 'FIH', 'LAD', 'NBO'],
  },
  // Autres compagnies africaines
  {
    code: 'MS',
    name: 'EgyptAir',
    destinations: ['CAI', 'FIH', 'LAD', 'JNB', 'ADD', 'NBO'],
  },
  {
    code: 'L6',
    name: 'Mauritania Airlines',
    destinations: ['NKC', 'FIH', 'ABJ', 'CMN'],
  },
  {
    code: 'W3',
    name: 'Arik Air',
    destinations: ['LOS', 'ABJ', 'FIH', 'LAD', 'JNB'],
  },
  {
    code: 'P4',
    name: 'Air Peace',
    destinations: ['LOS', 'ABJ', 'FIH', 'LAD', 'JNB'],
  },
  // Compagnies européennes
  {
    code: 'SN',
    name: 'Brussels Airlines',
    destinations: ['BRU', 'FIH', 'LAD', 'NBO', 'ADD', 'JNB', 'LOS'],
  },
  {
    code: 'AF',
    name: 'Air France',
    destinations: ['CDG', 'FIH', 'LAD', 'NBO', 'ABJ', 'LFW'],
  },
  {
    code: 'KL',
    name: 'KLM',
    destinations: ['AMS', 'FIH', 'LAD', 'NBO', 'JNB'],
  },
  {
    code: 'LH',
    name: 'Lufthansa',
    destinations: ['FRA', 'FIH', 'LAD', 'NBO', 'JNB', 'ADD'],
  },
  {
    code: 'BA',
    name: 'British Airways',
    destinations: ['LHR', 'FIH', 'LAD', 'NBO', 'JNB', 'ADD'],
  },
  {
    code: 'TP',
    name: 'TAP Air Portugal',
    destinations: ['LIS', 'LAD', 'FIH', 'GMA', 'LFW'],
  },
  // Compagnies du Moyen-Orient
  {
    code: 'EK',
    name: 'Emirates',
    destinations: ['DXB', 'FIH', 'LAD', 'NBO', 'JNB', 'DAR', 'EBB'],
  },
  {
    code: 'QR',
    name: 'Qatar Airways',
    destinations: ['DOH', 'FIH', 'LAD', 'NBO', 'JNB', 'DAR', 'EBB'],
  },
  {
    code: 'EY',
    name: 'Etihad Airways',
    destinations: ['AUH', 'FIH', 'LAD', 'NBO', 'JNB'],
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
