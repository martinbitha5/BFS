export type BaggageStatus = 
  | 'checked'    // Enregistré au check-in
  | 'loaded'     // Chargé dans l'avion
  | 'in_transit' // En transit
  | 'arrived'    // Arrivé à destination
  | 'delivered'  // Livré au passager
  | 'rush'       // Soute pleine - À réacheminer sur le prochain vol
  | 'lost';      // Bagage perdu

export interface Baggage {
  id: string;
  passengerId: string;
  tagNumber: string;
  expectedTag?: string;
  status: BaggageStatus;
  checkedAt?: string;
  checkedBy?: string;
  arrivedAt?: string;
  arrivedBy?: string;
  synced: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Données extraites d'une étiquette de bagage RFID
 */
export interface BaggageTagData {
  passengerName: string; // Nom du passager (ex: "MOHILO LOUVE")
  tagNumber: string; // Tag RFID ou numéro d'étiquette (ex: "4071 ET201605" ou "4071" ou "ET201605")
  flightNumber?: string; // Numéro de vol (ex: "ET73")
  flightDate?: string; // Date du vol (ex: "22NOV")
  pnr?: string; // PNR (ex: "HHJWNG")
  origin?: string; // Code aéroport origine (ex: "GMA")
  destination?: string; // Code aéroport destination (ex: "FIH")
  baggageCount?: number; // Nombre total de bagages (ex: 5 dans "2/5")
  baggageSequence?: number; // Numéro de séquence du bagage (ex: 2 dans "2/5")
  rawData: string; // Données brutes scannées
}
