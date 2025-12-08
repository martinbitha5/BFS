/**
 * Parser de boarding pass BCBP (Bar Coded Boarding Pass)
 * Extrait les informations des raw scans pour l'export
 * Basé sur la logique de l'API backend
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
 * Format: M1MASIMANGO/ISSIAKA GREOIFLBU FIHMDKET 0080 235Y031J0095 177...
 */
export const parseBoardingPass = (rawScan: any): ParsedPassenger | null => {
  try {
    const data = rawScan.raw_data;
    console.log('🔍 [Parser] Parsing raw data:', data.substring(0, 100) + '...');
    
    // ===== EXTRACTION DU NOM =====
    // Format: M1NOM/PRENOM [LETTRES_OPTIONNELLES]PNR
    let fullName = 'UNKNOWN';
    let firstName = '';
    let lastName = '';
    let pnr = 'UNKNOWN';
    
    // Chercher le pattern M1 ou M2 suivi du nom
    const namePattern = /^M[12]([A-Z\/\s]+?)(?:\s+)?([A-Z]{2,6})?([A-Z]{6})/;
    const nameMatch = data.match(namePattern);
    console.log('📝 [Parser] Name match:', nameMatch);
    
    if (nameMatch) {
      let namePart = nameMatch[1].trim();
      console.log('👤 [Parser] Name part extracted:', namePart);
      
      // Extraire le PNR (6 lettres avant ou après le nom)
      // Pattern pour trouver le PNR: 6 lettres consécutives
      const pnrCandidates = data.match(/\b([A-Z]{6})\b/g) || [];
      console.log('🎫 [Parser] PNR candidates:', pnrCandidates);
      
      // Le PNR est généralement le premier bloc de 6 lettres après le nom
      // Mais certains noms peuvent contenir des lettres qui ressemblent au PNR
      for (const candidate of pnrCandidates) {
        // Vérifier que ce n'est pas un code aéroport (3 lettres répétées)
        if (!candidate.match(/^([A-Z]{3})\1$/)) {
          pnr = candidate;
          console.log('✅ [Parser] PNR found:', pnr);
          break;
        }
      }
      
      // Nettoyer le nom (enlever le PNR s'il est collé)
      if (namePart.includes(pnr)) {
        namePart = namePart.replace(pnr, '').trim();
        console.log('🧹 [Parser] Name cleaned:', namePart);
      }
      
      // Séparer nom/prénom
      if (namePart.includes('/')) {
        const parts = namePart.split('/');
        lastName = parts[0].trim();
        firstName = parts[1]?.trim() || '';
        fullName = `${lastName} ${firstName}`.trim();
        console.log('👥 [Parser] Full name:', fullName);
      } else {
        fullName = namePart;
        lastName = namePart;
      }
    }
    
    // ===== EXTRACTION DE LA ROUTE (DÉPART/ARRIVÉE) =====
    // Format: FIHMDKET où FIH=départ, MDK=arrivée, ET=compagnie
    let departure = 'UNKNOWN';
    let arrival = 'UNKNOWN';
    let airline = '';
    
    // Chercher le pattern: 3 lettres (départ) + 3 lettres (arrivée) + 2 lettres (compagnie)
    const routePattern = /\s([A-Z]{3})([A-Z]{3})([A-Z]{2})\s/;
    const routeMatch = data.match(routePattern);
    console.log('🛫 [Parser] Route match:', routeMatch);
    
    if (routeMatch) {
      departure = routeMatch[1];
      arrival = routeMatch[2];
      airline = routeMatch[3];
      console.log(`✈️ [Parser] Route: ${departure} → ${arrival} (${airline})`);
    } else {
      // Fallback: chercher juste 6 lettres consécutives (3+3)
      const simpleRoutePattern = /\s([A-Z]{3})([A-Z]{3})[A-Z]{2}/;
      const simpleMatch = data.match(simpleRoutePattern);
      console.log('🛫 [Parser] Simple route match:', simpleMatch);
      if (simpleMatch) {
        departure = simpleMatch[1];
        arrival = simpleMatch[2];
      }
    }
    
    // ===== EXTRACTION DU NUMÉRO DE VOL =====
    // Format: ET 0080 (compagnie + 4 chiffres)
    let flightNumber = 'UNKNOWN';
    
    if (airline) {
      // Chercher les chiffres après la compagnie
      const flightPattern = new RegExp(`${airline}\\s*(\\d{3,4})`);
      const flightMatch = data.match(flightPattern);
      console.log('✈️ [Parser] Flight match:', flightMatch);
      if (flightMatch) {
        flightNumber = `${airline} ${flightMatch[1]}`;
        console.log('🎫 [Parser] Flight number:', flightNumber);
      }
    } else {
      // Fallback: chercher 2 lettres + 3-4 chiffres
      const genericFlightPattern = /\s([A-Z]{2})\s*(\d{3,4})/;
      const genericMatch = data.match(genericFlightPattern);
      if (genericMatch) {
        flightNumber = `${genericMatch[1]} ${genericMatch[2]}`;
      }
    }
    
    // ===== EXTRACTION DU SIÈGE =====
    // Format: 031J (3 chiffres + lettre)
    const seatPattern = /\s(\d{3}[A-Z])\s/;
    const seatMatch = data.match(seatPattern);
    const seatNumber = seatMatch ? seatMatch[1] : 'N/A';
    
    // ===== DATE D'EMBARQUEMENT =====
    // Format Julian: jour 235 de l'année = 23 août
    const julianPattern = /\s(\d{3})[A-Z]/;
    const julianMatch = data.match(julianPattern);
    let boardingDate = 'N/A';
    
    if (julianMatch) {
      const julianDay = parseInt(julianMatch[1]);
      const year = new Date().getFullYear();
      const date = new Date(year, 0); // 1er janvier
      date.setDate(julianDay);
      boardingDate = date.toLocaleDateString('fr-FR');
    }
    
    // ===== NUMÉRO DE SÉQUENCE =====
    const seqPattern = /(\d{4})/;
    const seqMatch = data.match(seqPattern);
    const sequenceNumber = seqMatch ? seqMatch[1] : 'N/A';
    
    const result = {
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
    
    console.log('✅ [Parser] Result:', { fullName, pnr, flightNumber, departure, arrival });
    return result;
  } catch (error) {
    console.error('❌ [Parser] Erreur lors du parsing:', error);
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
