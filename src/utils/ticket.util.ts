/**
 * Utilitaires pour le traitement des numéros de billet
 */

/**
 * Extrait le numéro de billet sans le code compagnie
 * Le numéro de billet est constitué de 10 chiffres
 * Il faut enlever le code compagnie au début si présent:
 * - Ethiopian Airlines (ET): 3 chiffres (071)
 * - Autres compagnies: 2 chiffres
 * 
 * @param ticketNumber - Numéro de billet complet (peut contenir le code compagnie)
 * @param companyCode - Code compagnie (optionnel, pour validation)
 * @returns Numéro de billet sans code compagnie (10 chiffres)
 */
export function extractTicketNumberWithoutCompanyCode(
  ticketNumber?: string,
  companyCode?: string
): string | undefined {
  if (!ticketNumber) {
    return undefined;
  }

  // Nettoyer le numéro de billet (enlever espaces, caractères non numériques)
  const cleaned = ticketNumber.replace(/\D/g, '');

  // Si le numéro fait 13 chiffres, c'est probablement Ethiopian (071 + 10 chiffres)
  if (cleaned.length === 13) {
    // Vérifier si c'est Ethiopian (code 071)
    if (cleaned.startsWith('071') || companyCode === 'ET') {
      return cleaned.substring(3);
    }
    // Sinon, enlever les 3 premiers chiffres par défaut
    return cleaned.substring(3);
  }

  // Si le numéro fait 12 chiffres, enlever les 2 premiers (code compagnie standard)
  if (cleaned.length === 12) {
    return cleaned.substring(2);
  }

  // Si le numéro fait 10 chiffres, le retourner tel quel (déjà sans code)
  if (cleaned.length === 10) {
    return cleaned;
  }

  // Si le numéro fait 11 chiffres et commence par le code compagnie
  if (cleaned.length === 11) {
    // Vérifier si les premiers chiffres correspondent au code compagnie
    if (companyCode) {
      const companyCodeNumeric = companyCode.replace(/\D/g, '');
      if (cleaned.startsWith(companyCodeNumeric)) {
        return cleaned.substring(companyCodeNumeric.length);
      }
    }
    // Sinon, enlever les 2 premiers chiffres par défaut
    return cleaned.substring(2);
  }

  // Si le numéro fait moins de 10 chiffres, le compléter avec des zéros
  if (cleaned.length < 10) {
    return cleaned.padStart(10, '0');
  }

  // Si le numéro fait plus de 13 chiffres, prendre les 10 derniers chiffres
  if (cleaned.length > 13) {
    return cleaned.substring(cleaned.length - 10);
  }

  // Par défaut, retourner les 10 derniers chiffres
  return cleaned.substring(Math.max(0, cleaned.length - 10));
}

/**
 * Extrait la date du vol depuis les données brutes du boarding pass
 * @param rawData - Données brutes du boarding pass
 * @returns Date formatée (format JJMMM) ou undefined
 */
export function extractFlightDateFromRawData(rawData: string): string | undefined {
  // Chercher tous les patterns de date (JJMMM) dans les données brutes
  // Format: "22NOV", "15DEC", etc.
  const validMonths = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const knownAirports = ['FIH', 'FKI', 'GOM', 'FBM', 'KWZ', 'KGA', 'MJM', 'GMA', 'MDK', 'KND', 'LFW', 'ABJ', 'NBO', 'EBB', 'CMN', 'IST', 'ADD', 'JNB', 'LAD', 'BZV', 'KGL'];
  
  // STRATEGY 1: Chercher les patterns DDMMMM explicites (22NOV, 15DEC, etc.)
  const allMatches = Array.from(rawData.matchAll(/(\d{2})([A-Z]{3})/g));
  
  // Trier les matches par position (de gauche à droite) pour prioriser ceux qui viennent après les codes aéroports
  const sortedMatches = allMatches.sort((a, b) => (a.index || 0) - (b.index || 0));
  
  for (const match of sortedMatches) {
    const day = parseInt(match[1], 10);
    const month = match[2].toUpperCase();
    const fullDate = match[0].toUpperCase();
    
    // Vérifier que c'est une date valide (jour entre 01-31, mois valide)
    // ET que le mois n'est pas un code aéroport
    if (day >= 1 && day <= 31 && validMonths.includes(month) && !knownAirports.includes(month)) {
      const matchIndex = match.index || 0;
      const before = rawData.substring(Math.max(0, matchIndex - 5), matchIndex);
      const after = rawData.substring(matchIndex + 5, Math.min(rawData.length, matchIndex + 10));
      
      // Vérifier que ce n'est pas directement collé à un code aéroport
      // Mais permettre si c'est après un code aéroport (comme FBM22NOV)
      const isDirectlyAfterAirport = knownAirports.some(apt => {
        const aptIndex = rawData.lastIndexOf(apt, matchIndex);
        return aptIndex >= 0 && aptIndex + apt.length === matchIndex;
      });
      
      // Si c'est directement après un code aéroport (comme FBM22NOV), c'est probablement une date
      if (isDirectlyAfterAirport) {
        return fullDate;
      }
      
      // Sinon, vérifier que ce n'est pas entouré de codes aéroports de manière suspecte
      const isSurroundedByAirports = knownAirports.some(apt => 
        (before.includes(apt) && after.match(/^\d/)) || // Avant aéroport + chiffres après
        (before.match(/\d$/) && after.includes(apt))    // Chiffres avant + aéroport après
      );
      
      if (!isSurroundedByAirports) {
        return fullDate;
      }
    }
  }
  
  // STRATEGY 2: Chercher le jour Julian (format IATA standard)
  // Format: "235Y" où 235 = jour de l'année (1-366)
  // Ce format se trouve généralement après le numéro de vol
  const julianPattern = /(\d{3})Y/g;
  const julianMatches = Array.from(rawData.matchAll(julianPattern));
  
  if (julianMatches.length > 0) {
    // Prendre le premier match (généralement le bon)
    const julianDay = parseInt(julianMatches[0][1], 10);
    
    // Convertir le jour Julian en date (jour + mois)
    // Utiliser l'année courante pour la conversion
    const date = convertJulianDayToDate(julianDay);
    if (date) {
      return date;
    }
  }
  
  // STRATEGY 3: Chercher patterns encodés Ethiopian (après "2A" + heure)
  // Format: "2A" + HHMM (heure) + JJ (jour) + autres données
  // Exemple: "2A0712154453" → heure=07:12, puis on cherche ailleurs
  // NOTE: Cette stratégie est moins fiable, utiliser Julian en priorité
  const ethiopianPattern = /2A\d{4}(\d{2})/g;
  const ethiopianMatches = Array.from(rawData.matchAll(ethiopianPattern));
  
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  for (const match of ethiopianMatches) {
    const day = parseInt(match[1], 10);
    
    // Valider: jour 01-31
    if (day >= 1 && day <= 31) {
      // Sans information du mois, on ne peut pas construire une date complète
      // Retourner undefined pour forcer l'utilisation d'autres stratégies
      continue;
    }
  }
  
  return undefined;
}

/**
 * Convertit un jour Julian (1-366) en date formatée (JJMMM)
 * @param julianDay - Jour de l'année (1-366)
 * @returns Date formatée (ex: "23AUG") ou undefined
 */
function convertJulianDayToDate(julianDay: number): string | undefined {
  if (julianDay < 1 || julianDay > 366) {
    return undefined;
  }
  
  // Utiliser l'année courante pour la conversion
  const currentYear = new Date().getFullYear();
  
  // Créer une date au 1er janvier de l'année courante
  const startDate = new Date(currentYear, 0, 1);
  
  // Ajouter le nombre de jours (julianDay - 1)
  startDate.setDate(startDate.getDate() + (julianDay - 1));
  
  // Extraire le jour et le mois
  const day = startDate.getDate();
  const monthIndex = startDate.getMonth();
  
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthName = monthNames[monthIndex];
  
  // Formater avec le jour sur 2 chiffres
  const dayStr = day.toString().padStart(2, '0');
  
  return `${dayStr}${monthName}`;
}

/**
 * Formate la date du vol depuis flightTime ou rawData
 * @param flightTime - Heure du vol (format HHMM ou HH:MM)
 * @param flightDate - Date du vol (optionnel, format JJMMM)
 * @param rawData - Données brutes du boarding pass (optionnel)
 * @returns Date formatée ou undefined
 */
export function formatFlightDate(flightTime?: string, flightDate?: string, rawData?: string): string | undefined {
  let dateStr = flightDate;
  
  // Essayer d'extraire depuis les données brutes si flightDate n'existe pas
  if (!dateStr && rawData) {
    dateStr = extractFlightDateFromRawData(rawData);
  }

  // Essayer d'extraire depuis flightTime si on n'a toujours pas la date
  if (!dateStr && flightTime) {
    const dateMatch = flightTime.match(/(\d{1,2}[A-Z]{3})(\d{4})?/);
    if (dateMatch) {
      dateStr = dateMatch[0];
    }
  }

  if (!dateStr) {
    return undefined;
  }

  // Formater la date: "22NOV" → "22 novembre" ou "22NOV2024" → "22 novembre 2024"
  return formatDateString(dateStr);
}

/**
 * Formate une chaîne de date au format DDMMMM ou DDMMMM YYYY
 * Exemple: "22NOV" → "22 Nov" ou "1DEC" → "01 Dec"
 * Format court anglais avec jour sur 2 chiffres
 */
function formatDateString(dateStr: string): string | undefined {
  if (!dateStr) return undefined;

  const months: { [key: string]: string } = {
    JAN: 'Jan', FEB: 'Feb', MAR: 'Mar', APR: 'Apr',
    MAY: 'May', JUN: 'Jun', JUL: 'Jul', AUG: 'Aug',
    SEP: 'Sep', OCT: 'Oct', NOV: 'Nov', DEC: 'Dec'
  };

  // Match format: "1NOV", "01NOV", "22NOV" ou "22NOV2024"
  const match = dateStr.match(/^(\d{1,2})([A-Z]{3})(\d{4})?$/);
  if (!match) {
    return dateStr; // Retourner tel quel si le format ne correspond pas
  }

  const day = match[1].padStart(2, '0'); // Toujours 2 chiffres (01, 02, etc.)
  const monthCode = match[2];
  const year = match[3];

  const monthName = months[monthCode.toUpperCase()];
  if (!monthName) {
    return dateStr; // Retourner tel quel si le mois n'est pas reconnu
  }

  if (year) {
    return `${day} ${monthName} ${year}`;
  } else {
    return `${day} ${monthName}`;
  }
}

/**
 * Extrait la classe cabine depuis les données brutes ou le numéro de siège
 * @param rawData - Données brutes du boarding pass
 * @param seatNumber - Numéro de siège (optionnel)
 * @returns Code de classe cabine (Y, C, J) ou undefined
 */
export function extractCabinClass(rawData?: string, seatNumber?: string): string | undefined {
  // Chercher dans les données brutes les codes de classe (Y, C, J) suivis d'un numéro de siège
  // Format: "Y013A", "C014C", "J001A", etc.
  if (rawData) {
    const cabinMatch = rawData.match(/([YCJ])(\d{3}[A-Z])/);
    if (cabinMatch) {
      return cabinMatch[1];
    }
    
    // Chercher aussi des patterns comme "311Y", "310C" (codes de classe)
    const codeMatch = rawData.match(/(\d{3})([YCJ])/);
    if (codeMatch) {
      return codeMatch[2];
    }
  }
  
  // Si on a un numéro de siège, essayer d'extraire depuis celui-ci
  // Certains formats incluent la classe dans le siège
  if (seatNumber) {
    const seatMatch = seatNumber.match(/^([YCJ])/);
    if (seatMatch) {
      return seatMatch[1];
    }
  }
  
  return undefined;
}

/**
 * Formate la classe cabine en texte lisible
 * @param cabinClass - Code de classe cabine (Y, C, J)
 * @returns Texte formaté (Économie, Business, Affaire) ou undefined
 */
export function formatCabinClass(cabinClass?: string): string | undefined {
  if (!cabinClass) {
    return undefined;
  }
  
  const classMap: Record<string, string> = {
    'Y': 'Économie',
    'C': 'Business',
    'J': 'Affaire',
  };
  
  return classMap[cabinClass.toUpperCase()] || cabinClass;
}

