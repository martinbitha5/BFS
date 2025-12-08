/**
 * Parser de boarding pass BCBP (Bar Coded Boarding Pass)
 * Extrait les informations des raw scans pour l'export
 */

interface ParsedPassenger {
  fullName: string;
  firstName: string;
  lastName: string;
  pnr: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  seatNumber: string;
  sequenceNumber: string;
  boardingDate: string;
  rawData: string;
  scanType: string;
  checkinAt?: string;
  scanCount: number;
}

/**
 * Parse un raw scan de boarding pass
 */
export const parseBoardingPass = (rawScan: any): ParsedPassenger | null => {
  try {
    const data = rawScan.raw_data;
    
    // Format BCBP: M1SURNAME/FIRSTNAME PNR FROMTOAA FLIGHTNUMBER...
    // Exemple: M1MASIMANGO/ISSIAKA GREOIFLBU FIHMDKET 0080...
    
    // Extraire le nom (entre M1 et le PNR)
    const nameMatch = data.match(/^M[12]([A-Z\s\/]+?)(?:\s+)?([A-Z]{1,4})?([A-Z]{6})/);
    let fullName = 'UNKNOWN';
    let firstName = '';
    let lastName = '';
    let pnr = 'UNKNOWN';
    
    if (nameMatch) {
      const namePart = nameMatch[1].trim();
      fullName = namePart.replace(/\//g, ' ');
      
      // Séparer nom et prénom (format: NOM/PRENOM)
      if (namePart.includes('/')) {
        const parts = namePart.split('/');
        lastName = parts[0].trim();
        firstName = parts[1]?.trim() || '';
      }
      
      // Extraire le PNR (6 lettres majuscules)
      const pnrMatch = data.match(/([A-Z]{6})(?:\s+|\w{3})/);
      if (pnrMatch) {
        pnr = pnrMatch[1];
      }
    }
    
    // Extraire les codes aéroport (FROMTO - 6 caractères)
    const routeMatch = data.match(/([A-Z]{3})([A-Z]{3})/);
    let departure = 'UNKNOWN';
    let arrival = 'UNKNOWN';
    
    if (routeMatch) {
      departure = routeMatch[1];
      arrival = routeMatch[2];
    }
    
    // Extraire le numéro de vol (généralement après la route)
    const flightMatch = data.match(/([A-Z]{2})\s*(\d{3,4})/);
    let flightNumber = 'UNKNOWN';
    
    if (flightMatch) {
      flightNumber = `${flightMatch[1]} ${flightMatch[2]}`;
    }
    
    // Extraire le siège (format: 12A, 23B, etc.)
    const seatMatch = data.match(/\s(\d{1,3}[A-Z])\s/);
    const seatNumber = seatMatch ? seatMatch[1] : 'N/A';
    
    // Extraire le numéro de séquence
    const seqMatch = data.match(/\d{4}[A-Z]\d{3}[A-Z]/);
    const sequenceNumber = seqMatch ? seqMatch[0] : 'N/A';
    
    // Date d'embarquement (si disponible dans les données)
    const dateMatch = data.match(/(\d{3})/); // Julian date
    let boardingDate = 'N/A';
    if (dateMatch) {
      const julianDate = parseInt(dateMatch[1]);
      const year = new Date().getFullYear();
      const date = new Date(year, 0, julianDate);
      boardingDate = date.toLocaleDateString('fr-FR');
    }
    
    return {
      fullName,
      firstName,
      lastName,
      pnr,
      flightNumber,
      departure,
      arrival,
      seatNumber,
      sequenceNumber,
      boardingDate,
      rawData: data,
      scanType: rawScan.scan_type || 'boarding_pass',
      checkinAt: rawScan.checkin_at,
      scanCount: rawScan.scan_count || 1,
    };
  } catch (error) {
    console.error('Erreur lors du parsing:', error);
    return null;
  }
};

/**
 * Parse plusieurs raw scans
 */
export const parseRawScans = (rawScans: any[]): ParsedPassenger[] => {
  return rawScans
    .map(scan => parseBoardingPass(scan))
    .filter((parsed): parsed is ParsedPassenger => parsed !== null);
};
