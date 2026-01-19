/**
 * Types pour le Boarding (Embarquement)
 * Scan & Confirmation d'embarquement des passagers
 */

/**
 * Statut d'embarquement d'un passager
 */
export interface BoardingStatus {
  id: string;
  passengerId: string;
  boarded: boolean;
  boardedAt?: string;
  boardedBy?: string;
  gate?: string;
  seatNumber?: string;        // ✨ NOUVEAU
  flightNumber?: string;      // ✨ NOUVEAU
  confirmationCode?: string;  // ✨ NOUVEAU
  synced: boolean;
  createdAt: string;
}

/**
 * Confirmation d'embarquement - Retourné après scan réussi
 */
export interface BoardingConfirmation {
  // Identifiants
  id: string;                    // UUID unique de la confirmation
  scanId: string;                // UUID du scan raw_scans
  
  // Informations du passager
  passengerId: string;           // UUID du passager
  passagerName: string;          // Nom complet
  pnr?: string;                  // PNR (si extrait)
  
  // Informations du vol
  flightNumber: string;          // Ex: ET123
  departureAirport?: string;     // Code aéroport départ
  arrivalAirport?: string;       // Code aéroport arrivée
  departureTime?: string;        // Heure départ programmée
  
  // Informations d'embarquement
  seatNumber?: string;           // Numéro de siège si disponible
  gate?: string;                 // Porte d'embarquement
  
  // Timestamps
  scannedAt: string;             // Timestamp du scan
  boardedAt: string;             // Timestamp de l'embarquement confirmé
  
  // Utilisateur responsable
  boardedBy: string;             // ID de l'utilisateur qui a confirmé
  
  // Synchronisation
  syncStatus: 'pending' | 'synced' | 'failed';
  syncedAt?: string;
  syncError?: string;
}

/**
 * Réponse du serveur lors d'une confirmation d'embarquement
 */
export interface BoardingConfirmationResponse {
  success: boolean;
  message: string;
  confirmationId: string;
  boardedAt: string;
  syncStatus?: 'synced' | 'pending';
  error?: string;
}

/**
 * Données temporaires pour l'écran de scan
 */
export interface BoardingSccanState {
  scanned: boolean;
  processing: boolean;
  showScanner: boolean;
  lastScannedData: string | null;
  lastConfirmation: BoardingConfirmation | null;
  recentBoardings: BoardingConfirmation[];
  torchEnabled: boolean;
}

/**
 * Options de confirmation manuelle (fallback)
 */
export interface ManualBoardingInput {
  passengerId?: string;          // ID du passager
  pnr?: string;                  // PNR du passager
  flightNumber: string;          // Vol (requis)
  gate?: string;                 // Porte (optionnel)
  seatNumber?: string;           // Siège (optionnel)
}

/**
 * Historique d'embarquement pour un vol
 */
export interface BoardingSessionStats {
  flightNumber: string;
  departureTime: string;
  totalPassengers: number;
  boardedCount: number;
  boardingPercentage: number;
  sessionStarted: string;
  sessionEnded?: string;
  boardedBy: string;            // ID du responsable
}

/**
 * Erreur de scan d'embarquement
 */
export type BoardingErrorType = 
  | 'not_checked_in'
  | 'already_boarded'
  | 'invalid_flight'
  | 'wrong_airport'
  | 'flight_not_scheduled'
  | 'invalid_data'
  | 'scan_not_found'
  | 'unknown';

export interface BoardingError {
  type: BoardingErrorType;
  message: string;
  details?: string;
  severity: 'warning' | 'error';
}
