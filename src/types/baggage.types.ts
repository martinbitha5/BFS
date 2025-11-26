export type BaggageStatus = 'checked' | 'arrived';

export interface Baggage {
  id: string;
  passengerId: string;
  rfidTag: string;
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
  rfidTag: string; // Tag RFID ou numéro d'étiquette (ex: "4071 ET201605" ou "4071" ou "ET201605")
  flightNumber?: string; // Numéro de vol (ex: "ET73")
  flightDate?: string; // Date du vol (ex: "22NOV")
  pnr?: string; // PNR (ex: "HHJWNG")
  origin?: string; // Code aéroport origine (ex: "GMA")
  destination?: string; // Code aéroport destination (ex: "FIH")
  rawData: string; // Données brutes scannées
}
