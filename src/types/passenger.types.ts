export interface PassengerData {
  pnr: string; // PNR unique
  fullName: string; // Nom complet
  firstName: string; // Prénom
  lastName: string; // Nom de famille
  flightNumber: string; // Numéro de vol
  flightTime?: string; // Heure du vol (HH:MM)
  route: string; // Format: "FIH-JNB"
  departure: string; // Code aéroport départ (ex: "FIH")
  arrival: string; // Code aéroport arrivée (ex: "JNB")
  seatNumber?: string; // Numéro de siège
  ticketNumber?: string; // Numéro de ticket
  companyCode?: string; // Code compagnie (ex: "9U")
  airline?: string; // Nom compagnie
  baggageInfo?: {
    count: number; // Nombre de bagages
    baseNumber?: string; // Numéro de base
    expectedTags?: string[]; // Tags RFID attendus
  };
  rawData: string; // Données brutes du scan
  format: string; // Format détecté (ex: "AIR_CONGO")
}

export interface Passenger {
  id: string;
  pnr: string;
  fullName: string;
  lastName: string;
  firstName: string;
  flightNumber: string;
  flightTime?: string;
  airline?: string;
  airlineCode?: string;
  departure: string;
  arrival: string;
  route: string;
  companyCode?: string;
  ticketNumber?: string;
  seatNumber?: string;
  cabinClass?: string;
  baggageCount: number;
  baggageBaseNumber?: string;
  rawData?: string;
  format?: string;
  checkedInAt: string;
  checkedInBy: string;
  synced: boolean;
  createdAt: string;
  updatedAt: string;
}

