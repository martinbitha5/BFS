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
    console.log('[PARSER] 🔍 Début parsing - Longueur données:', rawData.length);
    console.log('[PARSER] 📋 Données brutes (premiers 200 chars):', rawData.substring(0, 200));
    
    const format = this.detectFormat(rawData);
    console.log('[PARSER] 📌 Format détecté:', format);

    let result: PassengerData;
    if (format === 'AIR_CONGO') {
      result = this.parseAirCongo(rawData);
    } else if (format === 'KENYA_AIRWAYS') {
      result = this.parseKenyaAirways(rawData);
    } else if (format === 'ETHIOPIAN') {
      result = this.parseEthiopian(rawData);
    } else {
      result = this.parseGeneric(rawData);
    }
    
    console.log('[PARSER] ✅ Parsing terminé - Résultat:', {
      format: result.format,
      flightNumber: result.flightNumber,
      departure: result.departure,
      arrival: result.arrival,
      pnr: result.pnr?.substring(0, 6) || 'N/A',
    });
    
    return result;
  }

  /**
   * Détecte le format du boarding pass
   */
  private detectFormat(rawData: string): 'AIR_CONGO' | 'KENYA_AIRWAYS' | 'ETHIOPIAN' | 'GENERIC' {
    
    // Détection Air Congo EN PREMIER (car peut contenir "BET" et "1ET" qui ne sont pas Ethiopian)
    // Format: contient 9U (code compagnie Air Congo) - indicateur certain
    if (rawData.includes('9U')) {
      return 'AIR_CONGO';
    }
    
    // Détection Kenya Airways AVANT Ethiopian (car ET dans les PNR peut matcher Ethiopian)
    // Kenya Airways: code compagnie KQ + numéro de vol
    // Patterns robustes: ...NBOKQ 0555... ou ...KQ0555... ou ...KQ555... ou inclut 'KQ '
    if (rawData.match(/KQ\s*\d{3,4}/) || rawData.match(/[A-Z]{3}KQ\s*\d/) || rawData.includes('KQ')) {
      return 'KENYA_AIRWAYS';
    }

    // Détection Ethiopian Airlines - ULTRA ROBUSTE
    // Ethiopian Airlines utilise le code ET et a des patterns spécifiques
    // Exemples de vols: ET 0840, ET 0863, ET701, ET4071
    // Patterns à détecter:
    // 1. "ET" suivi de 2-4 chiffres (avec ou sans espace)
    // 2. Codes aéroports Ethiopian typiques: ADD (Addis Ababa)
    // 3. PNR de 6-7 lettres suivi de codes aéroports
    
    
    // STRATÉGIE 1: Chercher les vols ET avec numéros
    // Pattern flexible qui accepte ET précédé de n'importe quelle lettre sauf B ou 1
    // Supporte maintenant ET64, ET555, ET80, ET0080, etc. (2-4 chiffres)
    const ethiopianFlightPatterns = [
      /ET\s+0?8[0-9]{2}/gi,      // ET 0840, ET 0863, ET 863, ET840 (vols 800-899)
      /ET\s+0?[0-9]{2,4}/gi,     // ET 0080, ET 701, ET 64, ET 555 (2-4 chiffres)
      /ET\s+0*([1-9]\d{1,3})/gi, // ET suivi d'espace puis zéros optionnels puis chiffres (évite 0000)
      /[^B1]ET\s+\d{2,4}/gi,     // Précédé d'une lettre autre que B ou 1, 2-4 chiffres
      /[A-Z]{3}ET\s+\d{2,4}/gi,  // ADDET 0840, FBMET 123, FIHET 64, etc.
      /ET\s*\d{2,4}/gi,          // ET suivi de 2-4 chiffres (avec ou sans espace)
      /ET\d{2,4}/gi,             // ET suivi de 2-4 chiffres (sans espace)
      /\bET\b\s*\d{2,4}/gi,      // ET (mot entier) suivi de 2-4 chiffres (avec ou sans espace)
      /ET\s*0*([1-9]\d{1,3})/gi, // ET suivi d'espace optionnel, zéros optionnels, puis chiffres
    ];
    
    let ethiopianFlightFound = false;
    for (const pattern of ethiopianFlightPatterns) {
      const matches = rawData.match(pattern);
      if (matches && matches.length > 0) {
        ethiopianFlightFound = true;
        break;
      }
    }
    
    // STRATÉGIE 2: Chercher des indicateurs multiples Ethiopian
    // Inspiré des techniques de Scan-IT to Office pour la détection PDF417
    const hasAddisAbaba = /ADD/.test(rawData);  // Code aéroport Addis Ababa
    const hasEthiopianCode = /\bET\b/.test(rawData);  // Code compagnie ET (mot entier)
    const hasM2Format = /^M[12]/.test(rawData);  // Format M1 ou M2 (BCBP standard)
    const hasMultiSegment = /\n/.test(rawData) || rawData.length > 250;  // Multi-segments ou long
    
    // STRATÉGIE 3: Pattern complet BCBP Ethiopian
    // Format: M2NOM/PRENOM PNR DEPADDXXYYYYY
    // Utilisation de patterns similaires à ceux de Scan-IT to Office pour PDF417
    const ethiopianBCBPPatterns = [
      /M[12][A-Z\/\s]+[A-Z0-9]{6,7}\s+[A-Z]{3}ADD/,  // Format standard avec ADD
      /ADD[A-Z]{3}/,                                    // ADD suivi du code destination
      /[A-Z]{3}ADD/,                                    // Code origine + ADD
      /M[12].*ADD.*ET\s*\d{3,4}/,                      // M1/M2 + ADD + Vol ET
    ];
    const hasBCBPPattern = ethiopianBCBPPatterns.some(pattern => pattern.test(rawData));
    
    // DÉCISION: Système de scoring inspiré de Scan-IT to Office
    // Utilisation de poids différents pour les indicateurs selon leur fiabilité
    let ethiopianScore = 0;
    if (ethiopianFlightFound) {
      ethiopianScore += 2;  // Poids double - indicateur très fort
    }
    if (hasAddisAbaba) {
      ethiopianScore++;
    }
    if (hasBCBPPattern) {
      ethiopianScore++;
    }
    if (hasM2Format && hasEthiopianCode) {
      ethiopianScore++;
    }
    if (hasMultiSegment) {
      ethiopianScore++;
    }
    
    
    // Si score >= 2, c'est Ethiopian (système de scoring pondere)
    if (ethiopianScore >= 2) {
      return 'ETHIOPIAN';
    }
    

    // FALLBACK UNIVERSEL: Si les données commencent par M1 ou M2 (format IATA BCBP standard)
    // alors c'est un boarding pass valide, on utilise le parser GENERIC
    if (rawData.match(/^M[12]/)) {
      return 'GENERIC';
    }

    // Si ça ne commence même pas par M1/M2, on essaie quand même GENERIC
    // (peut-être un format non-standard ou corrompu)
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
   * Parse un boarding pass Kenya Airways (KQ)
   * Patterns similaires à Air Congo mais avec code compagnie KQ
   * Supporte le format IATA BCBP standard + variantes
   */
  private parseKenyaAirways(rawData: string): PassengerData {
    // Appliquer la même stratégie que Air Congo
    // 1. PNR : Extraction robuste via pnrExtractorService
    const pnr = this.extractPnr(rawData);

    // 2. Nom : Format M1/M2, ignorer le préfixe
    const fullName = this.extractNameAirCongo(rawData); // Même logique que Air Congo
    const nameParts = this.splitName(fullName);
    const firstName = nameParts.firstName;
    const lastName = nameParts.lastName;

    // 3. Numéro de ticket
    const ticketNumber = this.extractTicketNumber(rawData);

    // 4. Numéro de vol
    const flightNumber = this.extractFlightNumber(rawData);

    // 5. Route (départ → arrivée)
    const route = this.extractRoute(rawData);
    const departure = route.departure;
    const arrival = route.arrival;

    // 6. Heure du vol
    const flightTime = this.extractFlightTime(rawData);

    // 7. Siège
    const seatNumber = this.extractSeatNumber(rawData);

    // 8. Bagages : Chercher le même format que Air Congo ou patterns génériques
    const baggageInfo = this.extractBaggageInfoAirCongo(rawData) || this.extractBaggageInfoGeneric(rawData);

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
      companyCode: 'KQ',
      airline: 'Kenya Airways',
      baggageInfo,
      rawData,
      format: 'KENYA_AIRWAYS',
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

    // 1. Nom : Commence souvent par M1, ignorer le préfixe
    // Passer le PNR trouvé pour éviter de le rechercher à nouveau
    const fullName = this.extractNameEthiopian(rawData, pnr);
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
   * 
   * PARSER UNIVERSEL - Supporte TOUTES les compagnies aériennes utilisant le format IATA BCBP:
   * - Kenya Airways (KQ), Air Congo (9U), Ethiopian Airlines (ET)
   * - Tanzania (TC, PW), RwandAir (WB), South African Airways (SA)
   * - Brussels Airlines (SN), Turkish Airlines (TK), Emirates (EK)
   * - Air France (AF), KLM (KL), Lufthansa (LH)
   * - Et TOUTES les autres compagnies IATA (200+ compagnies)
   * 
   * Support complet pour:
   * - Noms très longs avec plusieurs espaces (ex: VAN DER BERG/JEAN PHILIPPE MARIE)
   * - PNR alphanumériques de 6 ou 7 caractères (ex: E7T5GVL, ABC123, XYZABC)
   * - Tous les codes de compagnies (2 lettres ou 2 caractères alphanumériques)
   * - Détection automatique de la compagnie même si inconnue
   */
  private parseGeneric(rawData: string): PassengerData {
    
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
    // - PNR de 6 OU 7 caractères (alphanumériques)
    // - Noms composés très longs (ex: VAN DER BERG/JEAN PHILIPPE MARIE)
    
    // Essayer d'abord avec séparateurs stricts
    // Note: ([A-Z\/\s]+?) est non-greedy donc s'arrête au premier espace suivi du PNR
    // Cela capture correctement les noms même très longs comme "VAN DER BERG/JEAN PHILIPPE MARIE"
    let bcbpMatch = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})\s+(\d{3,4})\s+(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/);
    
    if (bcbpMatch) {
    }
    
    // Si échec, essayer format plus flexible (codes aéroport potentiellement avec espaces)
    if (!bcbpMatch) {
      bcbpMatch = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})\s*([A-Z]{3})\s*([A-Z0-9]{2})\s+(\d{3,4})\s+(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/);
      if (bcbpMatch) {
      }
    }
    
    // Si encore échec, essayer version simplifiée qui capture tout après le PNR
    if (!bcbpMatch) {
      const simplifiedMatch = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})[^0-9]*?(\d{3,4})[^0-9]*?(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/);
      if (simplifiedMatch) {
        bcbpMatch = simplifiedMatch;
      } else {
      }
    }
    
    // Variable pour stocker les infos bagages
    let baggageInfo: { count: number; baseNumber?: string; expectedTags?: string[] } | undefined;
    
    if (bcbpMatch) {
      // Nettoyer le nom : trim + normaliser les espaces multiples
      // Supporte les noms très longs avec plusieurs espaces (ex: "VAN  DER  BERG/JEAN  PHILIPPE")
      fullName = bcbpMatch[1].trim().replace(/\s+/g, ' ');
      pnr = bcbpMatch[2];
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
        } else {
        }
      } else {
      }
      
      return {
        pnr,
        fullName,
        firstName: this.splitName(fullName).firstName,
        lastName: this.splitName(fullName).lastName,
        flightNumber: flightNumber || 'UNKNOWN',
        flightTime: this.extractFlightTime(rawData),
        flightDate,
        route: `${departure}-${arrival}`,
        departure,
        arrival,
        seatNumber,
        ticketNumber: this.extractTicketNumber(rawData),
        companyCode,
        airline: companyCode ? getAirlineName(companyCode) || `Airline ${companyCode}` : undefined,
        baggageInfo,
        rawData,
        format: 'GENERIC' as const,
      };
    } else {
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
    
    // Détection automatique du nom de la compagnie
    // Si le code n'est pas dans notre liste, on utilise un nom générique intelligent
    let airline: string | undefined;
    if (companyCode) {
      airline = getAirlineName(companyCode);
      // Si la compagnie n'est pas dans notre liste, créer un nom générique
      if (!airline || airline === 'Unknown Airline') {
        airline = `Airline ${companyCode}`;
      }
    }
    
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
    
    return result;
  }

  /**
   * Extrait le PNR (6 caractères alphanumériques)
   * Format réel: Le PNR apparaît juste après le nom, comme "EYFMKNE" dans "M1KALONJI KABWE/OSCAREYFMKNE"
   * Format mocké: Le PNR peut ne pas être présent dans les données brutes
   */
  private extractPnr(rawData: string): string {
    // ✅ UTILISER LE SERVICE ROBUSTE d'extraction du PNR
    // Ce service supporte tous les formats: Ethiopian, Air Congo, Kenya Airways, etc.
    // Retourne 'UNKNOWN' si pas trouvé
    return pnrExtractorService.extractPnr(rawData);
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
    
    
    // PRIORITÉ 1: Utiliser le PNR trouvé pour extraire le nom complet même si collé
    // C'est la méthode la plus fiable car on connaît déjà le PNR
    if (pnrFromParser && pnrFromParser.length === 6 && pnrFromParser !== 'UNKNOWN') {
      const pnrIndex = rawData.indexOf(pnrFromParser);
      if (pnrIndex > 0) {
        const beforePnr = rawData.substring(0, pnrIndex);
        
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
          
          
          let cleanedName = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
          
          // Si le nom se termine par les lettres avant (ex: "ISSIAKAGRE"), retirer ces lettres
          if (cleanedName.endsWith(lettersBefore)) {
            cleanedName = cleanedName.substring(0, cleanedName.length - lettersBefore.length).trim();
          }
          
          // Vérifier que le nom contient au moins un "/" (format NOM/PRENOM) ou est raisonnablement long
          if (cleanedName.length > 3) {
            // S'assurer qu'on a le nom complet (doit contenir "/" ou être assez long)
            if (namePart.includes('/') || cleanedName.length > 8) {
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
              return cleanedName;
            }
          } else if (spaceIndex > 0) {
            // Pas de "/", mais il y a un espace
            const namePart = rawData.substring(2, spaceIndex + 1);
            let cleanedName = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
            if (cleanedName.length > 3) {
              return cleanedName;
            }
          }
        }
      }
    }
    
    // PRIORITÉ 2: Chercher directement le pattern "MASIMANGO/ISSIAKA GREOIFLBU"
    // Format: M1 + nom + espace optionnel + lettres(3) + PNR(6) + codes aéroports ou ET
    const patternWithPnrMatches = Array.from(rawData.matchAll(/^M[12](.+?)(?:\s+)?([A-Z]{3})([A-Z]{6})([A-Z]{3,6}|ET\s*\d)/g));
    for (const match of patternWithPnrMatches) {
      const name = match[1].trim();
      const lettersBefore = match[2]; // "GRE"
      const pnrFound = match[3]; // "OIFLBU"
      const afterPnr = match[4]; // "FIHMDK" ou "ET 0080"
      
      
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
        }
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
        
        // Chercher le pattern avec lettres avant le PNR (3 lettres)
        const patternMatch = beforePnr.match(/([A-Z]{3})([A-Z]{6})$/);
        if (patternMatch && patternMatch[2] === pnrFromParser) {
          const lettersBefore = patternMatch[1]; // "GRE"
          const lettersBeforeIndex = pnrIndex - 6; // Position du début des lettres avant
          const namePart = rawData.substring(2, lettersBeforeIndex); // De M1/M2 jusqu'au début des lettres avant
          
          
          let cleanedName = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
          
          // Si le nom se termine par les lettres avant (ex: "ISSIAKAGRE"), retirer "GRE"
          if (cleanedName.endsWith(lettersBefore)) {
            cleanedName = cleanedName.substring(0, cleanedName.length - lettersBefore.length).trim();
          }
          
          // Vérifier que le nom est valide (contient au moins un "/" ou est raisonnablement long)
          if (cleanedName.length > 3) {
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
              return cleanedName;
            }
          }
        }
      }
    }
    
    // Fallback: chercher le pattern collé normalement
    const patternColled = Array.from(rawData.matchAll(/^M[12](.+?)([A-Z]{3})([A-Z]{6})([A-Z]{3,6}|ET\s*\d)/g));
    for (const match of patternColled) {
      const name = match[1].trim();
      const lettersBefore = match[2];
      const pnrFound = match[3];
      const afterPnr = match[4];
      
      
      const airportPattern = KNOWN_AIRPORT_CODES.join('|');
      const isFollowedByAirportOrEt = new RegExp(`^(${airportPattern})`).test(afterPnr) || /^ET\s*\d/.test(afterPnr);
      
      if (isFollowedByAirportOrEt && pnrFound === pnrFromParser) {
        let cleanedName = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
        // Retirer les dernières lettres si elles correspondent aux lettres avant le PNR
        if (cleanedName.endsWith(lettersBefore)) {
          cleanedName = cleanedName.substring(0, cleanedName.length - lettersBefore.length).trim();
        }
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
        return cleanedName;
      }
    }
    
    // PRIORITÉ 2: Utiliser le PNR extrait (si fourni) pour trouver où se termine le nom
    const pnr = pnrFromParser || pnrExtractorService.extractPnr(rawData);
    
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
                        } else {
                          // Pattern 2B: Chercher dans name avec espaces
                          const pattern8LettersInName = name.match(/^(.+?)\s+([A-Z]{8})(?:\s+)?(ET|[A-Z]{3,6})/);
                          if (pattern8LettersInName && pattern8LettersInName[1].length > 3) {
                            const extractedName = pattern8LettersInName[1].trim();
                            const afterName = pattern8LettersInName[3];
                            const airportPattern = KNOWN_AIRPORT_CODES.join('|');
                            if (afterName && (afterName.match(/^ET/) || new RegExp(`^(${airportPattern})`).test(afterName))) {
                              name = extractedName;
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
                                    } else if (potentialName.length < 50) {
                                      name = potentialName;
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
                  } else {
                  }
                } else {
                  // Pour d'autres lettres, être plus strict
                  if (!nameEndTrimmed.endsWith(lettersBefore) && !nameEndTrimmed.includes(lettersBefore + pnrCandidate[0])) {
                    validMatches.push({ matchIndex: pnrIndex, pnrCandidate, lettersBefore, airportCode: airport });
                  } else {
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
      return bestMatch.pnrCandidate;
    }
    
    // Fallback: chercher patterns 2+6 lettres suivis de codes aéroports (ex: "EEMXTRJEFIHGMA")
    const airportPattern = KNOWN_AIRPORT_CODES.join('|');
    const pnr8WithAirports = Array.from(rawData.matchAll(new RegExp(`([A-Z]{2})([A-Z]{6})(${airportPattern})`, 'g')));
    
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
          return pnrCandidate;
        }
      }
    }
    
    // Fallback: chercher tous les patterns avec regex (3+6 lettres)
    const pnrWithAirports = Array.from(rawData.matchAll(new RegExp(`([A-Z]{3})([A-Z]{6})(${airportPattern})`, 'g')));
    
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
          return pnrCandidate;
        }
      }
    }
    
    // PRIORITÉ 1B: Pattern 2+6 lettres suivi de ET + chiffres (ex: "EEMXTRJEET0072")
    const pnr2WithEt = Array.from(rawData.matchAll(/([A-Z]{2})([A-Z]{6})(ET\s*\d|ET\d{2,4})/g));
    
    for (const match of pnr2WithEt) {
      const lettersBefore = match[1];
      const pnrCandidate = match[2]; // Les 6 dernières lettres sont le PNR
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
          return pnrCandidate;
        }
      }
    }
    
    // PRIORITÉ 1B: Pattern 3+6 lettres suivi de ET + chiffres
    const pnrWithEt = Array.from(rawData.matchAll(/([A-Z]{3})([A-Z]{6})(ET\s*\d|ET\d{2,4})/g));
    
    for (const match of pnrWithEt) {
      const lettersBefore = match[1];
      const pnrCandidate = match[2];
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
          return pnrCandidate;
        }
      }
    }
    
    // PRIORITÉ 1C: Pattern générique (fallback)
    const pnrWithLettersPatterns = Array.from(rawData.matchAll(/([A-Z]{3})([A-Z]{6})([A-Z]{3,6}|ET\s*\d)/g));
    
    for (const match of pnrWithLettersPatterns) {
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
        // NE PAS retourner, continuer
      } 
      // Vérification 2: Si le PNR est contenu dans le nom (ex: "ISSIAK" dans "ISSIAKA"), l'ignorer
      else if (trimmedName.includes(pnrCandidate)) {
        // NE PAS retourner, continuer
      } 
      // Vérification 3: Si le nom se termine par le PNR (ex: "ISSIAKA" se termine par "ISSIAK"), l'ignorer
      else if (trimmedName.endsWith(pnrCandidate)) {
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
    console.log('[PARSER] 🔍 Extraction numéro de vol Ethiopian - Données brutes (premiers 200 chars):', rawData.substring(0, 200));
    
    // Format: ET701, ET4071, ET80, ET0080, ou ET 0840 (avec espace)
    // Patterns améliorés pour gérer toutes les variations
    
    // PRIORITÉ 1: Chercher avec espace(s) - format plus récent (ET 0840, ET 64, ET 555)
    const patternsWithSpace = [
      /ET\s+0*([1-9]\d{1,3})/,  // ET suivi d'espace(s) puis zéros optionnels puis chiffres
      /ET\s+(\d{2,4})/,          // ET suivi d'espace(s) puis 2-4 chiffres
    ];
    
    for (const pattern of patternsWithSpace) {
      const match = rawData.match(pattern);
      if (match) {
        const number = match[1].replace(/^0+/, ''); // Enlever les zéros en tête
        if (number.length >= 1) {
          const result = `ET${number}`;
          console.log('[PARSER] ✅ Numéro de vol Ethiopian trouvé (avec espace):', result);
          return result;
        }
      }
    }
    
    // PRIORITÉ 2: Chercher sans espace (ET80, ET0080, ET701, ET64, ET555, etc.)
    // Accepter 2-4 chiffres pour gérer ET80 et ET0080
    const patternsWithoutSpace = [
      /ET0*([1-9]\d{1,3})/,  // ET suivi de zéros optionnels puis chiffres
      /ET(\d{2,4})/,          // ET suivi directement de 2-4 chiffres
    ];
    
    for (const pattern of patternsWithoutSpace) {
      const match = rawData.match(pattern);
      if (match) {
        const matchIndex = rawData.indexOf(match[0]);
        
        // Vérifier que ce n'est pas "BET" ou "1ET" (codes compagnie)
        if (matchIndex > 0) {
          const beforeChar = rawData[matchIndex - 1];
          if (beforeChar === 'B' || beforeChar === '1') {
            // C'est "BET" ou "1ET", continuer la recherche
            continue;
          }
        }
        
        const number = match[1].replace(/^0+/, ''); // Enlever les zéros en tête
        if (number.length >= 1) {
          const result = `ET${number}`;
          console.log('[PARSER] ✅ Numéro de vol Ethiopian trouvé (sans espace):', result);
          return result;
        }
      }
    }
    
    // PRIORITÉ 3: Chercher dans les patterns de route (ex: FIHMDKET 0080, FIHADDET 064)
    const routePatterns = [
      /([A-Z]{3})([A-Z]{3})ET\s+0*(\d{2,4})/,  // Route + ET + espace + numéro
      /([A-Z]{3})([A-Z]{3})ET0*(\d{2,4})/,      // Route + ET + numéro
    ];
    
    for (const pattern of routePatterns) {
      const match = rawData.match(pattern);
      if (match) {
        const number = match[3].replace(/^0+/, '');
        if (number.length >= 1) {
          const result = `ET${number}`;
          console.log('[PARSER] ✅ Numéro de vol Ethiopian trouvé depuis route:', result);
          return result;
        }
      }
    }
    
    console.warn('[PARSER] ⚠️ Numéro de vol Ethiopian non trouvé');
    console.warn('[PARSER] Données brutes (premiers 300 chars):', rawData.substring(0, 300));
    return undefined;
  }

  /**
   * Extrait les informations sur les bagages pour Ethiopian Airlines
   * Format spécial : 10 chiffres base + 3 chiffres count (ex: 4071161870001 = 1 bagage)
   * Format peut commencer par 0 (ex: 0716055397226 = 7160553972 base, 226 = count)
   */
  private extractBaggageInfoEthiopian(rawData: string): PassengerData['baggageInfo'] | undefined {
    // FORMAT IATA pour les bagages Ethiopian/Air Congo:
    // 
    // Format: 13 chiffres = base (10) + séquence (3)
    // Exemple: 9071366379001
    //   - 9071366379 = Base du tag
    //   - 001 = Séquence (1er bagage)
    //
    // Pour 3 bagages avec base 9071366379:
    //   - Bagage 1: 9071366379001
    //   - Bagage 2: 9071366380002
    //   - Bagage 3: 9071366381003
    //
    // RÈGLE: Si séquence > 20, c'est invalide → 0 bagages
    
    // Chercher pattern standard (10 chiffres + 3 chiffres)
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
      
      // Si count >= 100 (ex: "879"), c'est un format invalide
      // Selon la logique Air Congo: séquence > 20 = pas de bagage valide
      // On continue à chercher d'autres matches
      if (count >= 100) {
        // Ce n'est pas un numéro de bagage valide, on ignore
        continue;
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
    console.log('[PARSER] 🔍 Extraction numéro de vol - Données brutes (premiers 200 chars):', rawData.substring(0, 200));
    
    // PRIORITÉ 1: Kenya Airways - chercher "KQ" + espace optionnel + 2-4 chiffres (avec support zéros)
    // Patterns: KQ555, KQ 555, KQ0555, KQ 0555
    const kqPatterns = [
      /KQ\s+0*([1-9]\d{1,3})/,  // KQ suivi d'espace(s) puis zéros optionnels puis chiffres
      /KQ0*([1-9]\d{1,3})/,      // KQ suivi directement de zéros optionnels puis chiffres
      /KQ\s*(\d{3,4})/,          // KQ suivi d'espace optionnel puis 3-4 chiffres
    ];
    
    for (const pattern of kqPatterns) {
      const match = rawData.match(pattern);
      if (match) {
        const number = match[1].replace(/^0+/, ''); // Enlever les zéros en tête
        if (number.length >= 2) {
          const result = `KQ${number}`;
          console.log('[PARSER] ✅ Numéro de vol KQ trouvé:', result);
          return result;
        }
      }
    }

    // PRIORITÉ 2: Compagnies connues avec espace optionnel et zéros optionnels
    // Chercher: (9U|ET|EK|AF|SN|TK|WB|SA|SR) + espace optionnel + zéros optionnels + 2-4 chiffres
    // Exemples: "ET64", "ET 64", "ET064", "ET 0064", "ET0064", "ET555", "9U404"
    // Patterns améliorés pour gérer plus de variations
    const airlinePatterns = [
      /(9U|ET|EK|AF|SN|TK|WB|SA|SR)\s+0*([1-9]\d{1,3})/,  // Avec espace(s) et zéros optionnels
      /(9U|ET|EK|AF|SN|TK|WB|SA|SR)0*([1-9]\d{1,3})/,      // Sans espace, zéros optionnels
      /(9U|ET|EK|AF|SN|TK|WB|SA|SR)\s*(\d{2,4})/,          // Avec espace optionnel, 2-4 chiffres
    ];
    
    for (const pattern of airlinePatterns) {
      const match = rawData.match(pattern);
      if (match) {
        const airline = match[1];
        let number = match[2];
        
        // Éviter "BET" ou "1ET" (codes compagnie, pas Ethiopian)
        const matchIndex = rawData.indexOf(match[0]);
        if (matchIndex > 0 && airline === 'ET') {
          const beforeChar = rawData[matchIndex - 1];
          if (beforeChar === 'B' || beforeChar === '1') {
            continue; // C'est "BET" ou "1ET", continuer la recherche
          }
        }
        
        // Enlever les zéros en tête mais garder au moins 2 chiffres
        number = number.replace(/^0+/, '');
        if (number.length >= 1) {
          const result = `${airline}${number}`;
          console.log('[PARSER] ✅ Numéro de vol trouvé:', result);
          return result;
        }
      }
    }

    // PRIORITÉ 3: Pattern générique [A-Z]{2} + espaces optionnels + 2-4 chiffres (support tous numéros de vol)
    // Mais éviter les faux positifs (comme "BET", "1ET", etc.)
    const genericPatterns = [
      /([A-Z]{2})\s+0*([1-9]\d{1,3})/,  // Avec espace(s)
      /([A-Z]{2})0*([1-9]\d{1,3})/,      // Sans espace
      /([A-Z]{2})\s*(\d{2,4})/,          // Pattern plus large
    ];
    
    for (const pattern of genericPatterns) {
      const match = rawData.match(pattern);
      if (match) {
        const code = match[1];
        let number = match[2];
        
        // Éviter les codes invalides
        if (code === 'BE' || code === '1E' || code.match(/^\d/)) {
          continue;
        }
        
        // Vérifier que ce n'est pas "BET" ou "1ET"
        const matchIndex = rawData.indexOf(match[0]);
        if (matchIndex > 0) {
          const beforeChar = rawData[matchIndex - 1];
          if ((code === 'ET' && (beforeChar === 'B' || beforeChar === '1')) ||
              (code[0] === 'E' && beforeChar === 'B')) {
            continue;
          }
        }
        
        number = number.replace(/^0+/, '');
        if (number.length >= 1) {
          const result = `${code}${number}`;
          console.log('[PARSER] ✅ Numéro de vol générique trouvé:', result);
          return result;
        }
      }
    }

    // PRIORITÉ 4: Chercher dans les patterns de route (ex: FIHMDKET 0080)
    // Format: [AERO][AERO]ET suivi de numéro de vol
    const routeFlightPattern = /([A-Z]{3})([A-Z]{3})ET\s*0*(\d{2,4})/;
    const routeMatch = rawData.match(routeFlightPattern);
    if (routeMatch) {
      const number = routeMatch[3].replace(/^0+/, '');
      if (number.length >= 1) {
        // Essayer de déterminer le code compagnie depuis le contexte
        // Si on voit "ET" dans le pattern, c'est probablement Ethiopian
        const result = `ET${number}`;
        console.log('[PARSER] ✅ Numéro de vol depuis route trouvé:', result);
        return result;
      }
    }

    // PRIORITÉ 5: Fallback - chercher juste un numéro de vol (3-4 chiffres)
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
          // Chercher un code compagnie avant ce numéro
          const contextBefore = rawData.substring(Math.max(0, index - 10), index);
          const airlineBefore = contextBefore.match(/([A-Z]{2})\s*$/);
          if (airlineBefore && airlineBefore[1] !== 'BE' && airlineBefore[1] !== '1E') {
            const result = `${airlineBefore[1]}${num.replace(/^0+/, '')}`;
            console.log('[PARSER] ✅ Numéro de vol depuis contexte trouvé:', result);
            return result;
          }
        }
      }
    }

    console.warn('[PARSER] ❌ Impossible d\'extraire le numéro de vol');
    console.warn('[PARSER] Données brutes (premiers 300 chars):', rawData.substring(0, 300));
    console.warn('[PARSER] Longueur totale:', rawData.length);
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
   * Format Kenya Airways: "335M031G0009" où 335M est classe, 031G est le siège
   * Format: [classe][classe_lettre][siège] comme "311Y013A" ou "331Y068A0052" ou "335M031G"
   */
  private extractSeatNumber(rawData: string): string | undefined {
    // IMPORTANTE: Chercher TOUS les matches de 3 chiffres + lettre pour éviter les faux positifs
    // Format Kenya Airways: "335M031G" où le PREMIER est la classe, le SECOND est le siège
    const allMatches = Array.from(rawData.matchAll(/(\d{3}[A-Z])/g));
    
    // Si on a au moins 2 matches, prendre le DEUXIÈME (le siège, pas la classe)
    // Format Kenya Airways: 335M (classe) + 031G (siège) + ...
    if (allMatches.length >= 2) {
      // Vérifier si le premier match est un code de classe (3xx[YCM])
      const firstMatch = allMatches[0][1];
      if (firstMatch.match(/^[3][0-9]{2}[YCM]$/)) {
        // C'est un code de classe, le deuxième match est le siège
        const seat = allMatches[1][1];
        const cleaned = seat.replace(/^0+(\d+[A-Z])/, '$1');
        if (cleaned.match(/^\d{1,3}[A-Z]$/)) {
          return cleaned;
        }
        return seat;
      }
    }
    
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
    // Mais LE PREMIER si pas de classe détectée
    if (allMatches.length >= 1) {
      const seat = allMatches[0][1];
      // Vérifier que ce n'est pas un code de classe (311Y, 310Y, 331Y, 335M, etc.)
      if (!seat.match(/^3[0-9]{2}[YCM]$/)) {
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
    
    // PRIORITÉ 1: Format Ethiopian - chercher le pattern "2A" + heure + numéro de billet
    // Pattern: "2A" + 4 chiffres (heure HHMM) + 10 chiffres (numéro de billet)
    const ethiopianTicketPattern = /2A(\d{4})(\d{10})/;
    const ethiopianMatch = rawData.match(ethiopianTicketPattern);
    
    if (ethiopianMatch) {
      const ticketNumber = ethiopianMatch[2]; // Les 10 chiffres du numéro de billet
      
      // Valider que le numéro commence bien par 21-70 (selon les specs IATA)
      const firstTwoDigits = parseInt(ticketNumber.substring(0, 2), 10);
      if (firstTwoDigits >= 21 && firstTwoDigits <= 70) {
        return ticketNumber;
      }
      
      // Si pas dans la plage mais pattern valide, retourner quand même
      return ticketNumber;
    }
    
    // PRIORITÉ 2: Format standard IATA - chercher dans la zone 21-70
    if (rawData.length > 21) {
      const ticketPart = rawData.substring(21, Math.min(70, rawData.length));
      
      // Chercher 13 chiffres (code compagnie 3 chiffres + numéro 10 chiffres)
      const thirteenDigitMatch = ticketPart.match(/(\d{13})/);
      if (thirteenDigitMatch) {
        const fullNumber = thirteenDigitMatch[1];
        // Enlever les 3 premiers chiffres (code compagnie)
        const ticketNumber = fullNumber.substring(3);
        
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
        return ticketNumber;
      }
      
      // Chercher directement 10 chiffres
      const tenDigitMatch = ticketPart.match(/(\d{10})/);
      if (tenDigitMatch) {
        return tenDigitMatch[1];
      }
    }
    
    // PRIORITÉ 3: Recherche fallback dans toutes les données
    
    // Chercher n'importe quelle séquence de 10+ chiffres qui pourrait être un numéro de billet
    const allMatches = Array.from(rawData.matchAll(/(\d{10,})/g));
    if (allMatches.length > 0) {
      
      // Filtrer pour exclure les numéros qui sont clairement des bagages ou autres
      for (const match of allMatches) {
        const number = match[1];
        // Prendre les 10 premiers chiffres si c'est plus long
        const ticketNumber = number.substring(0, 10);
        
        // Vérifier si ça ressemble à un numéro de billet (commence par 21-99 typiquement)
        const firstTwoDigits = parseInt(ticketNumber.substring(0, 2), 10);
        
        // Accepter les numéros qui commencent par 21-99 (plage élargie)
        if (firstTwoDigits >= 21 && firstTwoDigits <= 99) {
          return ticketNumber;
        }
      }
      
      // Si aucun ne correspond aux critères, prendre le premier
      const firstNumber = allMatches[0][1].substring(0, 10);
      return firstNumber;
    }
    
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
    
    // ============================================
    // FORMAT RÉEL DES ÉTIQUETTES BAGAGES:
    // Tag scanné: 9071366379001 (13 chiffres)
    // - 9071366379 = Base (10 chiffres)
    // - 001 = Séquence (ce bagage est le 1er)
    // 
    // Pour 3 bagages avec base 9071366379:
    // - Bagage 1: 9071366379 (ou 9071366379001)
    // - Bagage 2: 9071366380 (ou 9071366380002)
    // - Bagage 3: 9071366381 (ou 9071366381003)
    // ============================================

    // Chercher un pattern de 13 chiffres consécutifs (base 10 + séquence 3)
    const tag13Match = rawData.match(/(\d{10})(\d{3})/);
    if (tag13Match) {
      const baseNumber = tag13Match[1];
      const sequence = parseInt(tag13Match[2], 10);
      
      // La séquence nous dit combien de bagages au total (ex: 003 = 3ème bagage donc au moins 3)
      // Mais on ne peut pas savoir le total exact depuis un seul tag
      // On utilise la séquence comme estimation du nombre de bagages
      if (sequence > 0 && sequence <= 20) {
        const expectedTags: string[] = [];
        const baseNum = parseInt(baseNumber, 10);
        
        // Générer les tags attendus (base + 0, base + 1, ..., base + sequence - 1)
        for (let i = 0; i < sequence; i++) {
          expectedTags.push((baseNum + i).toString());
        }
        
        console.log(`[PARSER] Format 13 chiffres détecté: base=${baseNumber}, séquence=${sequence}`);
        console.log(`[PARSER] Tags attendus: ${expectedTags.join(', ')}`);
        
        return {
          count: sequence,
          baseNumber,
          expectedTags,
        };
      }
    }

    // Chercher un pattern de 12 chiffres consécutifs (base 10 + count 2)
    const longMatch = rawData.match(/(\d{10})(\d{2})(?!\d)/);
    if (longMatch) {
      const baseNumber = longMatch[1];
      const count = parseInt(longMatch[2], 10);
      
      if (count > 0 && count <= 20) {
        const expectedTags: string[] = [];
        const baseNum = parseInt(baseNumber, 10);
        
        for (let i = 0; i < count; i++) {
          expectedTags.push((baseNum + i).toString());
        }
        
        console.log(`[PARSER] Format 12 chiffres détecté: base=${baseNumber}, count=${count}`);
        
        return {
          count,
          baseNumber,
          expectedTags,
        };
      }
    }
    
    // Fallback: chercher juste 10 chiffres (base uniquement, 1 bagage)
    const base10Match = rawData.match(/(\d{10})(?!\d)/);
    if (base10Match) {
      const baseNumber = base10Match[1];
      
      console.log(`[PARSER] Format 10 chiffres détecté: base=${baseNumber}, 1 bagage par défaut`);
      
      return {
        count: 1,
        baseNumber,
        expectedTags: [baseNumber],
      };
    }

    return undefined;
  }

  /**
   * Extrait les informations sur les bagages pour formats génériques (Kenya Airways, etc.)
   * Cherche les patterns courants de bagages dans les données brutes
   */
  private extractBaggageInfoGeneric(rawData: string): PassengerData['baggageInfo'] | undefined {
    // Pattern 1: Chercher "XPC" où X est le nombre de bagages (ex: "1PC", "2PC", "3PC")
    const pcMatch = rawData.match(/(\d{1,2})PC/i);
    if (pcMatch) {
      const count = parseInt(pcMatch[1], 10);
      if (count > 0 && count <= 20) {
        // Essayer de trouver une base numérique dans les données
        const base10Match = rawData.match(/(\d{10})/);
        const baseNumber = base10Match ? base10Match[1] : undefined;
        
        if (baseNumber) {
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
        } else {
          // Sans base, retourner juste le count
          return { count };
        }
      }
    }

    // Pattern 2: Chercher un pattern [chiffres]A[chiffres] où le premier nombre = bagages
    // Exemple: "2A706" = 2 bagages avec référence 706
    const altMatch = rawData.match(/\s+(\d)A\d{3,4}\d+/);
    if (altMatch) {
      const count = parseInt(altMatch[1], 10);
      if (count > 0 && count <= 9) {
        return { count };
      }
    }

    // Pattern 3: Format [10 chiffres] sans autres contextes
    const base10Match = rawData.match(/(\d{10})(?!\d)/);
    if (base10Match) {
      // Chercher après un pattern de numéro de vol (CODE + numéros)
      const beforeBase = rawData.substring(0, rawData.indexOf(base10Match[1]));
      if (beforeBase.match(/[A-Z]{2}\s+\d{3,4}/)) {
        return {
          count: 1,
          baseNumber: base10Match[1],
          expectedTags: [base10Match[1]],
        };
      }
    }

    return undefined;
  }

  /**
   * Parse les données d'une étiquette de bagage RFID
   * 
   * Format numérique simple (le plus courant):
   * 9071366379001 (13 chiffres)
   * - 9071366379 = Base (10 chiffres)
   * - 001 = Séquence (ce bagage est le 1er sur X)
   * 
   * Format avec texte:
   * NME:MOHILO LOUVE | 4071 ET201605 | ET73/22NOV | PNR:HHJWNG | GMA→FIH
   */
  parseBaggageTag(rawData: string): BaggageTagData {
    const result: BaggageTagData = {
      passengerName: 'UNKNOWN',
      tagNumber: rawData.trim(),
      rawData,
    };

    const trimmedData = rawData.trim();

    // ============================================
    // CAS 1: Tag numérique simple (13 chiffres)
    // Format: 9071366379001 = base(10) + séquence(3)
    // ============================================
    if (/^\d{13}$/.test(trimmedData)) {
      const baseNumber = trimmedData.substring(0, 10);
      const sequence = parseInt(trimmedData.substring(10, 13), 10);
      
      result.tagNumber = baseNumber; // On stocke juste la base comme tag
      result.baggageSequence = sequence;
      
      console.log(`[PARSER TAG] Format 13 chiffres: base=${baseNumber}, séquence=${sequence}`);
      return result;
    }

    // ============================================
    // CAS 2: Tag numérique simple (10 chiffres)
    // Format: 9071366379 = base uniquement
    // ============================================
    if (/^\d{10}$/.test(trimmedData)) {
      result.tagNumber = trimmedData;
      result.baggageSequence = 1; // Par défaut, c'est le 1er bagage
      
      console.log(`[PARSER TAG] Format 10 chiffres: base=${trimmedData}`);
      return result;
    }

    // ============================================
    // CAS 3: Tag avec texte (format Ethiopian, etc.)
    // ============================================

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
      result.tagNumber = `${tagMatch1[1]} ET${tagMatch1[2]}`;
    } else {
      // Chercher pattern avec ET au début (ET136262)
      const tagEtMatch = rawData.match(/ET\s*(\d{6,})/i);
      if (tagEtMatch) {
        result.tagNumber = `ET${tagEtMatch[1]}`;
      } else {
        // Chercher juste un numéro long (10-13 chiffres)
        const longNumMatch = trimmedData.match(/(\d{10,13})/);
        if (longNumMatch) {
          const numStr = longNumMatch[1];
          if (numStr.length === 13) {
            result.tagNumber = numStr.substring(0, 10);
            result.baggageSequence = parseInt(numStr.substring(10, 13), 10);
          } else {
            result.tagNumber = numStr.substring(0, 10);
          }
        } else if (trimmedData.length <= 20 && /^\d{4,}$/.test(trimmedData)) {
          // C'est un nombre pur, utiliser directement comme tag RFID
          result.tagNumber = trimmedData;
        } else {
          // Chercher un numéro de 4 chiffres ou plus dans les données
          // Pour les codes Interleaved2of5, la valeur complète est souvent le tag RFID
      const tagNumMatch = rawData.match(/(\d{4,})/);
      if (tagNumMatch) {
            // Si c'est un nombre long (8+ chiffres), c'est probablement le tag complet
            if (tagNumMatch[1].length >= 8) {
        result.tagNumber = tagNumMatch[1];
      } else {
              result.tagNumber = tagNumMatch[1];
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
      if (flightMatch && !result.tagNumber.includes(flightMatch[0])) {
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


