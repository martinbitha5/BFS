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
  // Destinations internationales
  { code: 'LFW', name: 'Lomé', iataCode: 'LFW' },
  { code: 'ABJ', name: 'Abidjan', iataCode: 'ABJ' },
  { code: 'NBO', name: 'Nairobi', iataCode: 'NBO' },
  { code: 'EBB', name: 'Entebbe', iataCode: 'EBB' },
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
