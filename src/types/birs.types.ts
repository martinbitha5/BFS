/**
 * Types pour le système BIRS (Baggage Irregularity Report System)
 * Gestion des bagages internationaux et réconciliation avec les rapports des compagnies
 */

/**
 * Statut d'un bagage international
 */
export type InternationalBaggageStatus = 
  | 'scanned'        // Scanné à l'arrivée, pas encore dans le système
  | 'reconciled'     // Réconcilié avec le rapport BIRS
  | 'unmatched'      // Pas trouvé dans le rapport BIRS
  | 'rush'           // Soute pleine - À réacheminer sur le prochain vol
  | 'pending';       // En attente de traitement

/**
 * Type de rapport BIRS selon la compagnie
 */
export type BirsReportType = 
  | 'ethiopian'      // Ethiopian Airlines (format texte avec colonnes)
  | 'turkish'        // Turkish Airlines (format manifeste)
  | 'generic';       // Format générique/autre compagnie

/**
 * Interface pour un bagage international scanné mais non reconnu
 */
export interface InternationalBaggage {
  id: string;
  tagNumber: string;                  // Tag scanné (peut être différent du tag attendu)
  scannedAt: string;                  // Date/heure du scan à l'arrivée
  scannedBy: string;                  // Agent qui a scanné
  airportCode: string;                // Code aéroport où le bagage a été scanné
  status: InternationalBaggageStatus; // Statut du bagage
  birsReportId?: string;              // ID du rapport BIRS associé (si réconcilié)
  passengerName?: string;             // Nom du passager (extrait du tag ou du rapport)
  pnr?: string;                       // PNR (si trouvé)
  flightNumber?: string;              // Numéro de vol
  origin?: string;                    // Aéroport d'origine
  weight?: number;                    // Poids du bagage (kg)
  remarks?: string;                   // Remarques
  reconciledAt?: string;              // Date/heure de réconciliation
  reconciledBy?: string;              // Qui a fait la réconciliation
  synced: boolean;                    // Synchronisé avec le serveur
  createdAt: string;
  updatedAt: string;
}

/**
 * Rapport BIRS reçu d'une compagnie aérienne
 */
export interface BirsReport {
  id: string;
  reportType: BirsReportType;         // Type de rapport (compagnie)
  flightNumber: string;               // Numéro de vol
  flightDate: string;                 // Date du vol
  origin: string;                     // Aéroport d'origine
  destination: string;                // Aéroport de destination
  airline: string;                    // Nom de la compagnie
  airlineCode?: string;               // Code IATA de la compagnie
  fileName: string;                   // Nom du fichier uploadé
  fileSize: number;                   // Taille du fichier (bytes)
  uploadedAt: string;                 // Date/heure d'upload
  uploadedBy: string;                 // Superviseur qui a uploadé
  airportCode: string;                // Code aéroport du superviseur
  totalBaggages: number;              // Nombre total de bagages dans le rapport
  reconciledCount: number;            // Nombre de bagages réconciliés
  unmatchedCount: number;             // Nombre de bagages non matchés
  processedAt?: string;               // Date/heure de traitement
  rawData: string;                    // Contenu brut du fichier (JSON stringifié)
  synced: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Item dans un rapport BIRS (ligne du rapport)
 */
export interface BirsReportItem {
  id: string;
  birsReportId: string;               // ID du rapport parent
  bagId: string;                      // Numéro d'étiquette/TAG
  passengerName: string;              // Nom du passager
  pnr?: string;                       // PNR
  seatNumber?: string;                // Numéro de siège
  class?: string;                     // Classe (Econ/Prio)
  psn?: string;                       // PSN (Passenger Sequence Number)
  weight?: number;                    // Poids en kg
  route?: string;                     // Route (ex: BRU*FIH)
  categories?: string;                // Catégories spéciales
  loaded?: boolean;                   // Chargé ou non (pour Turkish Airlines)
  received?: boolean;                 // Reçu ou non
  internationalBaggageId?: string;    // ID du bagage international associé
  reconciledAt?: string;              // Date/heure de réconciliation
  createdAt: string;
  updatedAt: string;
}

/**
 * Résultat d'une réconciliation
 */
export interface ReconciliationResult {
  reportId: string;
  totalItems: number;                 // Nombre total d'items dans le rapport
  matchedCount: number;               // Nombre de bagages matchés
  unmatchedScanned: number;           // Bagages scannés mais pas dans le rapport
  unmatchedReport: number;            // Items du rapport pas scannés
  matches: ReconciliationMatch[];     // Détails des matches
  unmatchedScannedBags: string[];     // IDs des bagages scannés non matchés
  unmatchedReportItems: string[];     // IDs des items du rapport non matchés
  processedAt: string;
  processedBy: string;
}

/**
 * Match entre un bagage scanné et un item du rapport
 */
export interface ReconciliationMatch {
  internationalBaggageId: string;
  birsReportItemId: string;
  matchScore: number;                 // Score de confiance du match (0-100)
  matchedOn: string[];                // Champs utilisés pour le match (ex: ['bagId', 'passengerName'])
}

/**
 * Données extraites d'un fichier Ethiopian Airlines
 */
export interface EthiopianBirsData {
  deviceId: string;
  route: string;
  totalBags: number;
  items: Array<{
    bagId: string;
    paxSurname: string;
    pnr: string;
    lseq: string;
    class: string;
    psn: string;
    kg: number;
    route: string;
    categories?: string;
  }>;
}

/**
 * Données extraites d'un fichier Turkish Airlines
 */
export interface TurkishBirsData {
  flightNumber: string;
  date: string;
  receptionAirport: string;
  totalBags: number;
  items: Array<{
    tag: string;
    name: string;
    poids: number;
    comment: string;
    loaded: boolean;
    received: boolean;
  }>;
}

/**
 * Options pour la réconciliation
 */
export interface ReconciliationOptions {
  matchOnBagId?: boolean;             // Match sur le numéro de bagage
  matchOnPassengerName?: boolean;     // Match sur le nom du passager
  matchOnPnr?: boolean;               // Match sur le PNR
  fuzzyMatch?: boolean;               // Activer le fuzzy matching pour les noms
  fuzzyThreshold?: number;            // Seuil de similarité (0-100)
}

/**
 * Statistiques BIRS pour le dashboard
 */
export interface BirsStatistics {
  totalInternationalBaggages: number;
  scannedBaggages: number;
  reconciledBaggages: number;
  unmatchedBaggages: number;
  pendingBaggages: number;
  totalReports: number;
  reportsThisWeek: number;
  reportsThisMonth: number;
  averageReconciliationRate: number;  // Pourcentage
  topOrigins: Array<{
    airport: string;
    count: number;
  }>;
  topAirlines: Array<{
    airline: string;
    count: number;
  }>;
}
