/**
 * Codes aéroports IATA utilisés par le système BFS
 * Basé sur les aéroports réels gérés et les destinations fréquentes
 */
export const KNOWN_AIRPORT_CODES = [
  // ========================================
  // AÉROPORTS RDC (Gérés par BFS)
  // ========================================
  'FIH', // Kinshasa N'Djili - PRINCIPAL
  'FKI', // Kisangani
  'GOM', // Goma
  'FBM', // Lubumbashi
  'KWZ', // Kolwezi
  'KGA', // Kananga
  'MJM', // Mbuji-Mayi
  'GMA', // Gemena
  'MDK', // Mbandaka
  'KND', // Kindu
  
  // ========================================
  // DESTINATIONS INTERNATIONALES (Réelles)
  // ========================================
  'LFW', // Lomé (Togo)
  'ABJ', // Abidjan (Côte d'Ivoire)
  'NBO', // Nairobi (Kenya)
  'EBB', // Entebbe (Ouganda)
  'CMN', // Casablanca (Maroc)
  'IST', // Istanbul (Turquie)
  'ADD', // Addis Abeba (Éthiopie)
  
  // ========================================
  // DESTINATIONS AFRICAINES FRÉQUENTES
  // ========================================
  'JNB', // Johannesburg (Afrique du Sud)
  'CPT', // Le Cap (Afrique du Sud)
  'LAD', // Luanda (Angola)
  'BZV', // Brazzaville (Congo)
  'KGL', // Kigali (Rwanda)
  'DAR', // Dar es Salaam (Tanzanie)
  'LOS', // Lagos (Nigeria)
  'ACC', // Accra (Ghana)
  'DLA', // Douala (Cameroun)
  'LBV', // Libreville (Gabon)
  'CAI', // Le Caire (Égypte)
  'ALG', // Alger (Algérie)
  'TUN', // Tunis (Tunisie)
  
  // ========================================
  // DESTINATIONS EUROPÉENNES FRÉQUENTES
  // ========================================
  'CDG', // Paris Charles de Gaulle
  'ORY', // Paris Orly
  'BRU', // Bruxelles
  'AMS', // Amsterdam
  'FRA', // Francfort
  'LHR', // Londres Heathrow
  'MAD', // Madrid
  'FCO', // Rome
  'ZRH', // Zurich
  
  // ========================================
  // MOYEN-ORIENT (Hub pour vols RDC)
  // ========================================
  'DXB', // Dubai
  'DOH', // Doha
  'AUH', // Abu Dhabi
  
  // ========================================
  // AMÉRIQUE & ASIE (Si nécessaire)
  // ========================================
  'JFK', // New York
  'YYZ', // Toronto
  'PEK', // Beijing
  'HKG', // Hong Kong
];
