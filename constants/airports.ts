export interface Airport {
  code: string;
  name: string;
  iataCode: string;
}

export const AIRPORTS: Airport[] = [
  // Aéroports RDC
  { code: 'FIH', name: 'Kinshasa', iataCode: 'FIH' },
  { code: 'FKI', name: 'Kisangani', iataCode: 'FKI' },
  { code: 'GOM', name: 'Goma', iataCode: 'GOM' },
  { code: 'FBM', name: 'Lubumbashi', iataCode: 'FBM' },
  { code: 'KWZ', name: 'Kolwezi', iataCode: 'KWZ' },
  { code: 'KGA', name: 'Kananga', iataCode: 'KGA' },
  { code: 'MJM', name: 'Mbuji-Mayi', iataCode: 'MJM' },
  { code: 'GMA', name: 'Gemena', iataCode: 'GMA' },
  { code: 'MDK', name: 'Mbandaka', iataCode: 'MDK' },
  { code: 'KND', name: 'Kindu', iataCode: 'KND' },
  { code: 'BUX', name: 'Bunia', iataCode: 'BUX' },
  { code: 'BNC', name: 'Beni', iataCode: 'BNC' },
  { code: 'BDT', name: 'Gbadolite', iataCode: 'BDT' },
  { code: 'IRP', name: 'Isiro', iataCode: 'IRP' },
  { code: 'FMI', name: 'Kalemie', iataCode: 'FMI' },
  { code: 'MNB', name: 'Moanda', iataCode: 'MNB' },
  // Destinations internationales
  { code: 'LFW', name: 'Lomé', iataCode: 'LFW' },
  { code: 'ABJ', name: 'Abidjan', iataCode: 'ABJ' },
  { code: 'NBO', name: 'Nairobi', iataCode: 'NBO' },
  { code: 'EBB', name: 'Entebbe', iataCode: 'EBB' },
  { code: 'COO', name: 'Cotonou', iataCode: 'COO' },
  { code: 'DLA', name: 'Douala', iataCode: 'DLA' },
  { code: 'DAR', name: 'Dar es Salaam', iataCode: 'DAR' },
  { code: 'JNB', name: 'Johannesburg', iataCode: 'JNB' },
  { code: 'LOS', name: 'Lagos', iataCode: 'LOS' },
  { code: 'CMN', name: 'Casablanca', iataCode: 'CMN' },
  { code: 'IST', name: 'Istanbul', iataCode: 'IST' },
  { code: 'ADD', name: 'Addis Abeba', iataCode: 'ADD' },
];

export const getAirportByCode = (code: string): Airport | undefined => {
  return AIRPORTS.find((airport) => airport.code === code);
};

export const getAirportByIataCode = (iataCode: string): Airport | undefined => {
  return AIRPORTS.find((airport) => airport.iataCode === iataCode);
};
