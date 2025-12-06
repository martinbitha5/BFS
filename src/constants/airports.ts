/**
 * Liste complète des aéroports supportés par l'application
 * Avec informations détaillées pour chaque aéroport
 */

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
}

export const AIRPORTS: Airport[] = [
  // République Démocratique du Congo
  {
    code: 'FIH',
    name: 'Aéroport International de N\'djili',
    city: 'Kinshasa',
    country: 'République Démocratique du Congo',
    countryCode: 'CD',
  },
  {
    code: 'FKI',
    name: 'Aéroport de Kisangani',
    city: 'Kisangani',
    country: 'République Démocratique du Congo',
    countryCode: 'CD',
  },
  {
    code: 'GOM',
    name: 'Aéroport International de Goma',
    city: 'Goma',
    country: 'République Démocratique du Congo',
    countryCode: 'CD',
  },
  {
    code: 'FBM',
    name: 'Aéroport de Lubumbashi',
    city: 'Lubumbashi',
    country: 'République Démocratique du Congo',
    countryCode: 'CD',
  },
  {
    code: 'KWZ',
    name: 'Aéroport de Kolwezi',
    city: 'Kolwezi',
    country: 'République Démocratique du Congo',
    countryCode: 'CD',
  },
  {
    code: 'KGA',
    name: 'Aéroport de Kananga',
    city: 'Kananga',
    country: 'République Démocratique du Congo',
    countryCode: 'CD',
  },
  {
    code: 'MJM',
    name: 'Aéroport de Mbuji-Mayi',
    city: 'Mbuji-Mayi',
    country: 'République Démocratique du Congo',
    countryCode: 'CD',
  },
  {
    code: 'GMA',
    name: 'Aéroport de Gemena',
    city: 'Gemena',
    country: 'République Démocratique du Congo',
    countryCode: 'CD',
  },
  {
    code: 'MDK',
    name: 'Aéroport de Mbandaka',
    city: 'Mbandaka',
    country: 'République Démocratique du Congo',
    countryCode: 'CD',
  },
  {
    code: 'KND',
    name: 'Aéroport de Kindu',
    city: 'Kindu',
    country: 'République Démocratique du Congo',
    countryCode: 'CD',
  },
  
  // Afrique
  {
    code: 'LFW',
    name: 'Aéroport de Lomé-Tokoin',
    city: 'Lomé',
    country: 'Togo',
    countryCode: 'TG',
  },
  {
    code: 'ABJ',
    name: 'Aéroport International Félix-Houphouët-Boigny',
    city: 'Abidjan',
    country: 'Côte d\'Ivoire',
    countryCode: 'CI',
  },
  {
    code: 'NBO',
    name: 'Aéroport International Jomo Kenyatta',
    city: 'Nairobi',
    country: 'Kenya',
    countryCode: 'KE',
  },
  {
    code: 'EBB',
    name: 'Aéroport International d\'Entebbe',
    city: 'Entebbe',
    country: 'Ouganda',
    countryCode: 'UG',
  },
  {
    code: 'CMN',
    name: 'Aéroport International Mohammed V',
    city: 'Casablanca',
    country: 'Maroc',
    countryCode: 'MA',
  },
  {
    code: 'IST',
    name: 'Aéroport d\'Istanbul',
    city: 'Istanbul',
    country: 'Turquie',
    countryCode: 'TR',
  },
  {
    code: 'ADD',
    name: 'Aéroport International Bole',
    city: 'Addis-Abeba',
    country: 'Éthiopie',
    countryCode: 'ET',
  },
];

/**
 * Trouve un aéroport par son code
 */
export function getAirportByCode(code: string): Airport | undefined {
  return AIRPORTS.find(airport => airport.code === code);
}

/**
 * Trouve tous les aéroports d'un pays
 */
export function getAirportsByCountry(countryCode: string): Airport[] {
  return AIRPORTS.filter(airport => airport.countryCode === countryCode);
}

/**
 * Vérifie si un code aéroport est connu
 */
export function isKnownAirport(code: string): boolean {
  return AIRPORTS.some(airport => airport.code === code);
}
