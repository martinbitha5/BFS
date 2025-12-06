/**
 * Liste complète des aéroports supportés par le système BFS
 * Synchronisé avec /api/src/routes/airports.routes.ts
 */

export interface Airport {
  code: string;
  name: string;
  country: string;
  iataCode?: string;
}

export const SUPPORTED_AIRPORTS: Airport[] = [
  // Aéroports RDC
  { code: 'FIH', name: 'Kinshasa', iataCode: 'FIH', country: 'RDC' },
  { code: 'FKI', name: 'Kisangani', iataCode: 'FKI', country: 'RDC' },
  { code: 'GOM', name: 'Goma', iataCode: 'GOM', country: 'RDC' },
  { code: 'FBM', name: 'Lubumbashi', iataCode: 'FBM', country: 'RDC' },
  { code: 'KWZ', name: 'Kolwezi', iataCode: 'KWZ', country: 'RDC' },
  { code: 'KGA', name: 'Kananga', iataCode: 'KGA', country: 'RDC' },
  { code: 'MJM', name: 'Mbuji-Mayi', iataCode: 'MJM', country: 'RDC' },
  { code: 'GMA', name: 'Gemena', iataCode: 'GMA', country: 'RDC' },
  { code: 'MDK', name: 'Mbandaka', iataCode: 'MDK', country: 'RDC' },
  { code: 'KND', name: 'Kindu', iataCode: 'KND', country: 'RDC' },
  // Destinations internationales
  { code: 'LFW', name: 'Lomé', iataCode: 'LFW', country: 'Togo' },
  { code: 'ABJ', name: 'Abidjan', iataCode: 'ABJ', country: 'Côte d\'Ivoire' },
  { code: 'NBO', name: 'Nairobi', iataCode: 'NBO', country: 'Kenya' },
  { code: 'EBB', name: 'Entebbe', iataCode: 'EBB', country: 'Ouganda' },
  { code: 'CMN', name: 'Casablanca', iataCode: 'CMN', country: 'Maroc' },
  { code: 'IST', name: 'Istanbul', iataCode: 'IST', country: 'Turquie' },
  { code: 'ADD', name: 'Addis Abeba', iataCode: 'ADD', country: 'Éthiopie' },
];

/**
 * Récupère les aéroports RDC uniquement
 */
export const getDomesticAirports = (): Airport[] => {
  return SUPPORTED_AIRPORTS.filter(a => a.country === 'RDC');
};

/**
 * Récupère les destinations internationales uniquement
 */
export const getInternationalAirports = (): Airport[] => {
  return SUPPORTED_AIRPORTS.filter(a => a.country !== 'RDC');
};

/**
 * Récupère un aéroport par son code
 */
export const getAirportByCode = (code: string): Airport | undefined => {
  return SUPPORTED_AIRPORTS.find(a => a.code === code);
};

/**
 * Récupère le nom complet d'un aéroport (avec pays si international)
 */
export const getAirportFullName = (code: string): string => {
  const airport = getAirportByCode(code);
  if (!airport) return code;
  
  if (airport.country === 'RDC') {
    return `${airport.name} (${airport.code})`;
  }
  return `${airport.name}, ${airport.country} (${airport.code})`;
};
