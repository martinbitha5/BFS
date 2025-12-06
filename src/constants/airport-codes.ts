/**
 * Liste complète des codes aéroports supportés par l'application
 * Ce fichier est séparé pour éviter les cycles de dépendances
 */

export const KNOWN_AIRPORT_CODES = [
  // RDC
  'FIH', 'FKI', 'GOM', 'FBM', 'KWZ', 'KGA', 'MJM', 'GMA', 'MDK', 'KND',
  // Afrique de l'Est
  'NBO', 'EBB', 'ADD', 'KGL', 'DAR', 'JRO', // Kenya, Ouganda, Ethiopie, Rwanda, Tanzania
  // Afrique de l'Ouest
  'LFW', 'ABJ', 'LOS', 'ACC', 'NKC', // Liberia, Côte d'Ivoire, Nigeria, Ghana, Mauritanie
  // Afrique Australe
  'JNB', 'CPT', 'LAD', 'BZV', 'GMA', // Afrique du Sud, Angola, Congo-Brazzaville, Zambie
  // Afrique du Nord
  'CMN', 'CAI', 'ALG', 'TUN', // Maroc, Égypte, Algérie, Tunisie
  // Europe
  'BRU', 'CDG', 'AMS', 'FRA', 'LHR', 'LIS', 'IST', // Bruxelles, Paris, Amsterdam, Francfort, Londres, Lisbonne, Istanbul
  // Moyen-Orient
  'DXB', 'DOH', 'AUH', // Dubaï, Doha, Abu Dhabi
] as const;

