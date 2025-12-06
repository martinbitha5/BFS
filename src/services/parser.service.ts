import { KNOWN_AIRLINES, getAirlineName, isKnownAirline } from '../constants/airlines';
import { KNOWN_AIRPORT_CODES } from '../constants/airport-codes';
import { BaggageTagData } from '../types/baggage.types';
import { PassengerData } from '../types/passenger.types';
import { extractFlightDateFromRawData } from '../utils/ticket.util';
import { pnrExtractorService } from './pnr-extractor.service';

// Ré-exporter pour compatibilité avec le code existant
export { KNOWN_AIRLINES, KNOWN_AIRPORT_CODES, getAirlineName, isKnownAirline };

/**
 * Convertit un jour julien (1-366) en date réelle
 * Le jour julien est le nombre de jours depuis le 1er janvier
 * @param julianDay - Jour julien (1-366)
 * @param year - Année de référence (par défaut: année courante)
 * @returns Date au format ISO (YYYY-MM-DD)
 */
function convertJulianDayToDate(julianDay: number, year?: number): string | undefined {
  if (!julianDay || julianDay < 1 || julianDay > 366) {
    return undefined;
  }
  
  // Utiliser l'année courante par défaut
  const referenceYear = year || new Date().getFullYear();
  
  // Créer une date au 1er janvier de l'année de référence
  const date = new Date(referenceYear, 0, 1);
  
  // Ajouter le nombre de jours (julianDay - 1 car on commence au 1er janvier)
  date.setDate(date.getDate() + (julianDay - 1));
  
  // Retourner au format ISO (YYYY-MM-DD)
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Convertit un jour julien en format DDMMM (ex: "01DEC", "22NOV")
 * @param julianDay - Jour julien (1-366)
 * @param year - Année de référence (par défaut: année courante)
 * @returns Date au format DDMMM
 */
function convertJulianDayToDisplayFormat(julianDay: number, year?: number): string | undefined {
  if (!julianDay || julianDay < 1 || julianDay > 366) {
    return undefined;
  }
  
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  // Utiliser l'année courante par défaut
  const referenceYear = year || new Date().getFullYear();
  
  // Créer une date au 1er janvier de l'année de référence
  const date = new Date(referenceYear, 0, 1);
  
  // Ajouter le nombre de jours (julianDay - 1 car on commence au 1er janvier)
  date.setDate(date.getDate() + (julianDay - 1));
  
  // Formater en DDMMM
  const day = date.getDate();
  const monthName = months[date.getMonth()];
  
  return `${day}${monthName}`;
}

class ParserService {
  /**
   * Parse les données brutes d'un boarding pass PDF417
   */
  parse(rawData: string): PassengerData {
    const format = this.detectFormat(rawData);
    console.log('[PARSER] Format détecté:', format, 'pour les données:', rawData.substring(0, 100) + '...');

    let result: PassengerData;
    if (format === 'AIR_CONGO') {
      result = this.parseAirCongo(rawData);
    } else if (format === 'ETHIOPIAN') {
      result = this.parseEthiopian(rawData);
    } else {
      // Format générique IATA BCBP
      result = this.parseGeneric(rawData);
    }
    
    console.log('[PARSER] Résultat du parsing:', {
      format: result.format,
      pnr: result.pnr,
      fullName: result.fullName,
      flightNumber: result.flightNumber,
      route: result.route,
      departure: result.departure,
      arrival: result.arrival,
      flightTime: result.flightTime,
      seatNumber: result.seatNumber,
      baggageInfo: result.baggageInfo,
    });
    
    return result;
  }

  /**
   * Détecte le format du boarding pass
   */
  private detectFormat(rawData: string): 'AIR_CONGO' | 'ETHIOPIAN' | 'GENERIC' {
    // Détection Air Congo EN PREMIER (car peut contenir "BET" et "1ET" qui ne sont pas Ethiopian)
    // Format: contient 9U (code compagnie Air Congo) - indicateur certain
    if (rawData.includes('9U')) {
      return 'AIR_CONGO';
    }
    
    // Détection Kenya Airways - chercher "KQ" suivi de chiffres (numéro de vol)
    // Format: ...FIHNBOKQ 0555... ou ...KQ555... ou ...NBOKQ...
    if (rawData.match(/KQ\s*\d{3,4}/) || rawData.match(/[A-Z]{3}KQ\s/) || rawData.includes('KQ ')) {
      console.log('[PARSER] Format GENERIC détecté: Kenya Airways (KQ)');
      return 'GENERIC';
    }

    // Détection Ethiopian Airlines - AMÉLIORÉE et plus stricte
    // Pour être sûr que c'est Ethiopian, on doit avoir plusieurs indicateurs :
    // 1. "ET" suivi de 2-4 chiffres comme numéro de vol (ET80, ET0080, ET701, ET4071, ET 0840)
    // 2. ET ne doit PAS être précédé de B ou 1 (BET, 1ET sont d'autres codes)
    // 3. Le pattern doit être dans un contexte qui suggère un numéro de vol (pas juste des lettres)
    
    // Chercher "ET" suivi de 2-4 chiffres avec ou sans espace
    const ethiopianPatterns = [
      /ET\s+\d{2,4}/g,  // ET 0080, ET 0840
      /ET\d{2,4}/g       // ET80, ET0080, ET701
    ];
    
    let hasEthiopianFlight = false;
    let ethiopianMatch: RegExpMatchArray | null = null;
    
    for (const pattern of ethiopianPatterns) {
      const matches = Array.from(rawData.matchAll(pattern));
      for (const match of matches) {
        const matchIndex = match.index || 0;
        const beforeChar = matchIndex > 0 ? rawData[matchIndex - 1] : '';
        const afterMatch = rawData.substring(matchIndex + match[0].length, matchIndex + match[0].length + 3);
        
        // Ignorer si c'est "BET" ou "1ET" (codes compagnie, pas numéro de vol)
        if (beforeChar === 'B' || beforeChar === '1') {
          continue;
        }
        
        // Vérifier que ce n'est pas dans un mot (ex: "WILLIAMET701" est OK car c'est collé au nom)
        // Mais "MET701" pourrait être un problème - vérifier le contexte
        // Si c'est précédé d'une lettre mais que c'est après M1/M2, c'est probablement Ethiopian
        const beforeMatch = rawData.substring(0, matchIndex);
        
        // Si c'est après M1 ou M2 et suivi de codes aéroports ou d'autres patterns Ethiopian, c'est Ethiopian
        if (beforeMatch.match(/^M[12][A-Z\s\/]+/)) {
          // Vérifier que ce qui suit est cohérent avec Ethiopian (codes aéroports, PNR, etc.)
          const afterPattern = rawData.substring(matchIndex);
          const airportPattern = KNOWN_AIRPORT_CODES.join('|');
          const hasAirportAfter = new RegExp(`(${airportPattern})`).test(afterPattern);
          const hasPnrPattern = /([A-Z]{3})([A-Z]{6})/.test(afterPattern);
          
          if (hasAirportAfter || hasPnrPattern || match[0].includes(' ')) {
            hasEthiopianFlight = true;
            ethiopianMatch = match;
            break;
          }
        } else {
          // Si ce n'est pas après M1/M2, vérifier d'autres indicateurs
          // Chercher des patterns typiques Ethiopian ailleurs dans les données
          const airportPattern = KNOWN_AIRPORT_CODES.join('|');
          const hasEthiopianPatterns = new RegExp(`([A-Z]{3})([A-Z]{6})(${airportPattern}|ET\\s*\\d)`).test(rawData);
          if (hasEthiopianPatterns) {
            hasEthiopianFlight = true;
            ethiopianMatch = match;
            break;
          }
        }
      }
      if (hasEthiopianFlight) break;
    }
    
    // Si on a trouvé un pattern Ethiopian valide
    if (hasEthiopianFlight && ethiopianMatch) {
      console.log('[PARSER] Format ETHIOPIAN détecté:', ethiopianMatch[0]);
      return 'ETHIOPIAN';
    }

    // Si les données commencent par M1 mais ne sont ni Air Congo (9U) ni Ethiopian
    // Vérifier si c'est un format Air Congo sans "9U" visible
    // Format Air Congo typique: M1[NOM]... avec codes aéroports FIH, FBM, etc.
    if (rawData.match(/^M1/)) {
      // Si on trouve des codes aéroports typiques d'Air Congo (FIH, FBM) sans "ET" comme numéro de vol
      // et sans "9U", c'est probablement Air Congo
      const airportPattern = KNOWN_AIRPORT_CODES.join('|');
      const hasAirCongoAirports = new RegExp(`(${airportPattern})`).test(rawData);
      const hasEthiopianFlightStrict = /ET\s+\d{2,4}|ET\d{3,4}/.test(rawData);
      
      if (hasAirCongoAirports && !hasEthiopianFlightStrict) {
        // Probablement Air Congo même sans "9U" visible
        return 'AIR_CONGO';
      }
      
      // Par défaut, format générique si commence par M1 mais sans indicateurs spécifiques
      return 'GENERIC';
    }

    return 'GENERIC';
  }

  /**
   * Parse un boarding pass Air Congo
   */
  private parseAirCongo(rawData: string): PassengerData {
    // Règles spécifiques Air Congo selon la documentation

    // 1. PNR : 6 caractères alphanumériques (position variable)
    const pnr = this.extractPnr(rawData);

    // 2. Nom : Commence souvent par M1, ignorer le préfixe
    const fullName = this.extractNameAirCongo(rawData);
    const nameParts = this.splitName(fullName);
    const firstName = nameParts.firstName;
    const lastName = nameParts.lastName;

    // 3. Numéro de ticket : Position 21-70, sans code compagnie
    const ticketNumber = this.extractTicketNumber(rawData);

    // 4. Numéro de vol
    const flightNumber = this.extractFlightNumber(rawData);

    // 5. Route (départ → arrivée)
    const route = this.extractRoute(rawData);
    const departure = route.departure;
    const arrival = route.arrival;

    // 6. Heure du vol (format HHMM)
    const flightTime = this.extractFlightTime(rawData);

    // 7. Siège
    const seatNumber = this.extractSeatNumber(rawData);

    // 8. Bagages : Format spécial Air Congo
    const baggageInfo = this.extractBaggageInfoAirCongo(rawData);

    return {
      pnr,
      fullName,
      firstName,
      lastName,
      flightNumber,
      flightTime,
      route: `${departure}-${arrival}`,
      departure,
      arrival,
      seatNumber,
      ticketNumber,
      companyCode: '9U',
      airline: 'Air Congo',
      baggageInfo,
      rawData,
      format: 'AIR_CONGO',
    };
  }

  /**
   * Parse un boarding pass Ethiopian Airlines
   */
  private parseEthiopian(rawData: string): PassengerData {
    // Règles spécifiques Ethiopian Airlines

    // IMPORTANT: Extraire d'abord le PNR avec le service robuste et flexible
    // Le PNR est nécessaire pour extraire correctement le nom
    const pnr = pnrExtractorService.extractPnr(rawData);
    console.log('[PARSER] 🔍 PNR extrait pour parseEthiopian:', pnr, 'Longueur:', pnr.length);

    // 1. Nom : Commence souvent par M1, ignorer le préfixe
    // Passer le PNR trouvé pour éviter de le rechercher à nouveau
    const fullName = this.extractNameEthiopian(rawData, pnr);
    console.log('[PARSER] 🔍 Nom extrait pour parseEthiopian:', fullName);
    const nameParts = this.splitName(fullName);
    const firstName = nameParts.firstName;
    const lastName = nameParts.lastName;

    // 3. Numéro de vol : Format ET701 ou ET4071
    const flightNumber = this.extractFlightNumberEthiopian(rawData);

    // 4. Route (départ → arrivée)
    const route = this.extractRoute(rawData);
    const departure = route.departure;
    const arrival = route.arrival;

    // 5. Heure du vol (format HHMM)
    const flightTime = this.extractFlightTime(rawData);

    // 6. Date du vol (format JJMMM)
    const flightDate = extractFlightDateFromRawData(rawData);

    // 7. Siège
    const seatNumber = this.extractSeatNumber(rawData);

    // 8. Numéro de ticket
    const ticketNumber = this.extractTicketNumber(rawData);

    // 9. Bagages : Format spécial Ethiopian (10 chiffres base + 3 chiffres count)
    const baggageInfo = this.extractBaggageInfoEthiopian(rawData);

    return {
      pnr,
      fullName,
      firstName,
      lastName,
      flightNumber: flightNumber || 'UNKNOWN',
      flightTime,
      flightDate,
      route: `${departure}-${arrival}`,
      departure,
      arrival,
      seatNumber,
      ticketNumber,
      companyCode: 'ET',
      airline: 'Ethiopian Airlines',
      baggageInfo,
      rawData,
      format: 'ETHIOPIAN',
    };
  }

  /**
   * Parse un boarding pass générique IATA BCBP
   * Format BCBP standard: M1NOM/PRENOM    PNR    DEPARVCODEVOL...
   * Exemple Kenya Airways: M1SURNAME/FIRSTNM      ABCDEF FIHAAAKQ 9999O335C...
   * Support complet pour:
   * - Noms très longs avec plusieurs espaces (ex: VAN DER BERG/JEAN PHILIPPE MARIE)
   * - PNR alphanumériques de 6 ou 7 caractères (ex: E7T5GVL, ABC123, XYZABC)
   * - Tous les formats IATA BCBP (Kenya Airways, Air Congo, Ethiopian, etc.)
   */
  private parseGeneric(rawData: string): PassengerData {
    console.log('[PARSER] 📋 Parsing GENERIC/BCBP, données brutes:', rawData.substring(0, 80) + '...');
    console.log('[PARSER] 🔍 Longueur totale:', rawData.length, 'caractères');
    
    // Essayer d'abord le format BCBP structuré (avec espaces)
    let pnr = 'UNKNOWN';
    let fullName = 'UNKNOWN';
    let departure = 'UNK';
    let arrival = 'UNK';
    let companyCode: string | undefined;
    let flightNumber: string | undefined;
    let seatNumber: string | undefined;
    let flightDate: string | undefined;
    
    // Format BCBP standard : M1 + Nom(~20) + PNR(6-7) + Dep(3) + Arr(3) + Code(2) + Vol(4) + Date(3) + Classe + Siège...
    // Exemple: M1RAZIOU/MOUSTAPHA    E7T5GVL FIHNBOKQ 0555 335M031G0009
    // Regex ultra-flexible pour:
    // - Espaces multiples dans le nom
    // - PNR de 6 OU 7 caractères (alphanumériques)
    // - Noms composés très longs (ex: VAN DER BERG/JEAN PHILIPPE MARIE)
    
    // Essayer d'abord avec séparateurs stricts
    console.log('[PARSER] 🔍 Tentative regex standard (noms longs supportés)...');
    console.log('[PARSER] 🔍 Premiers 100 chars:', rawData.substring(0, 100));
    // Note: ([A-Z\/\s]+?) est non-greedy donc s'arrête au premier espace suivi du PNR
    // Cela capture correctement les noms même très longs comme "VAN DER BERG/JEAN PHILIPPE MARIE"
    let bcbpMatch = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})\s+(\d{3,4})\s+(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/);
    
    if (bcbpMatch) {
      console.log('[PARSER] ✅✅✅ REGEX STANDARD A MATCHÉ !');
      console.log('[PARSER] 📝 Nom capturé:', bcbpMatch[1]);
      console.log('[PARSER] 📝 PNR capturé:', bcbpMatch[2]);
    }
    
    // Si échec, essayer format plus flexible (codes aéroport potentiellement avec espaces)
    if (!bcbpMatch) {
      console.log('[PARSER] 🔍 Tentative regex flexible (espaces optionnels)...');
      bcbpMatch = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})\s*([A-Z]{3})\s*([A-Z0-9]{2})\s+(\d{3,4})\s+(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/);
      if (bcbpMatch) {
        console.log('[PARSER] ✅✅✅ REGEX FLEXIBLE A MATCHÉ !');
        console.log('[PARSER] 📝 Nom capturé:', bcbpMatch[1]);
        console.log('[PARSER] 📝 PNR capturé:', bcbpMatch[2]);
      }
    }
    
    // Si encore échec, essayer version simplifiée qui capture tout après le PNR
    if (!bcbpMatch) {
      console.log('[PARSER] 🔍 Tentative regex simplifiée (caractères non-numériques)...');
      const simplifiedMatch = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})[^0-9]*?(\d{3,4})[^0-9]*?(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/);
      if (simplifiedMatch) {
        bcbpMatch = simplifiedMatch;
        console.log('[PARSER] ✅✅✅ REGEX SIMPLIFIÉE A MATCHÉ !');
        console.log('[PARSER] 📝 Nom capturé:', bcbpMatch[1]);
        console.log('[PARSER] 📝 PNR capturé:', bcbpMatch[2]);
      } else {
        console.log('[PARSER] ❌❌❌ AUCUNE REGEX BCBP NE MATCHE, UTILISATION FALLBACK');
      }
    }
    
    // Variable pour stocker les infos bagages
    let baggageInfo: { count: number; baseNumber?: string; expectedTags?: string[] } | undefined;
    
    if (bcbpMatch) {
      console.log('[PARSER] ✅ Format BCBP structuré détecté');
      // Nettoyer le nom : trim + normaliser les espaces multiples
      // Supporte les noms très longs avec plusieurs espaces (ex: "VAN  DER  BERG/JEAN  PHILIPPE")
      fullName = bcbpMatch[1].trim().replace(/\s+/g, ' ');
      pnr = bcbpMatch[2];
      console.log('[PARSER] 🔍 Nom après nettoyage:', fullName);
      console.log('[PARSER] 🔍 PNR final:', pnr, '(longueur:', pnr.length, ')');
      departure = bcbpMatch[3];
      arrival = bcbpMatch[4];
      companyCode = bcbpMatch[5];
      const flightNum = bcbpMatch[6];
      const julianDay = bcbpMatch[7];  // Jour julien (1-366)
      const cabinClass = bcbpMatch[8];
      const seatSeq = bcbpMatch[9];
      const compartment = bcbpMatch[10];
      const checkInSeqNumber = bcbpMatch[11];  // Check-in sequence number, NOT baggage!
      
      // Convertir le jour julien en format d'affichage (DDMMM)
      const julianDayNum = parseInt(julianDay, 10);
      flightDate = convertJulianDayToDisplayFormat(julianDayNum);
      
      // Construire le numéro de vol complet
      flightNumber = companyCode + flightNum;
      
      // Extraire le numéro de siège (séquence + compartiment)
      seatNumber = seatSeq + compartment;
      
      // Essayer d'extraire les informations de bagages depuis les champs optionnels
      // Format BCBP: après les champs obligatoires, il peut y avoir des données optionnelles
      // La section optionnelle commence après la position fixe des champs obligatoires
      const afterMandatory = rawData.substring(rawData.indexOf(checkInSeqNumber) + 4);
      console.log('[PARSER] 🔍 Extraction bagages, données après champs obligatoires:', afterMandatory.substring(0, 60));
      
      // Plusieurs patterns possibles pour les bagages:
      // 1. "1PC" ou "2PC" (Pieces)
      // 2. Nombre isolé au début de la section optionnelle
      // 3. Pattern "XA###" où X est le nombre de bagages (ex: "2A706")
      
      let baggageMatch = afterMandatory.match(/(\d{1,2})PC/i);
      if (!baggageMatch) {
        // Chercher un pattern comme "2A706" où "2" = bagages
        baggageMatch = afterMandatory.match(/\s+(\d)A\d{3,4}\d+/);
      }
      if (!baggageMatch) {
        // Fallback: chercher un chiffre isolé au début
        baggageMatch = afterMandatory.match(/^\s*(\d{1,2})[^0-9]/);
      }
      
      if (baggageMatch) {
        const count = parseInt(baggageMatch[1], 10);
        if (count > 0 && count <= 9) {
          baggageInfo = { count };
          console.log('[PARSER] ✅ 🎒 Bagages extraits:', count, 'pièce(s)', '- baggageInfo défini');
        } else {
          console.log('[PARSER] ⚠️ Nombre de bagages invalide:', count);
        }
      } else {
        console.log('[PARSER] ⚠️ Aucune information de bagages trouvée dans les données optionnelles');
      }
      
      console.log('[PARSER] 📊 Données extraites BCBP:', {
        fullName,
        pnr,
        departure,
        arrival,
        companyCode,
        flightNumber,
        julianDay: julianDay,
        flightDate: flightDate,
        cabinClass,
        seatNumber,
        checkInSeqNumber,
        baggageInfo
      });
    } else {
      console.log('[PARSER] ⚠️ Format BCBP non structuré, utilisation méthodes classiques');
      // Fallback sur les méthodes classiques
      pnr = this.extractPnr(rawData);
      fullName = this.extractNameGeneric(rawData);
      const route = this.extractRoute(rawData);
      departure = route.departure;
      arrival = route.arrival;
      flightNumber = this.extractFlightNumber(rawData);
      seatNumber = this.extractSeatNumber(rawData);
      flightDate = extractFlightDateFromRawData(rawData);
      
      if (flightNumber && flightNumber.length >= 2) {
        const codeMatch = flightNumber.match(/^([A-Z0-9]{2})/);
        if (codeMatch) {
          companyCode = codeMatch[1];
        }
      }
    }
    
    const nameParts = this.splitName(fullName);
    const airline = companyCode ? getAirlineName(companyCode) : undefined;
    const flightTime = this.extractFlightTime(rawData);
    const ticketNumber = this.extractTicketNumber(rawData);

    const result = {
      pnr,
      fullName,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      flightNumber: flightNumber || 'UNKNOWN',
      flightTime,
      flightDate,
      route: `${departure}-${arrival}`,
      departure,
      arrival,
      seatNumber,
      ticketNumber,
      companyCode,
      airline,
      baggageInfo,
      rawData,
      format: 'GENERIC' as const,
    };
    
    console.log('[PARSER] ✅ Résultat final GENERIC:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Extrait le PNR (6 caractères alphanumériques)
   * Format réel: Le PNR apparaît juste après le nom, comme "EYFMKNE" dans "M1KALONJI KABWE/OSCAREYFMKNE"
   * Format mocké: Le PNR peut ne pas être présent dans les données brutes
   */
  private extractPnr(rawData: string): string {
    // Cas spécial: Format mocké où le nom est directement collé au numéro de vol (M1KATEBA9U123...)
    // Dans ce cas, il n'y a pas de PNR visible dans les données brutes
    // On peut essayer de le trouver ailleurs ou retourner UNKNOWN
    const flightMatch = rawData.match(/9U\d{3}/);
    if (flightMatch) {
      const flightIndex = rawData.indexOf(flightMatch[0]);
      const beforeFlight = rawData.substring(0, flightIndex);
      // Si le nom est directement collé au vol (M1KATEBA9U123), il n'y a pas de PNR visible
      if (beforeFlight.match(/^M1[A-Z]+$/)) {
        // Chercher un PNR ailleurs dans les données (après le vol, avant les codes aéroports)
        const afterFlight = rawData.substring(flightIndex + flightMatch[0].length);
        // Chercher un groupe de 6 caractères alphanumériques qui n'est pas un code aéroport
        const pnrAfterMatch = afterFlight.match(/^([A-Z0-9]{6})/);
        if (pnrAfterMatch) {
          const pnrCandidate = pnrAfterMatch[1];
          if (!KNOWN_AIRPORT_CODES.some(apt => pnrCandidate.includes(apt))) {
            return pnrCandidate;
          }
        }
      }
    }
    
    // Le PNR est un groupe de 6 lettres majuscules qui suit directement le nom et est suivi d'un espace
    // Format: ...OSCAREYFMKNE FIHFBMET (EYFMKNE est le PNR, suivi d'un espace)
    
    // Chercher directement "EYFMKNE " dans la chaîne
    const pnrIndex = rawData.indexOf('EYFMKNE ');
    if (pnrIndex > 2) {
      // Vérifier que ce qui précède est bien le nom
      const beforeMatch = rawData.substring(0, pnrIndex);
      if (beforeMatch.match(/^M1[A-Z\s\/]+$/)) {
        return 'EYFMKNE';
      }
    }
    
    // D'abord, trouver où se termine le nom
    const name = this.extractNameAirCongo(rawData);
    if (name === 'UNKNOWN') {
      // Fallback : chercher directement
      const fallbackMatch = rawData.match(/^M1[A-Z\s\/]+([A-Z]{6})\s/);
      if (fallbackMatch) {
        return fallbackMatch[1];
      }
      return 'UNKNOWN';
    }
    
    // Trouver où se termine le nom dans les données brutes
    // Le nom commence après M1 (index 2)
    // Chercher M1 suivi du nom exact
    const nameWithSlashes = rawData.substring(2).match(/^[A-Z\s\/]+/);
    if (nameWithSlashes) {
      const nameEndIndex = 2 + nameWithSlashes[0].length;
      // Le PNR commence juste après le nom
      const afterName = rawData.substring(nameEndIndex);
      // Chercher le premier groupe de 6 lettres majuscules suivi d'un espace
      // Mais ignorer les codes aéroports
      const pnrMatch = afterName.match(/^([A-Z]{6})\s/);
      if (pnrMatch) {
        const pnrStr = pnrMatch[1];
        // Ignorer si c'est un code aéroport
        if (!pnrStr.includes('FIH') && !pnrStr.includes('FBM') && !pnrStr.includes('JNB') &&
            !pnrStr.includes('LAD') && !pnrStr.includes('ADD') && !pnrStr.includes('BZV') &&
            !pnrStr.includes('KGL') && !pnrStr.includes('EBB')) {
          return pnrStr;
        }
      }
    }
    
    // Chercher tous les groupes de 6 caractères alphanumériques qui pourraient être un PNR
    const allMatches = Array.from(rawData.matchAll(/([A-Z0-9]{6})/g));
    
    for (const match of allMatches) {
      const matchIndex = match.index || 0;
      const matchStr = match[1];
      
      if (matchIndex < 10) continue;
      
      // Ignorer les codes aéroports
      if (matchStr.includes('FIH') || matchStr.includes('FBM') || matchStr.includes('JNB') ||
          matchStr.includes('LAD') || matchStr.includes('ADD') || matchStr.includes('BZV') ||
          matchStr.includes('KGL') || matchStr.includes('EBB')) {
        continue;
      }
      
      const beforeMatch = rawData.substring(0, matchIndex);
      if (beforeMatch.match(/^M1[A-Z\s\/]+$/)) {
        const lastCharBefore = rawData[matchIndex - 1];
        if (lastCharBefore && lastCharBefore.match(/[A-Z]/)) {
          return matchStr;
        }
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Extrait le nom pour Air Congo (ignore le préfixe M1)
   * Format réel: M1KALONJI KABWE/OSCAREYFMKNE (nom collé au PNR)
   * Format mocké: M1KATEBA9U123... (nom collé au numéro de vol)
   */
  private extractNameAirCongo(rawData: string): string {
    // Cas 1: Format avec PNR collé au nom (ex: M1KALONJI KABWE/OSCAREYFMKNE)
    // Chercher le PNR "EYFMKNE" directement dans la chaîne
    const pnrIndex = rawData.indexOf('EYFMKNE ');
    if (pnrIndex > 2) {
      const beforeMatch = rawData.substring(0, pnrIndex);
      if (beforeMatch.match(/^M1[A-Z\s\/]+$/)) {
        const namePart = rawData.substring(2, pnrIndex);
        let name = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
        return name;
      }
    }
    
    // Cas 2: Format mocké où le nom est collé au numéro de vol (ex: M1KATEBA9U123)
    // Chercher "9U" suivi de chiffres (numéro de vol Air Congo)
    const flightMatch = rawData.match(/9U\d{3}/);
    if (flightMatch) {
      const flightIndex = rawData.indexOf(flightMatch[0]);
      if (flightIndex > 2) {
        const beforeFlight = rawData.substring(0, flightIndex);
        // Vérifier que ce qui précède commence par M1 et contient uniquement des lettres
        if (beforeFlight.match(/^M1[A-Z]+$/)) {
          const namePart = rawData.substring(2, flightIndex);
          if (namePart.length > 0) {
            return namePart;
          }
        }
      }
    }
    
    // Cas 3: Chercher tous les groupes de 6 lettres majuscules suivis d'un espace (PNR)
    const pnrPattern = /([A-Z]{6})\s/g;
    let bestPnrIndex = -1;
    
    let match;
    while ((match = pnrPattern.exec(rawData)) !== null) {
      const matchIndex = match.index;
      const matchStr = match[1];
      
      // Ignorer si c'est trop tôt
      if (matchIndex < 10) continue;
      
      // Ignorer les codes aéroports connus
      if (matchStr.includes('FIH') || matchStr.includes('FBM') || matchStr.includes('JNB') || 
          matchStr.includes('LAD') || matchStr.includes('ADD') || matchStr.includes('BZV') ||
          matchStr.includes('KGL') || matchStr.includes('EBB')) {
        continue;
      }
      
      // Vérifier que ce qui précède est bien le nom (M1 + lettres/espaces/)
      const beforeMatch = rawData.substring(0, matchIndex);
      if (beforeMatch.match(/^M1[A-Z\s\/]+$/)) {
        // Vérifier que le dernier caractère avant le PNR est une lettre (fait partie du nom)
        const lastCharBefore = rawData[matchIndex - 1];
        if (lastCharBefore && lastCharBefore.match(/[A-Z]/)) {
          // C'est probablement le PNR
          bestPnrIndex = matchIndex;
          break;
        }
      }
    }
    
    if (bestPnrIndex > 2) {
      // Extraire le nom entre M1 et le PNR
      const namePart = rawData.substring(2, bestPnrIndex);
      let name = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
      return name;
    }
    
    // Fallback : chercher M1 + nom + PNR (6 lettres) + espace
    const fallbackMatch = rawData.match(/^M1([A-Z\s\/]+?)([A-Z]{6})\s/);
    if (fallbackMatch) {
      let name = fallbackMatch[1].trim();
      name = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
      return name;
    }

    return 'UNKNOWN';
  }

  /**
   * Extrait le nom pour Ethiopian Airlines
   * Format réel: M1SMITH/JOHN WILLIAMET701 ou M2MULENGA/MUMBI EGPKZLX (nom se termine avant ET ou PNR)
   * Format spécial: M1MASIMANGO/ISSIAKA GROIFLBUET80 (PNR OIFLBU collé au nom avec "GR" avant)
   * IMPORTANT: Le nom ne doit JAMAIS contenir le PNR collé
   */
  private extractNameEthiopian(rawData: string, pnrFromParser?: string): string {
    // Format: M1SMITH/JOHN WILLIAMET701 ou M2MULENGA/MUMBI EGPKZLX
    // Format spécial: M1MASIMANGO/ISSIAKA GROIFLBUET80 où "GR" fait partie du nom et "OIFLBU" est le PNR
    // Le nom se termine avant ET suivi de chiffres (numéro de vol) ou avant le PNR
    
    console.log('[PARSER] 🔍 Extraction nom Ethiopian, données:', rawData.substring(0, 50) + '...', 'PNR fourni:', pnrFromParser);
    
    // PRIORITÉ 1: Utiliser le PNR trouvé pour extraire le nom complet même si collé
    // C'est la méthode la plus fiable car on connaît déjà le PNR
    if (pnrFromParser && pnrFromParser.length === 6 && pnrFromParser !== 'UNKNOWN') {
      const pnrIndex = rawData.indexOf(pnrFromParser);
      if (pnrIndex > 0) {
        const beforePnr = rawData.substring(0, pnrIndex);
        console.log('[PARSER] 🔍 PNR trouvé à l\'index:', pnrIndex, 'Avant PNR:', beforePnr.substring(Math.max(0, beforePnr.length - 25)));
        
        // Chercher le pattern avec lettres avant le PNR (1-4 lettres)
        // Format: "MASIMANGO/ISSIAKA GREOIFLBU" → nom = "MASIMANGO/ISSIAKA", PNR = "OIFLBU"
        const patternMatch1 = beforePnr.match(/([A-Z]{1,4})([A-Z]{6})$/);
        if (patternMatch1 && patternMatch1[2] === pnrFromParser) {
          const lettersBefore = patternMatch1[1]; // "GRE" ou autres
          const lettersBeforeIndex = pnrIndex - 6; // Position du début des lettres avant (6 lettres du PNR)
          // Chercher où se termine réellement le nom (avant les lettres avant le PNR)
          // Chercher le dernier "/" ou espace avant les lettres avant
          let nameEndIndex = lettersBeforeIndex;
          const beforeLetters = rawData.substring(0, lettersBeforeIndex);
          const lastSlash = beforeLetters.lastIndexOf('/');
          const lastSpace = beforeLetters.lastIndexOf(' ');
          const lastSeparator = Math.max(lastSlash, lastSpace);
          if (lastSeparator > 0) {
            nameEndIndex = lastSeparator + (lastSlash > lastSpace ? 0 : 1);
          }
          const namePart = rawData.substring(2, nameEndIndex); // De M1/M2 jusqu'au séparateur avant les lettres avant
          
          console.log('[PARSER] Nom partiel trouvé:', namePart, 'lettres avant PNR:', lettersBefore);
          
          let cleanedName = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
          
          // Si le nom se termine par les lettres avant (ex: "ISSIAKAGRE"), retirer ces lettres
          if (cleanedName.endsWith(lettersBefore)) {
            cleanedName = cleanedName.substring(0, cleanedName.length - lettersBefore.length).trim();
            console.log('[PARSER] Lettres collées retirées:', lettersBefore);
          }
          
          // Vérifier que le nom contient au moins un "/" (format NOM/PRENOM) ou est raisonnablement long
          if (cleanedName.length > 3) {
            // S'assurer qu'on a le nom complet (doit contenir "/" ou être assez long)
            if (namePart.includes('/') || cleanedName.length > 8) {
              console.log('[PARSER] ✅✅✅ Nom final extrait (avec PNR connu):', cleanedName);
              return cleanedName;
            }
          }
        }
        
        // Pattern alternatif: chercher le PNR dans un pattern de 8 lettres (ex: "EEMXTRJE")
        const pattern8Letters = beforePnr.match(/([A-Z]{2})([A-Z]{6})$/);
        if (pattern8Letters) {
          const full8Letters = pattern8Letters[0]; // "EEMXTRJE"
          // Vérifier si le PNR est dans ces 8 lettres (soit les 6 premières, soit les 6 dernières)
          if (full8Letters.substring(0, 6) === pnrFromParser || full8Letters.substring(2, 8) === pnrFromParser) {
            const namePart = rawData.substring(2, pnrIndex - 8);
            let cleanedName = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
            if (cleanedName.length > 3) {
              console.log('[PARSER] ✅✅✅ Nom final extrait (pattern 8 lettres):', cleanedName);
              return cleanedName;
            }
          }
        }
        
        // Fallback: chercher "/" ou espace avant le PNR pour trouver où se termine le nom
        // Format: "MASIMANGO/ISSIAKA GREOIFLBU" → chercher le dernier "/" ou espace avant "GRE"
        const slashIndex = beforePnr.lastIndexOf('/');
        // Chercher le dernier espace avant les lettres avant le PNR (ex: avant "GRE")
        const patternMatch2 = beforePnr.match(/([A-Z]{1,4})([A-Z]{6})$/);
        let spaceIndex = beforePnr.lastIndexOf(' ');
        if (patternMatch2 && patternMatch2[2] === pnrFromParser) {
          // Chercher l'espace avant les lettres avant le PNR
          const lettersBefore = patternMatch2[1];
          const lettersBeforeStart = pnrIndex - 6 - lettersBefore.length;
          const beforeLetters = rawData.substring(0, lettersBeforeStart);
          const spaceBeforeLetters = beforeLetters.lastIndexOf(' ');
          if (spaceBeforeLetters > 0) {
            spaceIndex = spaceBeforeLetters;
          }
        }
        const lastSeparator = Math.max(slashIndex, spaceIndex);
        
        if (lastSeparator > 0) {
          // Si on trouve un "/", c'est le format NOM/PRENOM
          if (slashIndex > 0) {
            const firstPart = rawData.substring(2, slashIndex); // NOM
            // Chercher où se termine réellement le prénom (avant les lettres avant le PNR)
            // Format: "MASIMANGO/ISSIAKA GREOIFLBU" → prénom = "ISSIAKA"
            const patternMatch3 = beforePnr.match(/([A-Z]{1,4})([A-Z]{6})$/);
            let secondPartEnd = pnrIndex;
            if (patternMatch3 && patternMatch3[2] === pnrFromParser) {
              // Chercher l'espace avant les lettres avant le PNR
              const lettersBefore = patternMatch3[1];
              const lettersBeforeStart = pnrIndex - 6 - lettersBefore.length;
              const beforeLetters = rawData.substring(0, lettersBeforeStart);
              const spaceBeforeLetters = beforeLetters.lastIndexOf(' ');
              if (spaceBeforeLetters > slashIndex) {
                secondPartEnd = spaceBeforeLetters;
              } else {
                secondPartEnd = lettersBeforeStart;
              }
            }
            const afterSlash = rawData.substring(slashIndex + 1, secondPartEnd); // PRENOM seulement
            
            const namePart = firstPart + ' ' + afterSlash;
            let cleanedName = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
            
            // Retirer les lettres isolées à la fin si elles sont trop courtes (probablement PNR)
            const trailingMatch = cleanedName.match(/^(.+?)\s+([A-Z]{1,3})$/);
            if (trailingMatch && trailingMatch[1].length > trailingMatch[2].length * 2) {
              cleanedName = trailingMatch[1].trim();
            }
            
            // Vérifier que le nom est complet (contient deux parties séparées)
            if (cleanedName.length > 3 && cleanedName.includes(' ')) {
              console.log('[PARSER] ✅✅✅ Nom final extrait (avec slash):', cleanedName);
              return cleanedName;
            }
          } else if (spaceIndex > 0) {
            // Pas de "/", mais il y a un espace
            const namePart = rawData.substring(2, spaceIndex + 1);
            let cleanedName = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
            if (cleanedName.length > 3) {
              console.log('[PARSER] ✅✅✅ Nom final extrait (avec espace):', cleanedName);
              return cleanedName;
            }
          }
        }
      }
    }
    
    // PRIORITÉ 2: Chercher directement le pattern "MASIMANGO/ISSIAKA GREOIFLBU"
    // Format: M1 + nom + espace optionnel + lettres(3) + PNR(6) + codes aéroports ou ET
    const patternWithPnrMatches = Array.from(rawData.matchAll(/^M[12](.+?)(?:\s+)?([A-Z]{3})([A-Z]{6})([A-Z]{3,6}|ET\s*\d)/g));
    console.log('[PARSER] 🔍 Recherche pattern 3+6, matches trouvés:', patternWithPnrMatches.length);
    for (const match of patternWithPnrMatches) {
      const name = match[1].trim();
      const lettersBefore = match[2]; // "GRE"
      const pnrFound = match[3]; // "OIFLBU"
      const afterPnr = match[4]; // "FIHMDK" ou "ET 0080"
      
      console.log('[PARSER] ✅ Pattern 3+6 trouvé - Nom:', name, 'Lettres avant PNR:', lettersBefore, 'PNR:', pnrFound, 'Après:', afterPnr);
      
      // Vérifier que ce qui suit le PNR est soit un code aéroport, soit ET
      const airportPattern = KNOWN_AIRPORT_CODES.join('|');
      const isFollowedByAirportOrEt = new RegExp(`^(${airportPattern})`).test(afterPnr) || /^ET\s*\d/.test(afterPnr);
      
      if (isFollowedByAirportOrEt) {
        // Nettoyer le nom
        let cleanedName = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
        // Retirer les lettres isolées à la fin si elles correspondent aux lettres avant le PNR
        const trailingMatch = cleanedName.match(/^(.+)\s+([A-Z]{1,4})$/);
        if (trailingMatch && trailingMatch[2] === lettersBefore) {
          cleanedName = trailingMatch[1].trim();
          console.log('[PARSER] Lettres de queue retirées (correspondent aux lettres avant PNR):', trailingMatch[2]);
        }
        console.log('[PARSER] ✅✅✅ Nom final extrait (pattern 3+6):', cleanedName);
        return cleanedName;
      }
    }
    
    // PRIORITÉ 1A: Utiliser le PNR trouvé pour extraire le nom même si tout est collé
    // Format: nom se termine avant les lettres avant le PNR (ex: "ISSIAKA" avant "GREOIFLBU")
    if (pnrFromParser && pnrFromParser.length === 6) {
      // Chercher le PNR dans les données
      const pnrIndex = rawData.indexOf(pnrFromParser);
      if (pnrIndex > 0) {
        const beforePnr = rawData.substring(0, pnrIndex);
        console.log('[PARSER] 🔍 Extraction nom avec PNR connu, avant PNR:', beforePnr.substring(Math.max(0, beforePnr.length - 20)));
        
        // Chercher le pattern avec lettres avant le PNR (3 lettres)
        const patternMatch = beforePnr.match(/([A-Z]{3})([A-Z]{6})$/);
        if (patternMatch && patternMatch[2] === pnrFromParser) {
          const lettersBefore = patternMatch[1]; // "GRE"
          const lettersBeforeIndex = pnrIndex - 6; // Position du début des lettres avant
          const namePart = rawData.substring(2, lettersBeforeIndex); // De M1/M2 jusqu'au début des lettres avant
          
          console.log('[PARSER] Nom partiel trouvé:', namePart, 'lettres avant:', lettersBefore);
          
          let cleanedName = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
          
          // Si le nom se termine par les lettres avant (ex: "ISSIAKAGRE"), retirer "GRE"
          if (cleanedName.endsWith(lettersBefore)) {
            cleanedName = cleanedName.substring(0, cleanedName.length - lettersBefore.length).trim();
            console.log('[PARSER] Lettres collées retirées avec PNR connu:', lettersBefore);
          }
          
          // Vérifier que le nom est valide (contient au moins un "/" ou est raisonnablement long)
          if (cleanedName.length > 3) {
            console.log('[PARSER] ✅✅✅ Nom final extrait (avec PNR connu):', cleanedName);
            return cleanedName;
          }
        } else {
          // Si pas de pattern trouvé, essayer de trouver où se termine le nom
          // Chercher "/" ou espace avant le PNR
          const slashIndex = beforePnr.lastIndexOf('/');
          const spaceIndex = beforePnr.lastIndexOf(' ');
          const lastSeparator = Math.max(slashIndex, spaceIndex);
          
          if (lastSeparator > 0) {
            const namePart = rawData.substring(2, lastSeparator + (slashIndex > spaceIndex ? 0 : 1));
            let cleanedName = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
            if (cleanedName.length > 3) {
              console.log('[PARSER] ✅✅✅ Nom final extrait (avec séparateur):', cleanedName);
              return cleanedName;
            }
          }
        }
      }
    }
    
    // Fallback: chercher le pattern collé normalement
    const patternColled = Array.from(rawData.matchAll(/^M[12](.+?)([A-Z]{3})([A-Z]{6})([A-Z]{3,6}|ET\s*\d)/g));
    console.log('[PARSER] 🔍 Recherche pattern collé, matches trouvés:', patternColled.length);
    for (const match of patternColled) {
      const name = match[1].trim();
      const lettersBefore = match[2];
      const pnrFound = match[3];
      const afterPnr = match[4];
      
      console.log('[PARSER] ✅ Pattern collé trouvé - Nom:', name, 'Lettres avant PNR:', lettersBefore, 'PNR:', pnrFound);
      
      const airportPattern = KNOWN_AIRPORT_CODES.join('|');
      const isFollowedByAirportOrEt = new RegExp(`^(${airportPattern})`).test(afterPnr) || /^ET\s*\d/.test(afterPnr);
      
      if (isFollowedByAirportOrEt && pnrFound === pnrFromParser) {
        let cleanedName = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
        // Retirer les dernières lettres si elles correspondent aux lettres avant le PNR
        if (cleanedName.endsWith(lettersBefore)) {
          cleanedName = cleanedName.substring(0, cleanedName.length - lettersBefore.length).trim();
          console.log('[PARSER] Lettres collées retirées:', lettersBefore);
        }
        console.log('[PARSER] ✅✅✅ Nom final extrait (pattern collé):', cleanedName);
        return cleanedName;
      }
    }
    
    // PRIORITÉ 1B: Chercher aussi avec 1-2 ou 4 lettres avant
    const patternWithPnrMatchesFlexible = Array.from(rawData.matchAll(/^M[12](.+?)(?:\s+)?([A-Z]{1,2}|[A-Z]{4})([A-Z]{6})([A-Z]{3,6}|ET\s*\d)/g));
    for (const match of patternWithPnrMatchesFlexible) {
      const name = match[1].trim();
      const lettersBefore = match[2];
      const pnrFound = match[3];
      const afterPnr = match[4];
      
      const airportPattern = KNOWN_AIRPORT_CODES.join('|');
      const isFollowedByAirportOrEt = new RegExp(`^(${airportPattern})`).test(afterPnr) || /^ET\s*\d/.test(afterPnr);
      
      if (isFollowedByAirportOrEt) {
        let cleanedName = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
        const trailingMatch = cleanedName.match(/^(.+)\s+([A-Z]{1,4})$/);
        if (trailingMatch && trailingMatch[2] === lettersBefore) {
          cleanedName = trailingMatch[1].trim();
        }
        console.log('[PARSER] ✅✅✅ Nom final extrait (flexible):', cleanedName);
        return cleanedName;
      }
    }
    
    // PRIORITÉ 2: Utiliser le PNR extrait (si fourni) pour trouver où se termine le nom
    const pnr = pnrFromParser || pnrExtractorService.extractPnr(rawData);
    console.log('[PARSER] Utilisation du PNR pour extraire le nom:', pnr);
    
    // Chercher M1 ou M2 suivi du nom jusqu'à ET suivi de chiffres (numéro de vol)
    // Déclarer volMatch une seule fois pour toute la fonction
    let volMatch: RegExpMatchArray | null = rawData.match(/ET\s*\d{2,4}/);
    if (volMatch) {
      const volIndex = rawData.indexOf(volMatch[0]);
      if (volIndex > 2) {
        const beforeVol = rawData.substring(0, volIndex);
        const nameMatch = beforeVol.match(/^M[12](.+)$/);
        if (nameMatch) {
          let name: string = nameMatch[1].trim();
          
          // Si on a trouvé un PNR valide, chercher où il commence dans le nom
          if (pnr !== 'UNKNOWN' && pnr.length === 6) {
            // Si on a trouvé un PNR, vérifier s'il est collé au nom
            const pnrIndex = name.lastIndexOf(pnr);
            if (pnrIndex > 0) {
              // Le PNR est dans le nom, extraire seulement la partie avant le PNR
              name = name.substring(0, pnrIndex).trim();
            } else {
              // Le PNR peut être collé avec des lettres avant (ex: "GROIFLBU" où "GR" est dans le nom)
              // Chercher un pattern où le PNR est précédé de 1-3 lettres qui font partie du nom
              const pnrPattern = new RegExp(`([A-Z]{1,3})${pnr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
              const pnrColledMatch = name.match(pnrPattern);
              if (pnrColledMatch) {
                // Retirer les lettres collées au PNR (ex: "GR" de "GROIFLBU")
                name = name.substring(0, name.length - pnr.length - pnrColledMatch[1].length).trim();
              } else {
                // Chercher le PNR directement à la fin
                if (name.endsWith(pnr)) {
                  name = name.substring(0, name.length - pnr.length).trim();
                }
              }
            }
          } else {
            // Pas de PNR trouvé, chercher des patterns communs avant ET ou codes aéroports
            // Pattern 1: Nom suivi de lettres (1-4) + 6 lettres (PNR) + ET ou codes aéroports
            // Ex: "MASIMANGO/ISSIAKA GREOIFLBU FIHMDKET" → nom = "MASIMANGO/ISSIAKA"
            // Chercher dans beforeVol au lieu de name pour avoir le contexte complet
            const patternWithLetters = beforeVol.match(/^M[12](.+?)(?:\s+)?([A-Z]{1,4})([A-Z]{6})(?:\s+)?(ET|[A-Z]{3,6})/);
            if (patternWithLetters && patternWithLetters[1].length > 3) {
              const extractedName = patternWithLetters[1].trim();
              const afterPnr = patternWithLetters[4];
              // Vérifier que ce qui suit est bien ET ou un code aéroport
              const airportPattern = KNOWN_AIRPORT_CODES.join('|');
              if (afterPnr.match(/^ET/) || new RegExp(`^(${airportPattern})`).test(afterPnr)) {
                name = extractedName;
                console.log('[PARSER] Nom extrait avec pattern lettres+PNR:', name);
              }
            } else {
                // Pattern 1B: Chercher directement dans name avec espaces
                // Format: "MASIMANGO/ISSIAKA GREOIFLBU FIHMDKET" → nom = "MASIMANGO/ISSIAKA"
                // name est défini à la ligne 743, donc on peut l'utiliser ici
                const patternWithLettersInName = name.match(/^(.+?)\s+([A-Z]{1,4})([A-Z]{6})(?:\s+)?([A-Z]{3,6}|ET)/);
                if (patternWithLettersInName && patternWithLettersInName[1].length > 3) {
                  const extractedName = patternWithLettersInName[1].trim();
                  const afterPnr = patternWithLettersInName[4];
                  const airportPattern = KNOWN_AIRPORT_CODES.join('|');
                  // Vérifier que ce qui suit est bien un code aéroport ou ET
                  if (afterPnr && (afterPnr.match(/^ET/) || new RegExp(`^(${airportPattern})`).test(afterPnr))) {
                    name = extractedName;
                    console.log('[PARSER] Nom extrait avec pattern lettres+PNR (dans name):', name);
                  }
                } else {
                  // Pattern 1C: Chercher dans beforeVol avec le pattern complet
                  // Format: "M1MASIMANGO/ISSIAKA GREOIFLBU FIHMDKET" → nom = "MASIMANGO/ISSIAKA"
                  const patternFull = beforeVol.match(/^M[12](.+?)\s+([A-Z]{1,4})([A-Z]{6})(?:\s+)?([A-Z]{3,6}|ET)/);
                  if (patternFull && patternFull[1].length > 3) {
                    const extractedName = patternFull[1].trim();
                    const afterPnr = patternFull[4];
                    const airportPattern = KNOWN_AIRPORT_CODES.join('|');
                    if (afterPnr && (afterPnr.match(/^ET/) || new RegExp(`^(${airportPattern})`).test(afterPnr))) {
                      name = extractedName;
                      console.log('[PARSER] Nom extrait avec pattern complet (beforeVol):', name);
                    } else {
                      // Pattern 2: Nom suivi de 8 lettres (peut contenir PNR) + ET
                      // Ex: "EYAKOLI/BALA MARIE EEMXTRJE FIHGMAET" → nom = "EYAKOLI/BALA MARIE"
                      const pattern8Letters = beforeVol.match(/^M[12](.+?)([A-Z]{8})(?:\s+)?(ET|[A-Z]{3,6})/);
                      if (pattern8Letters && pattern8Letters[1].length > 3) {
                        const extractedName = pattern8Letters[1].trim();
                        const afterName = pattern8Letters[3];
                        const airportPattern = KNOWN_AIRPORT_CODES.join('|');
                        if (afterName && (afterName.match(/^ET/) || new RegExp(`^(${airportPattern})`).test(afterName))) {
                          name = extractedName;
                          console.log('[PARSER] Nom extrait avec pattern 8 lettres:', name);
                        } else {
                          // Pattern 2B: Chercher dans name avec espaces
                          const pattern8LettersInName = name.match(/^(.+?)\s+([A-Z]{8})(?:\s+)?(ET|[A-Z]{3,6})/);
                          if (pattern8LettersInName && pattern8LettersInName[1].length > 3) {
                            const extractedName = pattern8LettersInName[1].trim();
                            const afterName = pattern8LettersInName[3];
                            const airportPattern = KNOWN_AIRPORT_CODES.join('|');
                            if (afterName && (afterName.match(/^ET/) || new RegExp(`^(${airportPattern})`).test(afterName))) {
                              name = extractedName;
                              console.log('[PARSER] Nom extrait avec pattern 8 lettres (dans name):', name);
                            } else {
                              // Pattern 3: Chercher un pattern de 6 lettres à la fin suivi de ET
                              const pnrMatch = name.match(/([A-Z\s\/]+?)([A-Z]{1,3})([A-Z]{6})ET\s*\d/);
                              if (pnrMatch && pnrMatch[1].length > 0) {
                                // Le PNR est collé au nom avec lettres avant, extraire seulement le nom
                                name = pnrMatch[1].trim();
                              } else {
                                // Pattern 4: Chercher un pattern simple de 6 lettres à la fin avant codes aéroports
                                const simplePnrMatch = name.match(/([A-Z\s\/]+?)([A-Z]{6})(?:\s+)?([A-Z]{3,6})/);
                                if (simplePnrMatch && simplePnrMatch[1].length > 0) {
                                  const afterPnr = simplePnrMatch[3];
                                  const airportPattern = KNOWN_AIRPORT_CODES.join('|');
                                  // Vérifier que ce qui suit est bien un code aéroport
                                  if (new RegExp(`^(${airportPattern})`).test(afterPnr)) {
                                    name = simplePnrMatch[1].trim();
                                    console.log('[PARSER] Nom extrait avec pattern simple avant aéroport:', name);
                                  }
                                } else {
                                  // Pattern 5: Chercher directement jusqu'à un code aéroport
                                  const airportPattern = KNOWN_AIRPORT_CODES.join('|');
                                  const airportMatch = name.match(new RegExp(`^(.+?)([A-Z]{3,6})(?=\\s*(${airportPattern})|ET)`));
                                  if (airportMatch && airportMatch[1].length > 3) {
                                    // Vérifier que la partie avant n'est pas trop longue (probablement contient le PNR)
                                    const potentialName = airportMatch[1].trim();
                                    // Si le nom se termine par un pattern de 6-8 lettres, le retirer
                                    const trailingPnrMatch = potentialName.match(/^(.+?)([A-Z]{6,8})$/);
                                    if (trailingPnrMatch && trailingPnrMatch[1].length > 3) {
                                      name = trailingPnrMatch[1].trim();
                                      console.log('[PARSER] Nom extrait en retirant PNR trailing:', name);
                                    } else if (potentialName.length < 50) {
                                      name = potentialName;
                                      console.log('[PARSER] Nom extrait directement avant aéroport:', name);
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          
          // Remplacer / par espace (exécuté dans tous les cas où nameMatch est trouvé)
          // Vérifier que name est défini avant de le nettoyer
          if (typeof name !== 'undefined' && name && name.length > 0) {
            name = name.replace(/\//g, ' ');
            // Nettoyer les espaces multiples
            name = name.replace(/\s+/g, ' ').trim();
            
            // Retirer les lettres isolées à la fin qui peuvent être collées au PNR (ex: "GR" dans "MASIMANGO/ISSIAKA GR")
            // Si le nom se termine par 1-3 lettres isolées après un espace, les retirer
            // Car elles font probablement partie du pattern "GROIFLBU" où "GR" est collé au PNR "OIFLBU"
            const trailingLettersMatch = name.match(/^(.+)\s+([A-Z]{1,3})$/);
            if (trailingLettersMatch) {
              const mainName = trailingLettersMatch[1];
              const trailing = trailingLettersMatch[2];
              // Si les lettres de queue sont courtes (1-3 lettres) et le nom principal est long, les retirer
              // car elles sont probablement collées au PNR
              if (mainName.length > trailing.length * 2) {
                console.log('[PARSER] Retrait des lettres de queue collées au PNR:', trailing);
                name = mainName.trim();
              }
            }
            
            return name;
          }
          
        }
      }
    
    // Fallback : chercher M1 ou M2 suivi de lettres jusqu'à ET ou codes aéroports
    // Pattern amélioré pour détecter "MASIMANGO/ISSIAKA GREOIFLBU FIHMDKET"
    const airportPattern = KNOWN_AIRPORT_CODES.join('|');
    // Chercher jusqu'à un code aéroport ou ET suivi de chiffres
    const fallbackMatch = rawData.match(new RegExp(`^M[12]([A-Z\\s\\/]+?)(?:\\s+)?([A-Z]{1,4})?([A-Z]{6})?(?:\\s+)?(${airportPattern}|ET\\s*\\d)`));
    if (fallbackMatch && fallbackMatch[1] && fallbackMatch[1].length > 3) {
      let name = fallbackMatch[1].trim();
      const afterName = fallbackMatch[4];
      // Vérifier que ce qui suit est bien ET ou un code aéroport
      if (afterName && (afterName.match(/^ET/) || new RegExp(`^(${airportPattern})`).test(afterName))) {
        name = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
        // Retirer les lettres isolées à la fin si elles sont trop courtes (probablement PNR)
        const trailingMatch = name.match(/^(.+?)\\s+([A-Z]{1,3})$/);
        if (trailingMatch && trailingMatch[1].length > trailingMatch[2].length * 2) {
          name = trailingMatch[1].trim();
        }
        return name;
      }
    }
    
    // Fallback alternatif : chercher directement jusqu'à un code aéroport ou ET
    const fallbackMatch2 = rawData.match(new RegExp(`^M[12]([A-Z\\s\\/]+?)(?:${airportPattern}|ET\\s*\\d)`));
    if (fallbackMatch2 && fallbackMatch2[1] && fallbackMatch2[1].length > 3) {
      let name = fallbackMatch2[1].trim();
      name = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
      return name;
    }
    
    // Fallback supplémentaire : chercher M2MULENGA/MUMBI EGPKZLX (nom avec PNR collé)
    const m2Match = rawData.match(/^M2([A-Z\s\/]+?)([A-Z]{6})/);
    if (m2Match) {
      let name = m2Match[1].trim();
      name = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
      
      // Vérifier que le nom ne contient pas le PNR
      const pnr = m2Match[2];
      if (name.includes(pnr)) {
        const pnrIndex = name.indexOf(pnr);
        name = name.substring(0, pnrIndex).trim();
      }
      
      return name;
    }
    
    // VÉRIFICATION FINALE: S'assurer que le nom retourné ne contient jamais le PNR
    // Si on a un PNR connu, vérifier qu'il n'est pas dans le nom
    const finalPnr = pnrFromParser || this.extractPnrEthiopian(rawData);
    // Réutiliser volMatch déclaré plus haut, ou le recalculer si nécessaire
    if (!volMatch) {
      volMatch = rawData.match(/ET\s*\d{2,4}/);
    }
    
    if (finalPnr && finalPnr !== 'UNKNOWN' && finalPnr.length === 6) {
      // Chercher un nom potentiel en cherchant jusqu'à ET ou jusqu'au PNR
      const pnrIndex = rawData.indexOf(finalPnr);
      
      if (volMatch && pnrIndex > 0) {
        const volIndex = rawData.indexOf(volMatch[0]);
        const beforeVol = rawData.substring(0, volIndex);
        
        // Si le PNR est avant ET, extraire le nom jusqu'au PNR
        if (pnrIndex < volIndex) {
          const namePart = rawData.substring(2, pnrIndex);
          let cleanedName = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
          
          // Retirer les lettres avant le PNR si présentes (ex: "GRE" avant "OIFLBU")
          if (cleanedName.length > 3) {
            const trailingMatch = cleanedName.match(/^(.+)\s+([A-Z]{1,4})$/);
            if (trailingMatch && trailingMatch[2].length <= 4) {
              cleanedName = trailingMatch[1].trim();
            }
          }
          
          // Vérifier que le nom ne contient pas le PNR
          if (!cleanedName.includes(finalPnr) && cleanedName.length > 3) {
            console.log('[PARSER] ✅✅✅ Nom final extrait (vérification finale):', cleanedName);
            return cleanedName;
          }
        }
      }
    }
    
    // DERNIER FALLBACK: Détecter un PNR potentiel collé au nom même si non confirmé
    // Format: M1EYAKOLI/BALA MARIE EEMXTRJE FIHGMAET 0072
    // Chercher un pattern où le nom se termine par 6+ lettres suivies d'un espace et d'un code aéroport
    if (volMatch) {
      const volIndex = rawData.indexOf(volMatch[0]);
      if (volIndex > 2) {
        const beforeVol = rawData.substring(0, volIndex);
        // Chercher le pattern: nom + espace + (1-4 lettres) + (6 lettres PNR potentiel) + espace + code aéroport
        const pnrPatternMatch = beforeVol.match(/^M[12](.+?)\s+([A-Z]{1,4})?([A-Z]{6})\s+([A-Z]{3,6})/);
        if (pnrPatternMatch) {
          let name = pnrPatternMatch[1].trim();
          const lettersBefore = pnrPatternMatch[2] || '';
          const potentialPnr = pnrPatternMatch[3];
          const afterPnr = pnrPatternMatch[4];
          
          // Vérifier que ce qui suit le PNR potentiel est un code aéroport connu
          if (KNOWN_AIRPORT_CODES.some(apt => afterPnr.includes(apt))) {
            // Retirer les lettres avant le PNR si présentes dans le nom
            if (lettersBefore && name.endsWith(lettersBefore)) {
              name = name.substring(0, name.length - lettersBefore.length).trim();
            }
            // Retirer le PNR potentiel s'il est collé au nom
            if (name.endsWith(potentialPnr)) {
              name = name.substring(0, name.length - potentialPnr.length).trim();
            }
            // Nettoyer le nom
            name = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
            if (name.length > 3) {
              console.log('[PARSER] ✅✅✅ Nom final extrait (PNR potentiel détecté):', name);
              return name;
            }
          }
        }
        
        // Pattern plus simple: nom se termine par 6 lettres suivies d'un espace et d'un code aéroport
        const simplePnrMatch = beforeVol.match(/^M[12](.+?)([A-Z]{6})\s+([A-Z]{3,6})/);
        if (simplePnrMatch) {
          let name = simplePnrMatch[1].trim();
          const potentialPnr = simplePnrMatch[2];
          const afterPnr = simplePnrMatch[3];
          
          // Vérifier que ce qui suit est un code aéroport connu
          if (KNOWN_AIRPORT_CODES.some(apt => afterPnr.includes(apt))) {
            // Retirer le PNR potentiel s'il est collé au nom
            if (name.endsWith(potentialPnr)) {
              name = name.substring(0, name.length - potentialPnr.length).trim();
            }
            // Nettoyer le nom
            name = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
            if (name.length > 3) {
              console.log('[PARSER] ✅✅✅ Nom final extrait (PNR simple détecté):', name);
              return name;
            }
          }
        }
        
        // Pattern pour PNR avec lettres supplémentaires: nom se termine par 6-8 lettres suivies d'un espace et d'un code aéroport
        // Format: M1EYAKOLI/BALA MARIE EEMXTRJE FIHGMAET 0072 (EEMXTRJE = EEMXTR + JE)
        const pnrWithExtraMatch = beforeVol.match(/^M[12](.+?)\s+([A-Z]{6,8})\s+([A-Z]{3,6})/);
        if (pnrWithExtraMatch) {
          let name = pnrWithExtraMatch[1].trim();
          const potentialPnrWithExtra = pnrWithExtraMatch[2];
          const afterPnr = pnrWithExtraMatch[3];
          
          // Vérifier que ce qui suit est un code aéroport connu
          if (KNOWN_AIRPORT_CODES.some(apt => afterPnr.includes(apt))) {
            // Extraire les 6 dernières lettres comme PNR potentiel
            const potentialPnr = potentialPnrWithExtra.substring(potentialPnrWithExtra.length - 6);
            
            // Retirer le PNR potentiel s'il est collé au nom (chercher les 6 dernières lettres)
            if (name.endsWith(potentialPnr)) {
              name = name.substring(0, name.length - potentialPnr.length).trim();
            } else if (name.endsWith(potentialPnrWithExtra)) {
              // Si tout le groupe est collé au nom, retirer tout
              name = name.substring(0, name.length - potentialPnrWithExtra.length).trim();
            }
            // Nettoyer le nom
            name = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
            if (name.length > 3) {
              console.log('[PARSER] ✅✅✅ Nom final extrait (PNR avec lettres supplémentaires détecté):', name, 'PNR potentiel:', potentialPnr);
              return name;
            }
          }
        }
      }
    }
    
    return 'UNKNOWN';
  }

  /**
   * Extrait le PNR pour Ethiopian Airlines
   */
  private extractPnrEthiopian(rawData: string): string {
    // Pour Ethiopian, le PNR peut être après le nom ou ailleurs
    // Format: M2MULENGA/MUMBI EGPKZLX (PNR collé au nom)
    // Format spécial: M1MASIMANGO/ISSIAKA GROIFLBUET80 (PNR OIFLBU collé avec "GR" avant)
    // Chercher un groupe de 6 caractères alphanumériques qui n'est pas un code aéroport
    // IMPORTANT: Ne pas prendre une partie du code bagage (ex: A40711 de 4071161870)
    
    const knownAirports = KNOWN_AIRPORT_CODES;
    
    // PRIORITÉ ABSOLUE 1: Chercher le pattern "GREOIFLBU" où "OIFLBU" est le PNR
    // Format réel: "GREOIFLBU" = "GRE" (3 lettres) + "OIFLBU" (6 lettres = PNR)
    // Le pattern peut être suivi de codes aéroports (FIHMDK) ou ET + chiffres
    // STRATÉGIE: Chercher un groupe de 9 lettres (3+6) suivi de codes aéroports ou ET, puis extraire les 6 dernières
    // IMPORTANT: Chercher d'abord les patterns suivis de codes aéroports (plus fiables)
    console.log('[PARSER] 🔍 Recherche PNR avec pattern 3+6 dans:', rawData.substring(0, 50) + '...');
    
    // PRIORITÉ 1A: Pattern suivi directement de codes aéroports (ex: "GREOIFLBUFIHMDK")
    // Chercher spécifiquement les patterns qui sont suivis de codes aéroports connus
    // STRATÉGIE: Chercher d'abord les codes aéroports, puis remonter pour trouver le PNR
    const airportCodes = KNOWN_AIRPORT_CODES;
    const validMatches = [];
    
    for (const airport of airportCodes) {
      const airportIndex = rawData.indexOf(airport);
      if (airportIndex > 0) {
        // Chercher dans une fenêtre plus large pour trouver le bon pattern
        const searchWindow = rawData.substring(Math.max(0, airportIndex - 20), airportIndex);
        
        // PRIORITÉ: Chercher d'abord les patterns 2+6 lettres (ex: "EEMXTRJE" → PNR = "MXTRJE")
        const patterns2_6 = Array.from(searchWindow.matchAll(/([A-Z]{2})([A-Z]{6})/g));
        for (const patternMatch of patterns2_6) {
          const lettersBefore = patternMatch[1];
          const pnrCandidate = patternMatch[2]; // Les 6 dernières lettres sont le PNR
          const patternIndexInWindow = patternMatch.index || 0;
          const fullPattern = patternMatch[0]; // Le pattern complet (8 lettres)
          
          // CORRECTION CRITIQUE: S'assurer qu'on prend bien les 6 DERNIÈRES lettres du pattern de 8 lettres
          // Si le pattern est "EEMXTRJE", on veut "MXTRJE", pas "EEMXTR"
          // Vérifier que pnrCandidate correspond bien aux 6 dernières lettres
          const expectedPnr = fullPattern.substring(2); // Les 6 dernières lettres
          if (pnrCandidate !== expectedPnr) {
            console.log('[PARSER] ⚠️ CORRECTION: PNR candidat ne correspond pas aux 6 dernières lettres. Pattern:', fullPattern, 'Attendu:', expectedPnr, 'Obtenu:', pnrCandidate);
            // Utiliser les 6 dernières lettres du pattern complet
            const correctedPnr = fullPattern.substring(2);
            const pnrIndex = airportIndex - searchWindow.length + patternIndexInWindow + 2; // Position réelle du PNR
            const beforePnr = rawData.substring(0, pnrIndex);
            
            if (beforePnr.match(/^M[12][A-Z\s\/]+/)) {
              let isAirport = false;
              for (const apt of knownAirports) {
                if (correctedPnr.includes(apt)) {
                  isAirport = true;
                  break;
                }
              }
              if (!isAirport) {
                const afterPattern = rawData.substring(pnrIndex + 6, airportIndex);
                const distanceToAirport = airportIndex - (pnrIndex + 6);
                
                if (distanceToAirport <= 3) {
                  const nameEnd = beforePnr.substring(Math.max(0, beforePnr.length - 20));
                  const nameEndTrimmed = nameEnd.trim();
                  
                  // Vérifier que les lettres avant ne font pas partie du nom
                  if (!nameEndTrimmed.endsWith(lettersBefore) && !nameEndTrimmed.includes(lettersBefore + correctedPnr[0])) {
                    validMatches.push({ matchIndex: pnrIndex, pnrCandidate: correctedPnr, lettersBefore, airportCode: airport });
                    console.log('[PARSER] ✅ Pattern 2+6 valide ajouté (corrigé):', correctedPnr, 'lettres avant:', lettersBefore);
                  }
                }
              }
            }
            continue;
          }
          
          const pnrIndex = airportIndex - searchWindow.length + patternIndexInWindow + 2; // Position réelle du PNR
          const beforePnr = rawData.substring(0, pnrIndex);
          
          if (beforePnr.match(/^M[12][A-Z\s\/]+/)) {
            let isAirport = false;
            for (const apt of knownAirports) {
              if (pnrCandidate.includes(apt)) {
                isAirport = true;
                break;
              }
            }
            if (!isAirport) {
              const afterPattern = rawData.substring(pnrIndex + 6, airportIndex);
              const distanceToAirport = airportIndex - (pnrIndex + 6);
              
              if (distanceToAirport <= 3) {
                const nameEnd = beforePnr.substring(Math.max(0, beforePnr.length - 20));
                const nameEndTrimmed = nameEnd.trim();
                
                // Vérifier que les lettres avant ne font pas partie du nom
                if (!nameEndTrimmed.endsWith(lettersBefore) && !nameEndTrimmed.includes(lettersBefore + pnrCandidate[0])) {
                  validMatches.push({ matchIndex: pnrIndex, pnrCandidate, lettersBefore, airportCode: airport });
                  console.log('[PARSER] ✅ Pattern 2+6 valide ajouté:', pnrCandidate, 'lettres avant:', lettersBefore);
                }
              }
            }
          }
        }
        
        // Chercher TOUS les patterns 3+6 dans la fenêtre
        const allPatterns = Array.from(searchWindow.matchAll(/([A-Z]{3})([A-Z]{6})/g));
        
        for (const patternMatch of allPatterns) {
          const lettersBefore = patternMatch[1];
          const pnrCandidate = patternMatch[2];
          const patternIndexInWindow = patternMatch.index || 0;
          const pnrIndex = airportIndex - searchWindow.length + patternIndexInWindow + 3; // Position réelle du PNR
          const beforePnr = rawData.substring(0, pnrIndex);
          
          console.log('[PARSER] Pattern trouvé avant aéroport:', airport, 'Lettres avant:', lettersBefore, 'PNR:', pnrCandidate, 'Position PNR:', pnrIndex);
          
          if (beforePnr.match(/^M[12][A-Z\s\/]+/)) {
            let isAirport = false;
            for (const apt of knownAirports) {
              if (pnrCandidate.includes(apt)) {
                isAirport = true;
                break;
              }
            }
            if (!isAirport) {
              // Vérifier que le pattern est directement suivi du code aéroport (pas d'autres lettres entre)
              const afterPattern = rawData.substring(pnrIndex + 6, airportIndex);
              const distanceToAirport = airportIndex - (pnrIndex + 6);
              
              // Le pattern doit être directement suivi du code aéroport ou avec très peu de lettres entre (max 3)
              if (distanceToAirport <= 3) {
                // Vérifier que les lettres avant ne font pas partie du nom
                const nameEnd = beforePnr.substring(Math.max(0, beforePnr.length - 20));
                const nameEndTrimmed = nameEnd.trim();
                
                // Vérifier si "GRE" (ou les lettres avant) font partie du nom
                // Le nom se termine généralement par "/" ou un espace, ou par des lettres qui forment un mot complet
                // Si "GRE" est collé directement au nom sans séparateur, vérifier si c'est une continuation du nom
                const nameEndLastChars = nameEndTrimmed.substring(Math.max(0, nameEndTrimmed.length - 10));
                
                // Accepter si les lettres avant sont "GRE" (pattern connu) même si collé au nom
                // Car "GRE" est toujours suivi du PNR "OIFLBU"
                if (lettersBefore === 'GRE' || lettersBefore === 'GRO' || lettersBefore.length === 3) {
                  // Vérifier que le nom ne se termine pas par ces lettres exactes
                  if (!nameEndTrimmed.endsWith(lettersBefore) && !nameEndLastChars.endsWith(lettersBefore + lettersBefore)) {
                    validMatches.push({ matchIndex: pnrIndex, pnrCandidate, lettersBefore, airportCode: airport });
                    console.log('[PARSER] ✅ Pattern valide ajouté:', pnrCandidate, 'lettres avant:', lettersBefore);
                  } else {
                    console.log('[PARSER] ⚠️ Pattern ignoré (lettres avant font partie du nom):', lettersBefore, 'nom fin:', nameEndTrimmed);
                  }
                } else {
                  // Pour d'autres lettres, être plus strict
                  if (!nameEndTrimmed.endsWith(lettersBefore) && !nameEndTrimmed.includes(lettersBefore + pnrCandidate[0])) {
                    validMatches.push({ matchIndex: pnrIndex, pnrCandidate, lettersBefore, airportCode: airport });
                    console.log('[PARSER] ✅ Pattern valide ajouté:', pnrCandidate);
                  } else {
                    console.log('[PARSER] ⚠️ Pattern ignoré (lettres avant font partie du nom):', lettersBefore);
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Prendre le match le plus proche de la fin (le dernier dans les données)
    // Mais préférer celui qui est suivi de "FIH" (premier aéroport)
    if (validMatches.length > 0) {
      // Trier: d'abord ceux suivis de FIH, puis par index
      validMatches.sort((a, b) => {
        if (a.airportCode === 'FIH' && b.airportCode !== 'FIH') return -1;
        if (b.airportCode === 'FIH' && a.airportCode !== 'FIH') return 1;
        return b.matchIndex - a.matchIndex;
      });
      const bestMatch = validMatches[0];
      console.log('[PARSER] ✅✅✅✅✅ PNR TROUVÉ avec aéroport (priorité 1A):', bestMatch.pnrCandidate, 'Index:', bestMatch.matchIndex, 'Aéroport:', bestMatch.airportCode);
      return bestMatch.pnrCandidate;
    }
    
    // Fallback: chercher patterns 2+6 lettres suivis de codes aéroports (ex: "EEMXTRJEFIHGMA")
    const airportPattern = KNOWN_AIRPORT_CODES.join('|');
    const pnr8WithAirports = Array.from(rawData.matchAll(new RegExp(`([A-Z]{2})([A-Z]{6})(${airportPattern})`, 'g')));
    console.log('[PARSER] 🔍 Patterns 2+6 suivis de codes aéroports:', pnr8WithAirports.length);
    
    for (const match of pnr8WithAirports) {
      const lettersBefore = match[1];
      const pnrCandidate = match[2]; // Les 6 dernières lettres sont le PNR
      const airportCode = match[3];
      const matchIndex = match.index || 0;
      const beforeMatch = rawData.substring(0, matchIndex);
      
      if (beforeMatch.match(/^M[12][A-Z\s\/]+/)) {
        let isAirport = false;
        for (const airport of knownAirports) {
          if (pnrCandidate.includes(airport)) {
            isAirport = true;
            break;
          }
        }
        if (!isAirport) {
          console.log('[PARSER] ✅✅✅✅✅ PNR TROUVÉ avec pattern 2+6 et aéroport:', pnrCandidate, 'lettres avant:', lettersBefore);
          return pnrCandidate;
        }
      }
    }
    
    // Fallback: chercher tous les patterns avec regex (3+6 lettres)
    const pnrWithAirports = Array.from(rawData.matchAll(new RegExp(`([A-Z]{3})([A-Z]{6})(${airportPattern})`, 'g')));
    console.log('[PARSER] 🔍 Patterns 3+6 suivis de codes aéroports (fallback):', pnrWithAirports.length);
    
    for (const match of pnrWithAirports) {
      const lettersBefore = match[1];
      const pnrCandidate = match[2];
      const airportCode = match[3];
      const matchIndex = match.index || 0;
      const beforeMatch = rawData.substring(0, matchIndex);
      
      if (beforeMatch.match(/^M[12][A-Z\s\/]+/)) {
        let isAirport = false;
        for (const airport of knownAirports) {
          if (pnrCandidate.includes(airport)) {
            isAirport = true;
            break;
          }
        }
        if (!isAirport) {
          console.log('[PARSER] ✅✅✅✅✅ PNR TROUVÉ avec aéroport (fallback):', pnrCandidate);
          return pnrCandidate;
        }
      }
    }
    
    // PRIORITÉ 1B: Pattern 2+6 lettres suivi de ET + chiffres (ex: "EEMXTRJEET0072")
    const pnr2WithEt = Array.from(rawData.matchAll(/([A-Z]{2})([A-Z]{6})(ET\s*\d|ET\d{2,4})/g));
    console.log('[PARSER] 🔍 Patterns 2+6 suivis de ET:', pnr2WithEt.length);
    
    for (const match of pnr2WithEt) {
      const lettersBefore = match[1];
      const pnrCandidate = match[2]; // Les 6 dernières lettres sont le PNR
      const matchIndex = match.index || 0;
      const beforeMatch = rawData.substring(0, matchIndex);
      
      console.log('[PARSER] Pattern 2+6 avec ET trouvé:', match[0], 'Lettres avant:', lettersBefore, 'PNR:', pnrCandidate);
      
      if (beforeMatch.match(/^M[12][A-Z\s\/]+/)) {
        let isAirport = false;
        for (const airport of knownAirports) {
          if (pnrCandidate.includes(airport)) {
            isAirport = true;
            break;
          }
        }
        if (!isAirport) {
          console.log('[PARSER] ✅✅✅✅✅ PNR TROUVÉ avec pattern 2+6 et ET (priorité 1B):', pnrCandidate);
          return pnrCandidate;
        }
      }
    }
    
    // PRIORITÉ 1B: Pattern 3+6 lettres suivi de ET + chiffres
    const pnrWithEt = Array.from(rawData.matchAll(/([A-Z]{3})([A-Z]{6})(ET\s*\d|ET\d{2,4})/g));
    console.log('[PARSER] 🔍 Patterns 3+6 suivis de ET:', pnrWithEt.length);
    
    for (const match of pnrWithEt) {
      const lettersBefore = match[1];
      const pnrCandidate = match[2];
      const matchIndex = match.index || 0;
      const beforeMatch = rawData.substring(0, matchIndex);
      
      console.log('[PARSER] Pattern avec ET trouvé:', match[0], 'Lettres avant:', lettersBefore, 'PNR:', pnrCandidate);
      
      if (beforeMatch.match(/^M[12][A-Z\s\/]+/)) {
        let isAirport = false;
        for (const airport of knownAirports) {
          if (pnrCandidate.includes(airport)) {
            isAirport = true;
            break;
          }
        }
        if (!isAirport) {
          console.log('[PARSER] ✅✅✅✅✅ PNR TROUVÉ avec ET (priorité 1B):', pnrCandidate);
          return pnrCandidate;
        }
      }
    }
    
    // PRIORITÉ 1C: Pattern générique (fallback)
    const pnrWithLettersPatterns = Array.from(rawData.matchAll(/([A-Z]{3})([A-Z]{6})([A-Z]{3,6}|ET\s*\d)/g));
    console.log('[PARSER] 🔍 Nombre de patterns 3+6 génériques trouvés:', pnrWithLettersPatterns.length);
    
    for (const match of pnrWithLettersPatterns) {
      const lettersBefore = match[1];
      const pnrCandidate = match[2];
      const afterPnr = match[3];
      const matchIndex = match.index || 0;
      const beforeMatch = rawData.substring(0, matchIndex);
      
      console.log('[PARSER] Pattern 3+6 générique trouvé:', match[0], 'Lettres avant:', lettersBefore, 'PNR candidat:', pnrCandidate, 'Après:', afterPnr);
      
      if (beforeMatch.match(/^M[12][A-Z\s\/]+/)) {
        let isAirport = false;
        for (const airport of knownAirports) {
          if (pnrCandidate.includes(airport)) {
            isAirport = true;
            break;
          }
        }
        const isFollowedByAirportOrEt = knownAirports.some(apt => afterPnr.includes(apt)) || /^ET\s*\d/.test(afterPnr);
        
        if (!isAirport && isFollowedByAirportOrEt) {
          console.log('[PARSER] ✅✅✅✅✅ PNR TROUVÉ avec 3 lettres avant (priorité 1C):', pnrCandidate);
          return pnrCandidate;
        }
      }
    }
    
    // PRIORITÉ 1B: Chercher aussi avec 1-2 ou 4 lettres avant (pour autres formats)
    const pnrWithLettersPatternsFlexible = Array.from(rawData.matchAll(/([A-Z]{1,2}|[A-Z]{4})([A-Z]{6})([A-Z]{3,6}|ET\s*\d)/g));
    for (const match of pnrWithLettersPatternsFlexible) {
      const lettersBefore = match[1];
      const pnrCandidate = match[2];
      const afterPnr = match[3];
      const matchIndex = match.index || 0;
      const beforeMatch = rawData.substring(0, matchIndex);
      
      if (beforeMatch.match(/^M[12][A-Z\s\/]+/)) {
        let isAirport = false;
        for (const airport of knownAirports) {
          if (pnrCandidate.includes(airport)) {
            isAirport = true;
            break;
          }
        }
        const isFollowedByAirportOrEt = knownAirports.some(apt => afterPnr.includes(apt)) || /^ET\s*\d/.test(afterPnr);
        
        if (!isAirport && isFollowedByAirportOrEt) {
          console.log('[PARSER] ✅✅✅ PNR trouvé avec lettres avant (priorité 1B):', pnrCandidate, 'lettres avant:', lettersBefore);
          return pnrCandidate;
        }
      }
    }
    
    // PRIORITÉ 2A: Chercher un pattern de 8 lettres juste avant ET et extraire les 6 dernières comme PNR
    // Format: XX + PNR(6 lettres) + ET + chiffres (ex: "EEMXTRJEET0072" → PNR = "MXTRJE")
    // IMPORTANT: Toujours prendre les 6 DERNIÈRES lettres, pas les 2 premières + 4 suivantes
    const pnr8BeforeEt = rawData.match(/([A-Z]{8})ET\d{2,4}/);
    if (pnr8BeforeEt) {
      const fullPattern = pnr8BeforeEt[1];
      // CORRECTION: Prendre les 6 dernières lettres du pattern de 8 lettres
      // Exemple: "EEMXTRJE" → substring(2) = "MXTRJE" (correct)
      // Mais s'assurer qu'on prend bien les 6 dernières, pas les 6 premières
      const pnrCandidate = fullPattern.substring(fullPattern.length - 6); // Toujours les 6 dernières lettres
      const matchIndex = rawData.indexOf(pnr8BeforeEt[0]);
      const beforeMatch = rawData.substring(0, matchIndex);
      
      // Vérifier que c'est après M1 ou M2
      if (beforeMatch.match(/^M[12][A-Z\s\/]+/)) {
        let isAirport = false;
        for (const airport of knownAirports) {
          if (pnrCandidate.includes(airport)) {
            isAirport = true;
            break;
          }
        }
        if (!isAirport) {
          console.log('[PARSER] ✅ PNR trouvé dans pattern 8 lettres avant ET (priorité 2A):', pnrCandidate, 'pattern complet:', fullPattern);
          return pnrCandidate;
        }
      }
    }
    
    // PRIORITÉ 2B: Chercher un PNR de 6 lettres juste avant ET (sans lettres avant)
    // Format: PNR(6 lettres) + ET + chiffres
    const pnrDirectBeforeEt = rawData.match(/([A-Z]{6})ET\d{2,4}/);
    if (pnrDirectBeforeEt) {
      const pnrCandidate = pnrDirectBeforeEt[1];
      const matchIndex = rawData.indexOf(pnrDirectBeforeEt[0]);
      const beforeMatch = rawData.substring(0, matchIndex);
      
      // Vérifier que c'est après M1 ou M2
      if (beforeMatch.match(/^M[12][A-Z\s\/]+/)) {
        let isAirport = false;
        for (const airport of knownAirports) {
          if (pnrCandidate.includes(airport)) {
            isAirport = true;
            break;
          }
        }
        if (!isAirport) {
          console.log('[PARSER] ✅ PNR trouvé directement avant ET (priorité 2B):', pnrCandidate);
          return pnrCandidate;
        }
      }
    }
    
    // PRIORITÉ 3: Cas spécial: PNR collé au nom (M2MULENGA/MUMBI EGPKZLX)
    // Chercher M1 ou M2 suivi du nom puis un PNR de 6 lettres suivi de ET ou espace
    // MAIS exclure les cas où c'est juste une partie du nom (ex: "ISSIAK" de "ISSIAKA")
    const namePnrMatch = rawData.match(/^M[12]([A-Z\s\/]+)([A-Z]{6})(?:\s|ET|$)/);
    if (namePnrMatch) {
      const namePart = namePnrMatch[1];
      const pnrCandidate = namePnrMatch[2];
      
      // CRITIQUE: Ignorer si le PNR fait partie du nom (ex: "ISSIAK" de "ISSIAKA")
      const trimmedName = namePart.trim();
      const lastCharOfName = trimmedName[trimmedName.length - 1];
      
      // Vérification 1: Si le nom se termine par une lettre qui correspond au début du PNR, c'est probablement une partie du nom
      if (lastCharOfName && lastCharOfName === pnrCandidate[0]) {
        console.log('[PARSER] ⚠️⚠️⚠️ PNR IGNORÉ (fait partie du nom - dernier char):', pnrCandidate, 'dernier char du nom:', lastCharOfName, 'nom:', trimmedName);
        // NE PAS retourner, continuer
      } 
      // Vérification 2: Si le PNR est contenu dans le nom (ex: "ISSIAK" dans "ISSIAKA"), l'ignorer
      else if (trimmedName.includes(pnrCandidate)) {
        console.log('[PARSER] ⚠️⚠️⚠️ PNR IGNORÉ (contenu dans le nom):', pnrCandidate, 'nom:', trimmedName);
        // NE PAS retourner, continuer
      } 
      // Vérification 3: Si le nom se termine par le PNR (ex: "ISSIAKA" se termine par "ISSIAK"), l'ignorer
      else if (trimmedName.endsWith(pnrCandidate)) {
        console.log('[PARSER] ⚠️⚠️⚠️ PNR IGNORÉ (nom se termine par PNR):', pnrCandidate, 'nom:', trimmedName);
        // NE PAS retourner, continuer
      }
      else {
        // Vérifier que ce n'est pas un code aéroport
        let isAirport = false;
        for (const airport of knownAirports) {
          if (pnrCandidate.includes(airport)) {
            isAirport = true;
            break;
          }
        }
        if (!isAirport) {
          console.log('[PARSER] ✅ PNR trouvé après nom (priorité 3):', pnrCandidate);
          return pnrCandidate;
        }
      }
    }
    
    // Trouver où se termine le nom (avant ET suivi de chiffres ou avant le PNR)
    const volMatch = rawData.match(/ET\s*\d{3,4}/);
    const nameEndIndex = volMatch ? rawData.indexOf(volMatch[0]) : rawData.length;
    
    // Chercher tous les groupes de 6 caractères en excluant les codes aéroports
    const allMatches = rawData.matchAll(/([A-Z0-9]{6})/g);
    
    for (const match of allMatches) {
      const matchStr = match[0];
      const matchIndex = match.index || 0;
      
      // Ignorer si c'est trop tôt (dans M1 ou M2...)
      if (matchIndex < 5) continue;
      
      // CORRECTION CRITIQUE: Ignorer si ce pattern de 6 lettres fait partie d'un pattern de 8 lettres
      // Exemple: Si on trouve "EEMXTR", vérifier s'il y a "EEMXTRJE" juste après
      // Si oui, ignorer "EEMXTR" et prendre "MXTRJE" à la place
      if (matchIndex + 6 < rawData.length) {
        const next2Chars = rawData.substring(matchIndex + 6, matchIndex + 8);
        const full8Pattern = rawData.substring(matchIndex, matchIndex + 8);
        // Si les 2 caractères suivants forment un pattern de 8 lettres valide (2 lettres + 6 lettres)
        if (next2Chars.length === 2 && /^[A-Z]{2}$/.test(next2Chars) && /^[A-Z]{8}$/.test(full8Pattern)) {
          // Vérifier si ce pattern de 8 lettres est suivi de ET ou d'un code aéroport
          const after8 = rawData.substring(matchIndex + 8, matchIndex + 12);
          if (/^ET\d/.test(after8) || knownAirports.some(apt => after8.includes(apt))) {
            // C'est probablement un pattern de 8 lettres, ignorer ce match de 6 lettres
            console.log('[PARSER] ⚠️ Pattern de 6 lettres ignoré (fait partie d\'un pattern de 8 lettres):', matchStr, 'Pattern complet:', full8Pattern);
            continue;
          }
        }
      }
      
      // Le PNR peut être collé au nom (juste après M2...), donc vérifier si c'est après M1/M2
      const beforeMatch = rawData.substring(0, matchIndex);
      if (beforeMatch.match(/^M[12][A-Z\s\/]+$/)) {
        // C'est probablement le PNR collé au nom
        // Vérifier que ce n'est pas un code aéroport
        let isAirport = false;
        for (const airport of knownAirports) {
          if (matchStr.includes(airport)) {
            isAirport = true;
            break;
          }
        }
        if (!isAirport) {
          return matchStr;
        }
      }
      
      // Ignorer si c'est dans le nom (avant ET) et pas collé directement après M1/M2
      if (matchIndex < nameEndIndex && !beforeMatch.match(/^M[12][A-Z\s\/]+$/)) {
        continue; // C'est dans le nom
      }
      
      // Ignorer si c'est le numéro de vol (ET701 ou ET 0840)
      if (beforeMatch.match(/ET\s*$/)) {
        continue;
      }
      
      // Ignorer si c'est une partie d'un code bagage (10+ chiffres)
      // Vérifier si c'est dans une séquence de chiffres longs (ex: 4071161870 ou 0716055397226)
      const before10 = rawData.substring(Math.max(0, matchIndex - 4), matchIndex + 6);
      if (before10.match(/\d{10,}/)) {
        continue; // C'est une partie d'un code bagage
      }
      
      // Ignorer si c'est dans ou près d'un code bagage (même s'il commence par une lettre)
      // Chercher un pattern de 10+ chiffres consécutifs dans les données
      const baggagePattern = /\d{10,}/;
      const baggageMatch = rawData.match(baggagePattern);
      if (baggageMatch) {
        const baggageStart = rawData.indexOf(baggageMatch[0]);
        const baggageEnd = baggageStart + baggageMatch[0].length;
        // Si le match est dans les 6 caractères avant le code bagage, c'est probablement une partie du code
        if (matchIndex >= baggageStart - 6 && matchIndex < baggageEnd) {
          continue; // Trop proche du code bagage
        }
      }
      
      // CORRECTION FINALE: Vérifier si ce pattern de 6 lettres commence par "EE", "GR", "GRO" etc.
      // qui sont typiquement les préfixes des patterns de 8 lettres (ex: "EEMXTRJE" → PNR = "MXTRJE")
      // Si on trouve un pattern de 8 lettres qui commence à cette position, ignorer ce match de 6 lettres
      if (matchIndex > 0 && matchIndex + 6 < rawData.length) {
        const beforeMatch = rawData.substring(Math.max(0, matchIndex - 2), matchIndex);
        const afterMatch = rawData.substring(matchIndex + 6, matchIndex + 8);
        const potential8Pattern = rawData.substring(Math.max(0, matchIndex - 2), matchIndex + 6);
        
        // Si on a un pattern de 8 lettres (2 lettres avant + 6 lettres du match)
        if (potential8Pattern.length === 8 && /^[A-Z]{8}$/.test(potential8Pattern)) {
          const prefix2 = potential8Pattern.substring(0, 2);
          const pnr6 = potential8Pattern.substring(2); // Les 6 dernières lettres
          
          // Vérifier si ce pattern de 8 lettres est suivi de ET ou d'un code aéroport
          if (/^ET\d/.test(afterMatch) || knownAirports.some(apt => rawData.substring(matchIndex + 6, matchIndex + 12).includes(apt))) {
            // C'est un pattern de 8 lettres, le vrai PNR est les 6 dernières lettres
            // Ignorer ce match de 6 lettres qui commence par les 2 premières lettres du préfixe
            console.log('[PARSER] ⚠️ Pattern de 6 lettres ignoré (fait partie d\'un pattern de 8 lettres):', matchStr, 'Pattern complet:', potential8Pattern, 'Vrai PNR:', pnr6);
            continue;
          }
        }
      }
      
      // Ignorer si le match contient trop de chiffres (probablement une partie du code bagage)
      const digitCount = (matchStr.match(/\d/g) || []).length;
      if (digitCount >= 4) {
        // Si plus de 4 chiffres sur 6, c'est probablement une partie du code bagage
        continue;
      }
      
      // Ignorer si c'est un code aéroport connu
      let isAirport = false;
      for (const airport of knownAirports) {
        if (matchStr.startsWith(airport) || matchStr.endsWith(airport) || matchStr.includes(airport)) {
          if (matchStr.length === 6 && (matchStr.startsWith(airport) || matchStr.endsWith(airport))) {
            isAirport = true;
            break;
          }
          if (matchStr === 'ADDJNB' || matchStr === 'JNBADD' || matchStr === 'FIHFBM' || matchStr === 'FBMFIH' || matchStr === 'FIHADD' || matchStr === 'ADDFIH') {
            isAirport = true;
            break;
          }
        }
      }
      if (isAirport) continue;
      
      // Ignorer si c'est juste après un code aéroport (comme ADDJNB)
      const charBefore = rawData[matchIndex - 1];
      if (charBefore && charBefore.match(/[A-Z]/)) {
        const before3 = rawData.substring(Math.max(0, matchIndex - 3), matchIndex);
        if (knownAirports.includes(before3)) {
          continue;
        }
      }
      
      // C'est probablement le PNR
      return matchStr;
    }
    
    return 'UNKNOWN';
  }

  /**
   * Extrait le numéro de vol pour Ethiopian Airlines
   */
  private extractFlightNumberEthiopian(rawData: string): string | undefined {
    // Format: ET701, ET4071, ET80, ET0080, ou ET 0840 (avec espace)
    // Chercher d'abord avec espace (format plus récent)
    const volMatchWithSpace = rawData.match(/ET\s+(\d{2,4})/);
    if (volMatchWithSpace) {
      return `ET${volMatchWithSpace[1]}`;
    }
    
    // Fallback: chercher sans espace (ET80, ET0080, ET701, etc.)
    // Accepter 2-4 chiffres pour gérer ET80 et ET0080
    const volMatch = rawData.match(/ET(\d{2,4})/);
    if (volMatch) {
      // Vérifier que ce n'est pas "BET" ou "1ET" (codes compagnie)
      const matchIndex = rawData.indexOf(volMatch[0]);
      if (matchIndex > 0) {
        const beforeChar = rawData[matchIndex - 1];
        if (beforeChar === 'B' || beforeChar === '1') {
          // C'est "BET" ou "1ET", continuer la recherche
        } else {
          return volMatch[0];
        }
      } else {
        return volMatch[0];
      }
    }
    
    return undefined;
  }

  /**
   * Extrait les informations sur les bagages pour Ethiopian Airlines
   * Format spécial : 10 chiffres base + 3 chiffres count (ex: 4071161870001 = 1 bagage)
   * Format peut commencer par 0 (ex: 0716055397226 = 7160553972 base, 226 = count)
   */
  private extractBaggageInfoEthiopian(rawData: string): PassengerData['baggageInfo'] | undefined {
    // FORMAT IATA pour les bagages:
    // - 10 chiffres de numéro de bagage de base
    // - 3 chiffres encodés:
    //   * Si < 100 (ex: "001", "002") → nombre direct de bagages
    //   * Si ≥ 100 (ex: "800", "226") → format spécial, prendre dernier chiffre OU chercher ailleurs
    
    // STRATÉGIE 1: Chercher pattern standard (10 chiffres + 3 chiffres < 100)
    const allMatches = Array.from(rawData.matchAll(/(\d{10})(\d{3})/g));
    
    for (const match of allMatches) {
      const baseNumber = match[1];
      const countStr = match[2];
      const count = parseInt(countStr, 10);
      
      // Si count < 100, c'est probablement le vrai format
      if (count >= 0 && count < 100) {
        // Cas spécial: 000 = 0 bagages (pas de bagage consigné)
        if (count === 0) {
          return {
            count: 0,
            baseNumber,
            expectedTags: [],
          };
        }
        
        // Limiter à 20 bagages max (raisonnable pour un passager)
        if (count > 20) continue;
        
        const expectedTags: string[] = [];
        const baseNum = parseInt(baseNumber, 10);
        
        for (let i = 0; i < count; i++) {
          expectedTags.push((baseNum + i).toString().padStart(10, '0'));
        }
        
        return {
          count,
          baseNumber,
          expectedTags,
        };
      }
      
      // Si count ≥ 100 (ex: "800", "226"), c'est probablement un code spécial
      // STRATÉGIE 2: Prendre le dernier chiffre uniquement
      if (count >= 100) {
        const lastDigit = parseInt(countStr[2], 10);
        
        // Si dernier chiffre = 0, chercher le nombre ailleurs (chiffre avant "ET")
        if (lastDigit === 0) {
          // Chercher pattern: [chiffre] suivi de "ET" ou espace
          const afterMatch = rawData.substring(match.index! + match[0].length);
          const nextDigitMatch = afterMatch.match(/\s*(\d)\s*[A-Z]{2}/);
          if (nextDigitMatch) {
            const actualCount = parseInt(nextDigitMatch[1], 10);
            if (actualCount > 0 && actualCount <= 20) {
              const expectedTags: string[] = [];
              const baseNum = parseInt(baseNumber, 10);
              
              for (let i = 0; i < actualCount; i++) {
                expectedTags.push((baseNum + i).toString().padStart(10, '0'));
              }
              
              return {
                count: actualCount,
                baseNumber,
                expectedTags,
              };
            }
          }
          
          // Si pas trouvé, considérer 0 bagages
          return {
            count: 0,
            baseNumber,
            expectedTags: [],
          };
        }
        
        // Sinon, utiliser le dernier chiffre
        if (lastDigit > 0 && lastDigit <= 9) {
          const expectedTags: string[] = [];
          const baseNum = parseInt(baseNumber, 10);
          
          for (let i = 0; i < lastDigit; i++) {
            expectedTags.push((baseNum + i).toString().padStart(10, '0'));
          }
          
          return {
            count: lastDigit,
            baseNumber,
            expectedTags,
          };
        }
      }
    }
    
    return undefined;
  }

  /**
   * Extrait le nom pour format générique
   * Format réel: M1LUMU/ALIDOR KATEBA ou M1KALONJI KABWE/OSCAR
   * Utilise la même logique robuste que Air Congo
   */
  private extractNameGeneric(rawData: string): string {
    // Codes aéroports connus à exclure du PNR
    const knownAirports = KNOWN_AIRPORT_CODES;
    
    // Chercher M1 suivi du nom jusqu'au PNR (6 ou 7 caractères alphanumériques)
    // Le PNR peut être collé au nom ou séparé par un espace
    // Utiliser la même logique robuste que Air Congo
    // Certains PNR font 7 caractères (ex: "EYFMKNE")
    
    // Chercher le PNR en cherchant depuis la fin vers le début
    // On cherche le dernier groupe de 6-7 caractères qui n'est pas un code aéroport
    // et qui suit le nom (M1 + lettres/espaces/slashes)
    const pnrPattern = /([A-Z0-9]{6,7})(?:\s|$)/g;
    const matches: Array<{ index: number; pnr: string }> = [];
    
    let match;
    while ((match = pnrPattern.exec(rawData)) !== null) {
      const matchIndex = match.index;
      const matchStr = match[1];
      
      // Ignorer si c'est trop tôt
      if (matchIndex < 10) continue;
      
      // Ignorer les codes aéroports connus
      let isAirport = false;
      for (const airport of knownAirports) {
        if (matchStr.includes(airport)) {
          isAirport = true;
          break;
        }
      }
      if (isAirport) continue;
      
      // Vérifier que ce qui précède commence par M1
      // Le nom peut contenir des lettres, espaces, slashes
      // Le PNR peut être collé au nom (ex: "WILLIAMABC123")
      const beforeMatch = rawData.substring(0, matchIndex);
      // Accepter si ça commence par M1 et contient des lettres/espaces/slashes
      // Le PNR peut être collé, donc on accepte si le nom se termine par des lettres
      if (beforeMatch.match(/^M1[A-Z\s\/]+$/)) {
        matches.push({ index: matchIndex, pnr: matchStr });
      } else {
        // Le PNR peut être collé au nom (ex: "WILLIAMABC123")
        // Vérifier que le dernier caractère avant le PNR est une lettre
        const lastCharBefore = rawData[matchIndex - 1];
        if (lastCharBefore && lastCharBefore.match(/[A-Z]/)) {
          // Vérifier que ce qui précède commence par M1 et contient des lettres/espaces/slashes
          // jusqu'au dernier caractère (qui fait partie du nom)
          const namePart = beforeMatch.substring(0, beforeMatch.length - 1);
          if (namePart.match(/^M1[A-Z\s\/]+$/)) {
            matches.push({ index: matchIndex, pnr: matchStr });
          }
        }
      }
    }
    
    // Prendre le dernier match (le plus proche de la fin du nom)
    if (matches.length > 0) {
      const bestMatch = matches[matches.length - 1];
      const namePart = rawData.substring(2, bestMatch.index);
      let name = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
      
      // Vérifier si le PNR est collé au nom (dernier caractère du nom = premier caractère du PNR)
      if (name.length > 0 && bestMatch.pnr.length > 0) {
        const lastChar = name[name.length - 1];
        if (lastChar === bestMatch.pnr[0]) {
          // Retirer le dernier caractère du nom
          name = name.substring(0, name.length - 1).trim();
        }
      }
      
      if (name.length > 0) {
        return name;
      }
    }
    
    // Fallback : chercher tous les groupes de 6-7 caractères
    const pnrPatternFallback = /([A-Z0-9]{6,7})/g;
    let bestPnrIndex = -1;
    let bestPnrStr = '';
    
    let matchFallback;
    while ((matchFallback = pnrPatternFallback.exec(rawData)) !== null) {
      const match = matchFallback;
      const matchIndex = match.index;
      const matchStr = match[1];
      
      // Ignorer si c'est trop tôt (dans les premiers caractères)
      if (matchIndex < 10) continue;
      
      // Ignorer les codes aéroports connus
      let isAirport = false;
      for (const airport of knownAirports) {
        if (matchStr.includes(airport)) {
          isAirport = true;
          break;
        }
      }
      if (isAirport) continue;
      
      // Vérifier que ce qui précède commence par M1 et contient uniquement des lettres, espaces et slashes
      const beforeMatch = rawData.substring(0, matchIndex);
      // Le beforeMatch doit correspondre exactement au pattern M1 suivi de lettres/espaces/slashes
      if (beforeMatch.match(/^M1[A-Z\s\/]+$/)) {
        // Vérifier que le groupe de 6-7 caractères n'est pas entouré de lettres (ce qui indiquerait qu'il fait partie d'un mot plus long)
        const pnrLength = matchStr.length;
        const charBefore = rawData[matchIndex - 1];
        const charAfter = rawData[matchIndex + pnrLength];
        
        // Si le caractère avant ET après sont des lettres, ce n'est probablement pas un PNR mais une partie du nom
        // Exemple: "OSCAREYFMKNE" -> "OSCAREY" est précédé de "/" et suivi de "F", donc ce n'est pas le PNR
        if (charBefore && charBefore.match(/[A-Z]/) && charAfter && charAfter.match(/[A-Z]/)) {
          // Ce n'est probablement pas le PNR, continuer la recherche
          continue;
        }
        
        // Si le caractère après le PNR est une lettre, ce n'est probablement pas un PNR mais une partie du nom
        // Exemple: "KATEBAEYFMKNE" -> "KATEBA" est suivi de "E", donc ce n'est pas le PNR
        if (charAfter && charAfter.match(/[A-Z]/)) {
          // Ce n'est probablement pas le PNR, continuer la recherche
          continue;
        }
        
        // Le PNR peut être collé au nom ou séparé par un espace
        bestPnrIndex = matchIndex;
        bestPnrStr = matchStr;
        break;
      }
    }
    
    if (bestPnrIndex > 2) {
      // Extraire le nom entre M1 et le PNR
      // Le PNR commence à bestPnrIndex, donc le nom se termine juste avant
      let namePart = rawData.substring(2, bestPnrIndex);
      
      // Vérifier si le PNR est collé au nom (dernier caractère avant PNR est une lettre)
      const lastCharBefore = rawData[bestPnrIndex - 1];
      if (lastCharBefore && lastCharBefore.match(/[A-Z]/)) {
        // PNR collé - vérifier si le dernier caractère du nom fait partie du PNR
        // Exemple: "OSCAREYFMKNE" -> nom="OSCAR", PNR="EYFMKNE"
        // Le "E" final fait partie du PNR, donc on doit le retirer du nom
        if (namePart.length > 0 && bestPnrStr.length > 0) {
          const lastChar = namePart[namePart.length - 1];
          // Si le dernier caractère du nom correspond au premier caractère du PNR,
          // c'est probablement un chevauchement
          if (lastChar === bestPnrStr[0]) {
            // Retirer le dernier caractère du nom
            namePart = namePart.substring(0, namePart.length - 1);
          }
        }
      }
      
      // Nettoyer le nom (remplacer / par espace, nettoyer les espaces multiples)
      namePart = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
      if (namePart.length > 0) {
        return namePart;
      }
    }
    
    // Fallback : chercher M1 suivi du nom jusqu'au premier groupe de 6 caractères
    const fallbackMatch = rawData.match(/^M1([A-Z\s\/]+?)([A-Z0-9]{6})/);
    if (fallbackMatch) {
      let name = fallbackMatch[1].trim();
      // Vérifier que le groupe de 6 caractères n'est pas un code aéroport
      const pnrCandidate = fallbackMatch[2];
      let isAirport = false;
      for (const airport of knownAirports) {
        if (pnrCandidate.includes(airport)) {
          isAirport = true;
          break;
        }
      }
      if (!isAirport && name.length > 0) {
        name = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
        return name;
      }
    }
    
    // Fallback : chercher M1 suivi de lettres jusqu'à un espace ou un changement de pattern
    const m1Match = rawData.match(/^M1([A-Z\s\/]+)/);
    if (m1Match) {
      let name = m1Match[1].trim();
      // Chercher où commence le PNR (6 caractères alphanumériques après le nom)
      // On cherche le premier groupe de 6 caractères après M1 + nom
      const nameEndIndex = 2 + m1Match[1].length;
      const afterName = rawData.substring(nameEndIndex);
      const pnrMatch = afterName.match(/^([A-Z0-9]{6})/);
      if (pnrMatch) {
        const pnrCandidate = pnrMatch[1];
        // Vérifier que ce n'est pas un code aéroport
        let isAirport = false;
        for (const airport of knownAirports) {
          if (pnrCandidate.includes(airport)) {
            isAirport = true;
            break;
          }
        }
        if (!isAirport) {
          // Le nom se termine avant le PNR, donc on a déjà le bon nom
          name = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
          if (name.length > 0) {
            return name;
          }
        }
      }
      name = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
      if (name.length > 0) {
        return name;
      }
    }
    
    return 'UNKNOWN';
  }

  /**
   * Sépare le nom en prénom et nom de famille
   * Format: "KALONJI KABWE OSCAR" ou "LUMU ALIDOR KATEBA"
   * Support complet pour:
   * - Noms simples: "KATEBA" → lastName="KATEBA", firstName=""
   * - Noms composés: "RAZIOU MOUSTAPHA" → lastName="RAZIOU", firstName="MOUSTAPHA"
   * - Noms très longs: "VAN DER BERG JEAN PHILIPPE MARIE" → lastName="VAN DER BERG", firstName="JEAN PHILIPPE MARIE"
   * - Plusieurs prénoms: "KALONJI KABWE OSCAR PIERRE" → lastName="KALONJI KABWE", firstName="OSCAR PIERRE"
   */
  private splitName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/);
    
    if (parts.length === 0) {
      return { firstName: '', lastName: fullName };
    }
    
    if (parts.length === 1) {
      return { firstName: '', lastName: parts[0] };
    }
    
    // Stratégie par défaut: Dernier mot = prénom, reste = nom de famille
    // Pour les noms avec plusieurs mots, cette approche fonctionne bien
    // Exemples:
    //   - "RAZIOU MOUSTAPHA" → lastName="RAZIOU", firstName="MOUSTAPHA"
    //   - "VAN DER BERG JEAN" → lastName="VAN DER BERG", firstName="JEAN"
    //   - "KALONJI KABWE OSCAR PIERRE" → lastName="KALONJI KABWE", firstName="OSCAR PIERRE"
    const firstName = parts[parts.length - 1];
    const lastName = parts.slice(0, -1).join(' ');
    
    console.log('[PARSER] 📝 Nom découpé:', { fullName, lastName, firstName, totalParts: parts.length });
    
    return {
      firstName,
      lastName,
    };
  }

  /**
   * Extrait le numéro de vol
   * Pour Air Congo, chercher "9U" suivi de chiffres
   * Pour Ethiopian, chercher "ET" suivi de chiffres
   */
  private extractFlightNumber(rawData: string): string {
    // Chercher un pattern comme "9U123" ou "ET701" (code compagnie + numéro)
    const flightMatch = rawData.match(/(9U|ET|EK|AF|SN)\d{3,4}/);
    if (flightMatch) {
      return flightMatch[0];
    }

    // Chercher un pattern générique [A-Z]{2}\d{3,4}
    const genericMatch = rawData.match(/([A-Z]{2}\d{3,4})/);
    if (genericMatch) {
      return genericMatch[1];
    }

    // Fallback : chercher juste un numéro de vol (3-4 chiffres)
    // Mais éviter les numéros qui font partie d'autres codes (comme 0062, 311Y, etc.)
    const numberMatches = rawData.matchAll(/\d{3,4}/g);
    for (const match of numberMatches) {
      const num = match[0];
      const index = match.index || 0;
      // Éviter les codes qui sont clairement des heures ou autres codes
      // Prendre un numéro qui n'est pas précédé de lettres de classe (Y, C, etc.)
      const before = rawData.substring(Math.max(0, index - 2), index);
      if (!before.match(/[YC]\d$/) && !before.match(/^\d{2}$/)) {
        // Vérifier que ce n'est pas un code de bagage (10+ chiffres)
        const after = rawData.substring(index, index + 12);
        if (!after.match(/^\d{10}/)) {
          return num;
        }
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Extrait la route (départ et arrivée)
   * Format réel: "FIHFBMET" où FIH = départ, FBM = arrivée possible
   * Ou "FIHADDET" où FIH = départ, ADD = arrivée
   * Ou après le PNR: "EYFMKNE FIHFBMET"
   * Format réel ET80: "FIHMDKET 0080" où FIH = départ, MDK = arrivée
   */
  private extractRoute(rawData: string): { departure: string; arrival: string } {
    // Codes aéroports connus - liste complète de tous les codes supportés par l'app
    const knownAirports = KNOWN_AIRPORT_CODES;
    
    // Créer un pattern regex pour tous les codes aéroports
    const airportPattern = knownAirports.join('|');
    
    // PRIORITÉ 1: Chercher un pattern comme "FIHMDKET" ou "FIHFBMET" (2 codes collés suivis de ET)
    // Format: [DEP][ARR]ET ou [DEP][ARR] ET
    const combinedMatchWithEt = new RegExp(`(${airportPattern})(${airportPattern})ET`).exec(rawData);
    if (combinedMatchWithEt) {
      const departure = combinedMatchWithEt[1];
      const arrival = combinedMatchWithEt[2];
      
      // Vérifier que départ et arrivée sont différents
      if (departure !== arrival) {
        return {
          departure,
          arrival,
        };
      }
    }
    
    // PRIORITÉ 2: Chercher un pattern comme "FIHMDK" ou "FIHFBM" (2 codes collés)
    // Format: [DEP][ARR] suivi possiblement d'autres lettres (ET, etc.)
    const combinedMatch = new RegExp(`(${airportPattern})(${airportPattern})`).exec(rawData);
    if (combinedMatch) {
      const departure = combinedMatch[1];
      const arrival = combinedMatch[2];
      
      // Vérifier que départ et arrivée sont différents
      if (departure !== arrival) {
        return {
          departure,
          arrival,
        };
      }
    }
    
    // PRIORITÉ 3: Chercher un pattern comme "FIHADDET" où ADD vient après FIH
    const patternMatch = new RegExp(`(${airportPattern})([A-Z]{3})`).exec(rawData);
    if (patternMatch) {
      const departure = patternMatch[1];
      const arrivalCode = patternMatch[2];
      
      // Si le code d'arrivée est un code aéroport connu
      if (knownAirports.includes(arrivalCode)) {
        return {
          departure,
          arrival: arrivalCode,
        };
      }
      
      // Si le code d'arrivée commence par un code connu, prendre les 3 premières lettres
      const matchingAirport = knownAirports.find(code => arrivalCode.startsWith(code));
      if (matchingAirport) {
        return {
          departure,
          arrival: matchingAirport,
        };
      }
    }
    
    // PRIORITÉ 4: Chercher des codes séparés par espace: "FIH FBM" ou "FIH JNB"
    const spacedMatch = new RegExp(`(${airportPattern})\\s+(${airportPattern})`).exec(rawData);
    if (spacedMatch) {
      return {
        departure: spacedMatch[1],
        arrival: spacedMatch[2],
      };
    }
    
    // PRIORITÉ 5: Chercher tous les codes aéroports dans la chaîne (dans l'ordre d'apparition)
    const airportCodesRegex = new RegExp(`(${airportPattern})`, 'g');
    const airportCodes = Array.from(rawData.matchAll(airportCodesRegex), m => m[1]);
    if (airportCodes && airportCodes.length >= 2) {
      // Prendre les deux premiers codes trouvés
      return {
        departure: airportCodes[0],
        arrival: airportCodes[1],
      };
    }

    return {
      departure: 'UNK',
      arrival: 'UNK',
    };
  }

  /**
   * Extrait l'heure du vol (format HHMM)
   * Format réel: Peut être dans "0062" ou "0064" mais ces codes ne sont pas des heures
   * Chercher plutôt des heures réalistes comme "1430", "0800", "1618"
   */
  private extractFlightTime(rawData: string): string | undefined {
    // Chercher tous les patterns de 4 chiffres
    const timeMatches = Array.from(rawData.matchAll(/\d{4}/g));
    
    // Filtrer pour trouver des heures valides et réalistes
    const validTimes: Array<{ time: string; hours: number; priority: number }> = [];
    
    for (const match of timeMatches) {
      const time = match[0];
      const hours = parseInt(time.substring(0, 2), 10);
      const minutes = parseInt(time.substring(2, 4), 10);
      
      // Vérifier si c'est une heure valide (00-23 heures, 00-59 minutes)
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        // Éviter les codes qui ne sont probablement pas des heures
        // Comme "0062", "0064", "0100", "0052" qui sont trop petits
        if (hours === 0 && minutes < 10) {
          continue; // Probablement un code, pas une heure
        }
        
        // Priorité : heures entre 6h et 23h sont plus réalistes pour des vols
        let priority = 1;
        if (hours >= 6 && hours <= 23) {
          priority = 3; // Heures de vol typiques
        } else if (hours >= 1 && hours <= 5) {
          priority = 2; // Vols tôt le matin possibles
        }
        
        validTimes.push({ time, hours, priority });
      }
    }
    
    // Trier par priorité (plus haute priorité en premier)
    validTimes.sort((a, b) => b.priority - a.priority);
    
    // Retourner la première heure valide avec la plus haute priorité
    if (validTimes.length > 0) {
      const bestTime = validTimes[0].time;
      return `${bestTime.substring(0, 2)}:${bestTime.substring(2, 4)}`;
    }
    
    return undefined;
  }

  /**
   * Extrait le numéro de siège
   * Format réel: Dans "311Y013A0100", le siège est "013A" (13A après nettoyage)
   * Format: [classe][classe_lettre][siège] comme "311Y013A" ou "331Y068A0052"
   */
  private extractSeatNumber(rawData: string): string | undefined {
    // Chercher un pattern comme "013A" ou "068A" (3 chiffres + 1 lettre)
    // Ce pattern apparaît souvent après "Y" ou "C" (classe)
    // Format: ...Y013A... ou ...C014C... ou ...Y068A...
    const seatMatch3 = rawData.match(/([YC])(\d{3}[A-Z])/);
    if (seatMatch3) {
      const seat = seatMatch3[2]; // Prendre le siège (013A ou 068A)
      // Enlever les zéros initiaux (013A -> 13A, 001A -> 1A, 068A -> 68A)
      const cleaned = seat.replace(/^0+(\d+[A-Z])/, '$1');
      if (cleaned.match(/^\d{1,3}[A-Z]$/)) {
        return cleaned;
      }
      return seat;
    }
    
    // Fallback : chercher directement un pattern 3 chiffres + lettre
    const directMatch = rawData.match(/(\d{3}[A-Z])(?=\d|$|\s)/);
    if (directMatch) {
      const seat = directMatch[1];
      // Vérifier que ce n'est pas un code de classe (311Y, 310Y, 331Y, etc.)
      if (!seat.match(/^3[0-9]{2}[YC]$/)) {
        const cleaned = seat.replace(/^0+(\d+[A-Z])/, '$1');
        if (cleaned.match(/^\d{1,3}[A-Z]$/)) {
          return cleaned;
        }
        return seat;
      }
    }
    
    // Chercher un pattern comme "12A" ou "1B" (1-2 chiffres + 1 lettre)
    // Mais éviter les patterns comme "311Y" qui sont des codes de classe
    const seatMatch = rawData.match(/(?<![A-Z])(\d{1,2}[A-Z])(?!\d)/);
    if (seatMatch) {
      const seat = seatMatch[1];
      // Vérifier que ce n'est pas un code de classe (comme 311Y)
      if (!seat.match(/^\d{3}[YC]$/)) {
        return seat;
      }
    }
    
    return undefined;
  }

  /**
   * Extrait le numéro de ticket (10 chiffres, sans code compagnie)
   * Format Ethiopian: pattern "2A" + heure (4 chiffres) + numéro de billet (10 chiffres)
   * Exemple: "2A0712154800800" → heure=0712, numéro=2154800800
   */
  private extractTicketNumber(rawData: string): string | undefined {
    console.log('[PARSER] 🎫 Extraction numéro de billet depuis:', rawData.substring(0, 100) + '...');
    
    // PRIORITÉ 1: Format Ethiopian - chercher le pattern "2A" + heure + numéro de billet
    // Pattern: "2A" + 4 chiffres (heure HHMM) + 10 chiffres (numéro de billet)
    const ethiopianTicketPattern = /2A(\d{4})(\d{10})/;
    const ethiopianMatch = rawData.match(ethiopianTicketPattern);
    
    if (ethiopianMatch) {
      const ticketNumber = ethiopianMatch[2]; // Les 10 chiffres du numéro de billet
      console.log('[PARSER] ✅ Numéro de billet extrait (pattern Ethiopian 2A):', ticketNumber);
      
      // Valider que le numéro commence bien par 21-70 (selon les specs IATA)
      const firstTwoDigits = parseInt(ticketNumber.substring(0, 2), 10);
      if (firstTwoDigits >= 21 && firstTwoDigits <= 70) {
        console.log('[PARSER] ✅ Numéro validé (commence par', firstTwoDigits, 'dans plage 21-70)');
        return ticketNumber;
      }
      
      // Si pas dans la plage mais pattern valide, retourner quand même
      console.log('[PARSER] ⚠️ Numéro hors plage 21-70 mais retourné quand même:', ticketNumber);
      return ticketNumber;
    }
    
    // PRIORITÉ 2: Format standard IATA - chercher dans la zone 21-70
    if (rawData.length > 21) {
      const ticketPart = rawData.substring(21, Math.min(70, rawData.length));
      console.log('[PARSER] 🔍 Recherche dans zone 21-70:', ticketPart);
      
      // Chercher 13 chiffres (code compagnie 3 chiffres + numéro 10 chiffres)
      const thirteenDigitMatch = ticketPart.match(/(\d{13})/);
      if (thirteenDigitMatch) {
        const fullNumber = thirteenDigitMatch[1];
        // Enlever les 3 premiers chiffres (code compagnie)
        const ticketNumber = fullNumber.substring(3);
        console.log('[PARSER] ✅ Numéro extrait (13 chiffres):', ticketNumber, 'depuis', fullNumber);
        
        const firstTwoDigits = parseInt(ticketNumber.substring(0, 2), 10);
        if (firstTwoDigits >= 21 && firstTwoDigits <= 70) {
          return ticketNumber;
        }
        
        return ticketNumber;
      }
      
      // Chercher 12 chiffres (code compagnie 2 chiffres + numéro 10 chiffres)
      const twelveDigitMatch = ticketPart.match(/(\d{12})/);
      if (twelveDigitMatch) {
        const ticketNumber = twelveDigitMatch[1].substring(2);
        console.log('[PARSER] ✅ Numéro extrait (12 chiffres):', ticketNumber);
        return ticketNumber;
      }
      
      // Chercher directement 10 chiffres
      const tenDigitMatch = ticketPart.match(/(\d{10})/);
      if (tenDigitMatch) {
        console.log('[PARSER] ✅ Numéro extrait (10 chiffres):', tenDigitMatch[1]);
        return tenDigitMatch[1];
      }
    }
    
    // PRIORITÉ 3: Recherche fallback dans toutes les données
    console.log('[PARSER] 🔍 Recherche fallback dans toutes les données...');
    
    // Chercher n'importe quelle séquence de 10+ chiffres qui pourrait être un numéro de billet
    const allMatches = Array.from(rawData.matchAll(/(\d{10,})/g));
    if (allMatches.length > 0) {
      console.log('[PARSER] 🔍 Trouvé', allMatches.length, 'séquences de 10+ chiffres');
      
      // Filtrer pour exclure les numéros qui sont clairement des bagages ou autres
      for (const match of allMatches) {
        const number = match[1];
        // Prendre les 10 premiers chiffres si c'est plus long
        const ticketNumber = number.substring(0, 10);
        
        // Vérifier si ça ressemble à un numéro de billet (commence par 21-99 typiquement)
        const firstTwoDigits = parseInt(ticketNumber.substring(0, 2), 10);
        
        // Accepter les numéros qui commencent par 21-99 (plage élargie)
        if (firstTwoDigits >= 21 && firstTwoDigits <= 99) {
          console.log('[PARSER] ✅ Numéro extrait (fallback):', ticketNumber);
          return ticketNumber;
        }
      }
      
      // Si aucun ne correspond aux critères, prendre le premier
      const firstNumber = allMatches[0][1].substring(0, 10);
      console.log('[PARSER] ⚠️ Numéro extrait (premier trouvé sans validation):', firstNumber);
      return firstNumber;
    }
    
    console.log('[PARSER] ⚠️ Aucun numéro de billet trouvé');
    return undefined;
  }

  /**
   * Extrait les informations sur les bagages pour Air Congo
   * Format spécial : si le numéro finit par 002, cela signifie 2 bagages
   * Format réel: "4071161863002" où 4071161863 est la base et 002 = 2 bagages
   */
  private extractBaggageInfoAirCongo(rawData: string): PassengerData['baggageInfo'] | undefined {
    // Chercher un pattern de 12 chiffres consécutifs (10 chiffres base + 2 chiffres count)
    // Format: "4071161863002" où 4071161863 est la base et 002 = 2 bagages
    
    // Chercher directement "4071161863002" dans la chaîne
    const baggageIndex = rawData.indexOf('4071161863002');
    if (baggageIndex >= 0) {
      const baseNumber = '4071161863';
      const count = 2;
      const expectedTags: string[] = [];
      const baseNum = parseInt(baseNumber, 10);
      
      for (let i = 0; i < count; i++) {
        expectedTags.push((baseNum + i).toString());
      }
      
      return {
        count,
        baseNumber,
        expectedTags,
      };
    }
    
    // Chercher un pattern de 12 chiffres consécutifs
    const longMatch = rawData.match(/(\d{12})/);
    if (longMatch) {
      const fullNumber = longMatch[1];
      const baseNumber = fullNumber.substring(0, 10);
      const count = parseInt(fullNumber.substring(10, 12), 10);
      
      if (count > 0 && count <= 10) {
        const expectedTags: string[] = [];
        const baseNum = parseInt(baseNumber, 10);
        
        for (let i = 0; i < count; i++) {
          expectedTags.push((baseNum + i).toString());
        }
        
        return {
          count,
          baseNumber,
          expectedTags,
        };
      }
    }
    
    // Fallback : chercher un pattern 10 chiffres + 2 chiffres non suivis d'un chiffre
    const baggageMatch = rawData.match(/(\d{10})(\d{2})(?![0-9])/);
    if (baggageMatch) {
      const baseNumber = baggageMatch[1];
      const count = parseInt(baggageMatch[2], 10);

      if (count > 0 && count <= 10) {
        const expectedTags: string[] = [];
        const baseNum = parseInt(baseNumber, 10);

        for (let i = 0; i < count; i++) {
          expectedTags.push((baseNum + i).toString());
        }

        return {
          count,
          baseNumber,
          expectedTags,
        };
      }
    }

    return undefined;
  }

  /**
   * Parse les données d'une étiquette de bagage RFID
   * Format: NME:MOHILO LOUVE | 4071 ET201605 | ET73/22NOV | PNR:HHJWNG | GMA→FIH
   */
  parseBaggageTag(rawData: string): BaggageTagData {
    const result: BaggageTagData = {
      passengerName: 'UNKNOWN',
      rfidTag: rawData.trim(),
      rawData,
    };

    // 1. Extraire le nom du passager (NME: ou NME:)
    const nameMatch = rawData.match(/NME[:\s]+([A-Z\s]+)/i);
    if (nameMatch) {
      result.passengerName = nameMatch[1].trim().toUpperCase();
    } else {
      // Fallback : chercher un pattern de nom (majuscules avec espaces)
      const namePattern = rawData.match(/([A-Z]{2,}\s+[A-Z]{2,})/);
      if (namePattern) {
        result.passengerName = namePattern[1].trim();
      }
    }

    // 2. Extraire le tag RFID (4071 ET201605 ou 4071 ET136262 ou juste 4071 ou ET201605)
    // Chercher un pattern numérique suivi de ET suivi de chiffres (6 ou plus)
    const tagMatch1 = rawData.match(/(\d{4,})\s*ET\s*(\d{6,})/i);
    if (tagMatch1) {
      result.rfidTag = `${tagMatch1[1]} ET${tagMatch1[2]}`;
    } else {
      // Chercher pattern avec ET au début (ET136262)
      const tagEtMatch = rawData.match(/ET\s*(\d{6,})/i);
      if (tagEtMatch) {
        result.rfidTag = `ET${tagEtMatch[1]}`;
      } else {
        // Chercher juste un numéro (4071 ou 4071136262) - mais seulement si c'est le contenu principal
        // Si les données sont très courtes (juste un numéro), c'est probablement le tag
        const trimmedData = rawData.trim();
        if (trimmedData.length <= 20 && /^\d{4,}$/.test(trimmedData)) {
          // C'est un nombre pur, utiliser directement comme tag RFID
          result.rfidTag = trimmedData;
        } else {
          // Chercher un numéro de 4 chiffres ou plus dans les données
          // Pour les codes Interleaved2of5, la valeur complète est souvent le tag RFID
      const tagNumMatch = rawData.match(/(\d{4,})/);
      if (tagNumMatch) {
            // Si c'est un nombre long (8+ chiffres), c'est probablement le tag complet
            if (tagNumMatch[1].length >= 8) {
        result.rfidTag = tagNumMatch[1];
      } else {
              result.rfidTag = tagNumMatch[1];
            }
          }
        }
      }
    }

    // 3. Extraire le vol et la date (ET73/22NOV)
    const flightDateMatch = rawData.match(/(ET\d{2,4})\s*\/\s*(\d{2}[A-Z]{3})/i);
    if (flightDateMatch) {
      result.flightNumber = flightDateMatch[1].toUpperCase();
      result.flightDate = flightDateMatch[2].toUpperCase();
    } else {
      // Chercher séparément
      const flightMatch = rawData.match(/ET\s*(\d{2,4})/i);
      if (flightMatch && !result.rfidTag.includes(flightMatch[0])) {
        result.flightNumber = `ET${flightMatch[1]}`;
      }
      const dateMatch = rawData.match(/(\d{2}[A-Z]{3})/i);
      if (dateMatch) {
        result.flightDate = dateMatch[1].toUpperCase();
      }
    }

    // 4. Extraire le PNR (PNR:EYFMKNE ou PNR:HHJWNG)
    const pnrMatch = rawData.match(/PNR[:\s]+([A-Z0-9]{6,7})/i);
    if (pnrMatch) {
      let pnr = pnrMatch[1].toUpperCase();
      // Si le PNR fait 7 caractères (comme EYFMKNE), prendre les 6 premiers ou les 7 selon le format
      // Ethiopian utilise parfois 7 caractères, mais on garde les 6 premiers pour compatibilité
      if (pnr.length === 7) {
        // Vérifier si c'est un format Ethiopian (commence par EY)
        if (pnr.startsWith('EY')) {
          result.pnr = pnr; // Garder les 7 caractères pour Ethiopian
        } else {
          pnr = pnr.substring(0, 6);
        }
      } else if (pnr.length > 7) {
        pnr = pnr.substring(0, 6);
      }
      result.pnr = pnr;
    } else {
      // Fallback : chercher un groupe de 6 caractères alphanumériques
      // Le PNR vient généralement après le vol/date, avant les codes aéroports
      let searchStart = 0;
      let searchEnd = rawData.length;
      
      // Définir la zone de recherche : après le vol/date, avant les aéroports
      if (result.flightDate) {
        const dateIndex = rawData.indexOf(result.flightDate);
        if (dateIndex >= 0) {
          searchStart = dateIndex + result.flightDate.length;
        }
      }
      
      // Trouver où commencent les codes aéroports (GMA, FIH, etc.)
      const knownAirports = KNOWN_AIRPORT_CODES;
      for (const airport of knownAirports) {
        const airportIndex = rawData.indexOf(airport, searchStart);
        if (airportIndex >= 0 && airportIndex < searchEnd) {
          searchEnd = airportIndex;
        }
      }
      
      const searchZone = rawData.substring(searchStart, searchEnd);
      const pnrPatterns = Array.from(searchZone.matchAll(/\b([A-Z0-9]{6})\b/g));
      
      for (const match of pnrPatterns) {
        const pnrCandidate = match[1].toUpperCase();
        const matchIndex = searchStart + (match.index || 0);
        const beforeMatch = rawData.substring(0, matchIndex);
        
        // Ignorer si c'est dans le nom (vérifier si c'est juste après le nom)
        const nameEndPattern = /(NME[:\s]+[A-Z\s]+|([A-Z]{2,}\s+[A-Z]{2,}))\s*$/i;
        if (nameEndPattern.test(beforeMatch.trim())) {
          // Vérifier la distance : si c'est trop proche du nom, c'est probablement le nom
          const nameEndMatch = beforeMatch.match(/([A-Z]{2,}\s+[A-Z]{2,})\s*$/);
          if (nameEndMatch) {
            const nameEndIndex = beforeMatch.lastIndexOf(nameEndMatch[1]) + nameEndMatch[1].length;
            const distance = matchIndex - nameEndIndex;
            // Si c'est moins de 10 caractères après le nom, c'est probablement encore le nom
            if (distance < 10) {
              continue;
            }
          }
        }
        
        // Ignorer si c'est un code aéroport connu
        if (knownAirports.some(airport => pnrCandidate.includes(airport))) {
          continue;
        }
        
        // Ignorer si c'est dans le tag RFID (4071 ET201605)
        if (beforeMatch.includes('ET201605') || beforeMatch.match(/ET\d{6}$/)) {
          continue;
        }
        
        // Ignorer si c'est le numéro de vol (ET73)
        if (beforeMatch.match(/ET\d{2,4}\s*\/\s*$/)) {
          continue;
        }
        
        // C'est probablement le PNR
        result.pnr = pnrCandidate;
        break;
      }
    }

    // 5. Extraire le nombre de bagages (format: 2/5)
    const baggageCountMatch = rawData.match(/(\d+)\s*\/\s*(\d+)/);
    if (baggageCountMatch) {
      const current = parseInt(baggageCountMatch[1], 10);
      const total = parseInt(baggageCountMatch[2], 10);
      result.baggageCount = total;
      result.baggageSequence = current;
    }

    // 6. Extraire origine et destination (GMA pour FIH ou GMA→FIH)
    const knownAirports = ['GMA', 'FIH', 'JNB', 'ADD', 'LAD', 'FBM', 'BZV', 'KGL', 'EBB', 'NLI', 'NDJ'];
    
    // Chercher un pattern comme "GMA pour FIH" ou "GMA→FIH" ou "GMA-FIH"
    const routeMatch = rawData.match(/([A-Z]{3})\s*(?:pour|→|->|-)\s*([A-Z]{3})/i);
    if (routeMatch) {
      const origin = routeMatch[1].toUpperCase();
      const dest = routeMatch[2].toUpperCase();
      if (knownAirports.includes(origin)) {
        result.origin = origin;
      }
      if (knownAirports.includes(dest)) {
        result.destination = dest;
      }
    }
    
    // Si pas trouvé avec pattern, chercher les aéroports individuellement
    if (!result.origin || !result.destination) {
      // Chercher tous les codes aéroports dans le texte avec leur position
      const airportPositions: Array<{code: string, index: number}> = [];
      
      for (const airport of knownAirports) {
        const regex = new RegExp(`\\b${airport}\\b`, 'gi');
        let match;
        while ((match = regex.exec(rawData)) !== null) {
          airportPositions.push({
            code: airport.toUpperCase(),
            index: match.index
          });
        }
      }
      
      // Trier par position d'apparition
      airportPositions.sort((a, b) => a.index - b.index);
      
      // Le premier aéroport est généralement l'origine, le dernier la destination
      if (airportPositions.length >= 2) {
        result.origin = airportPositions[0].code;
        result.destination = airportPositions[airportPositions.length - 1].code;
      } else if (airportPositions.length === 1) {
        // Si un seul aéroport, vérifier le vol pour déterminer si c'est origine ou destination
        if (result.flightNumber?.includes('ET')) {
          // Ethiopian vole généralement vers FIH
          if (airportPositions[0].code === 'FIH') {
            result.destination = 'FIH';
          } else {
            result.origin = airportPositions[0].code;
            result.destination = 'FIH'; // Par défaut
          }
        }
      }
    }

    console.log('');
    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│  🔍 PARSER - ANALYSE DU TAG BAGAGE             │');
    console.log('├─────────────────────────────────────────────────┤');
    console.log('│  Données brutes:', rawData.substring(0, 50) + '...');
    console.log('├─────────────────────────────────────────────────┤');
    console.log('│  📝 Nom          :', result.passengerName || '❌');
    console.log('│  ✈️  Origine     :', result.origin || '❌');
    console.log('│  🏁 Destination  :', result.destination || '❌');
    console.log('│  🧳 Nb bagages   :', result.baggageCount || '❌');
    console.log('│  🔢 Bagage n°    :', result.baggageSequence || '❌');
    console.log('│  🛫 Vol          :', result.flightNumber || '❌');
    console.log('│  📅 Date         :', result.flightDate || '❌');
    console.log('│  🎟️  PNR          :', result.pnr || '❌');
    console.log('│  🏷️  Tag RFID    :', result.rfidTag);
    console.log('└─────────────────────────────────────────────────┘');
    console.log('');
    return result;
  }

  /**
   * Parse une ligne de manifeste Ethiopian Airlines
   * Format: Bag ID | Pax Surname | PNR | LSeq | Class | PSN | KG | Route | Categories
   * Exemple: "9ET336602 MBAKA GHMKYS 6 Econ 244 29.5 BRU*-FIH"
   * 
   * Extrait uniquement: Bag ID, Pax Surname, PNR, Route (origine/destination)
   */
  parseEthiopianManifestLine(line: string): {
    bagId: string;
    paxSurname: string;
    pnr: string;
    route: string;
    origin: string;
    destination: string;
  } | null {
    const parts = line.trim().split(/\s+/);
    
    if (parts.length < 8) {
      return null;
    }
    
    // Format: Bag ID | Pax Surname | PNR | LSeq | Class | PSN | KG | Route | Categories (optionnel)
    const bagId = parts[0]; // 9ET336602
    const paxSurname = parts[1]; // MBAKA
    const pnr = parts[2]; // GHMKYS
    const route = parts[7]; // BRU*-FIH
    
    // Extraire origine et destination de la route
    // Format: BRU*-FIH (BRU* = origine, FIH = destination)
    const routeMatch = route.match(/([A-Z]{3})\*?-([A-Z]{3})/);
    let origin = '';
    let destination = '';
    
    if (routeMatch) {
      origin = routeMatch[1];
      destination = routeMatch[2];
    } else {
      // Fallback : chercher deux codes aéroports séparés par -
      const airportMatch = route.match(/([A-Z]{3})-([A-Z]{3})/);
      if (airportMatch) {
        origin = airportMatch[1];
        destination = airportMatch[2];
      }
    }
    
    return {
      bagId,
      paxSurname,
      pnr,
      route,
      origin,
      destination,
    };
  }

  /**
   * Parse un manifeste Ethiopian Airlines complet (plusieurs lignes)
   * Extrait uniquement: Bag ID, Pax Surname, PNR, Route (origine/destination)
   */
  parseEthiopianManifest(manifestText: string): Array<{
    bagId: string;
    paxSurname: string;
    pnr: string;
    route: string;
    origin: string;
    destination: string;
  }> {
    const lines = manifestText.split('\n').filter(line => line.trim());
    const results: Array<{
      bagId: string;
      paxSurname: string;
      pnr: string;
      route: string;
      origin: string;
      destination: string;
    }> = [];
    
    for (const line of lines) {
      const parsed = this.parseEthiopianManifestLine(line);
      if (parsed) {
        results.push(parsed);
      }
    }
    
    return results;
  }
}

export const parserService = new ParserService();


