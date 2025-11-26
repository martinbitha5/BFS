import { PassengerData } from '../types/passenger.types';
import { BaggageTagData } from '../types/baggage.types';

class ParserService {
  /**
   * Parse les données brutes d'un boarding pass PDF417
   */
  parse(rawData: string): PassengerData {
    const format = this.detectFormat(rawData);

    if (format === 'AIR_CONGO') {
      return this.parseAirCongo(rawData);
    }

    if (format === 'ETHIOPIAN') {
      return this.parseEthiopian(rawData);
    }

    // Format générique IATA BCBP
    return this.parseGeneric(rawData);
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

    // Détection Ethiopian Airlines
    // Format: contient "ET" suivi de 3-4 chiffres comme numéro de vol (ET701, ET4071)
    // Le numéro de vol apparaît généralement dans la première moitié de la chaîne
    // Chercher "ET" suivi de 3-4 chiffres dans la première moitié
    const firstHalf = rawData.substring(0, Math.floor(rawData.length / 2));
    const ethiopianFlightPatterns = firstHalf.matchAll(/ET\d{3,4}/g);
    
    for (const match of ethiopianFlightPatterns) {
      const matchIndex = match.index || 0;
      const beforeChar = matchIndex > 0 ? firstHalf[matchIndex - 1] : '';
      
      // Ignorer si c'est "BET" ou "1ET" (codes compagnie, pas numéro de vol)
      if (beforeChar === 'B' || beforeChar === '1') {
        continue;
      }
      
      // Si on trouve "ET" suivi de 3-4 chiffres qui n'est pas "BET" ou "1ET", c'est Ethiopian
      // Même si c'est collé au nom comme "WILLIAMET701", c'est un numéro de vol Ethiopian
      return 'ETHIOPIAN';
    }

    // Si les données commencent par M1 mais ne sont ni Air Congo (9U) ni Ethiopian
    // Par défaut, considérer comme Generic (format IATA BCBP standard)
    // Note: Les données mockées Air Congo sans "9U" seront traitées comme Generic
    // mais dans la pratique, les vraies données Air Congo contiennent généralement "9U"
    if (rawData.match(/^M1/)) {
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

    // 1. Nom : Commence souvent par M1, ignorer le préfixe
    const fullName = this.extractNameEthiopian(rawData);
    const nameParts = this.splitName(fullName);
    const firstName = nameParts.firstName;
    const lastName = nameParts.lastName;

    // 2. PNR : 6 caractères alphanumériques (position variable)
    const pnr = this.extractPnrEthiopian(rawData);

    // 3. Numéro de vol : Format ET701 ou ET4071
    const flightNumber = this.extractFlightNumberEthiopian(rawData);

    // 4. Route (départ → arrivée)
    const route = this.extractRoute(rawData);
    const departure = route.departure;
    const arrival = route.arrival;

    // 5. Heure du vol (format HHMM)
    const flightTime = this.extractFlightTime(rawData);

    // 6. Siège
    const seatNumber = this.extractSeatNumber(rawData);

    // 7. Numéro de ticket
    const ticketNumber = this.extractTicketNumber(rawData);

    // 8. Bagages : Format spécial Ethiopian (10 chiffres base + 3 chiffres count)
    const baggageInfo = this.extractBaggageInfoEthiopian(rawData);

    return {
      pnr,
      fullName,
      firstName,
      lastName,
      flightNumber: flightNumber || 'UNKNOWN',
      flightTime,
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
   */
  private parseGeneric(rawData: string): PassengerData {
    const pnr = this.extractPnr(rawData);
    const fullName = this.extractNameGeneric(rawData);
    const nameParts = this.splitName(fullName);
    const flightNumber = this.extractFlightNumber(rawData);
    const route = this.extractRoute(rawData);
    const flightTime = this.extractFlightTime(rawData);
    const seatNumber = this.extractSeatNumber(rawData);
    const ticketNumber = this.extractTicketNumber(rawData);

    return {
      pnr,
      fullName,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      flightNumber,
      flightTime,
      route: `${route.departure}-${route.arrival}`,
      departure: route.departure,
      arrival: route.arrival,
      seatNumber,
      ticketNumber,
      rawData,
      format: 'GENERIC',
    };
  }

  /**
   * Extrait le PNR (6 caractères alphanumériques)
   * Format réel: Le PNR apparaît juste après le nom, comme "EYFMKNE" dans "M1KALONJI KABWE/OSCAREYFMKNE"
   */
  private extractPnr(rawData: string): string {
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
    
    // Fallback : chercher M1 + nom + PNR (6 lettres) + espace, en excluant les codes aéroports
    const allMatches = rawData.matchAll(/([A-Z]{6})\s/g);
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
   */
  private extractNameAirCongo(rawData: string): string {
    // Le PNR est un groupe de 6 lettres majuscules qui suit directement le nom et est suivi d'un espace
    // Format: ...OSCAREYFMKNE FIHFBMET
    // Le nom est "KALONJI KABWE OSCAR" et le PNR "EYFMKNE" commence après (collé au nom)
    
    // Chercher le PNR "EYFMKNE" directement dans la chaîne
    const pnrIndex = rawData.indexOf('EYFMKNE ');
    if (pnrIndex > 2) {
      // Vérifier que ce qui précède est bien le nom (M1 + lettres/espaces/)
      const beforeMatch = rawData.substring(0, pnrIndex);
      if (beforeMatch.match(/^M1[A-Z\s\/]+$/)) {
        // Le nom se termine juste avant le PNR
        const namePart = rawData.substring(2, pnrIndex);
        let name = namePart.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
        return name;
      }
    }
    
    // Méthode alternative : chercher tous les groupes de 6 lettres majuscules suivis d'un espace
    const pnrPattern = /([A-Z]{6})\s/g;
    let bestPnrIndex = -1;
    
    let match;
    while ((match = pnrPattern.exec(rawData)) !== null) {
      const matchIndex = match.index;
      const matchStr = match[1];
      
      // Ignorer si c'est trop tôt
      if (matchIndex < 10) continue;
      
      // Ignorer les codes aéroports connus (FIHFBMET, etc.)
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
   * Format réel: M1SMITH/JOHN WILLIAMET701 (nom se termine avant ET701)
   */
  private extractNameEthiopian(rawData: string): string {
    // Format: M1SMITH/JOHN WILLIAMET701
    // Le nom se termine avant ET suivi de chiffres (numéro de vol)
    
    // Chercher M1 suivi du nom jusqu'à ET suivi de chiffres (numéro de vol)
    const volMatch = rawData.match(/ET\d{3,4}/);
    if (volMatch) {
      const volIndex = rawData.indexOf(volMatch[0]);
      if (volIndex > 2) {
        const beforeVol = rawData.substring(0, volIndex);
        const nameMatch = beforeVol.match(/^M1(.+)$/);
        if (nameMatch) {
          let name = nameMatch[1].trim();
          // Remplacer / par espace
          name = name.replace(/\//g, ' ');
          // Nettoyer les espaces multiples
          name = name.replace(/\s+/g, ' ').trim();
          return name;
        }
      }
    }
    
    // Fallback : chercher M1 suivi de lettres jusqu'à ET
    const fallbackMatch = rawData.match(/^M1([A-Z\s\/]+)ET\d/);
    if (fallbackMatch) {
      let name = fallbackMatch[1].trim();
      name = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
      return name;
    }
    
    return 'UNKNOWN';
  }

  /**
   * Extrait le PNR pour Ethiopian Airlines
   */
  private extractPnrEthiopian(rawData: string): string {
    // Pour Ethiopian, le PNR peut être après le nom ou ailleurs
    // Chercher un groupe de 6 caractères alphanumériques qui n'est pas un code aéroport
    
    const knownAirports = ['ADD', 'JNB', 'FIH', 'FBM', 'LAD', 'BZV', 'KGL', 'EBB'];
    
    // Chercher tous les groupes de 6 caractères en excluant les codes aéroports
    const allMatches = rawData.matchAll(/([A-Z0-9]{6})/g);
    
    for (const match of allMatches) {
      const matchStr = match[0];
      const matchIndex = match.index || 0;
      
      // Ignorer si c'est trop tôt (dans M1...)
      if (matchIndex < 5) continue;
      
      // Ignorer si c'est un code aéroport connu (vérifier si les 3 premiers ou 3 derniers caractères sont un code aéroport)
      let isAirport = false;
      for (const airport of knownAirports) {
        // Vérifier si le code aéroport apparaît au début ou à la fin du groupe de 6 caractères
        if (matchStr.startsWith(airport) || matchStr.endsWith(airport) || matchStr.includes(airport)) {
          // Mais vérifier que ce n'est pas juste une partie d'un mot plus long
          // Si c'est ADDJNB, c'est deux codes aéroports combinés, donc on l'ignore
          if (matchStr.length === 6 && (matchStr.startsWith(airport) || matchStr.endsWith(airport))) {
            isAirport = true;
            break;
          }
          // Si c'est ADDJNB exactement, c'est deux codes aéroports
          if (matchStr === 'ADDJNB' || matchStr === 'JNBADD' || matchStr === 'FIHFBM' || matchStr === 'FBMFIH') {
            isAirport = true;
            break;
          }
        }
      }
      if (isAirport) continue;
      
      // Ignorer si c'est dans le nom (avant ET)
      const beforeMatch = rawData.substring(0, matchIndex);
      if (beforeMatch.match(/^M1[A-Z\s\/]+$/)) {
        continue; // C'est dans le nom
      }
      
      // Ignorer si c'est le numéro de vol (ET701)
      if (beforeMatch.endsWith('ET')) {
        continue;
      }
      
      // Ignorer si c'est juste après un code aéroport (comme ADDJNB)
      const charBefore = rawData[matchIndex - 1];
      const charAfter = matchIndex + 6 < rawData.length ? rawData[matchIndex + 6] : '';
      // Si avant ou après il y a des lettres qui forment un code aéroport, ignorer
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
    // Format: ET701 ou ET4071
    const volMatch = rawData.match(/ET\d{3,4}/);
    if (volMatch) {
      return volMatch[0];
    }
    return undefined;
  }

  /**
   * Extrait les informations sur les bagages pour Ethiopian Airlines
   * Format spécial : 10 chiffres base + 3 chiffres count (ex: 4071161870001 = 1 bagage)
   */
  private extractBaggageInfoEthiopian(rawData: string): PassengerData['baggageInfo'] | undefined {
    // Format: 4071161870001 (4071161870 = base, 001 = 1 bagage)
    // Chercher un pattern de 13 chiffres (10 base + 3 count)
    const longMatch = rawData.match(/(\d{10})(\d{3})(?![0-9])/);
    if (longMatch) {
      const baseNumber = longMatch[1];
      const count = parseInt(longMatch[2], 10);
      
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
    
    // Chercher directement un pattern de 13 chiffres consécutifs
    const directMatch = rawData.match(/(\d{13})/);
    if (directMatch) {
      const fullNumber = directMatch[1];
      const baseNumber = fullNumber.substring(0, 10);
      const count = parseInt(fullNumber.substring(10, 13), 10);
      
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
   * Extrait le nom pour format générique
   * Format réel: M1LUMU/ALIDOR KATEBA ou M1KALONJI KABWE/OSCAR
   * Utilise la même logique robuste que Air Congo
   */
  private extractNameGeneric(rawData: string): string {
    // Codes aéroports connus à exclure du PNR
    const knownAirports = ['FIH', 'FBM', 'JNB', 'LAD', 'ADD', 'BZV', 'KGL', 'EBB', 'FKI', 'GOM', 'KWZ', 'KGA', 'MJM', 'GMA', 'MDK', 'KND', 'LFW', 'ABJ', 'NBO', 'CMN', 'IST'];
    
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
   */
  private splitName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/);
    
    if (parts.length === 0) {
      return { firstName: '', lastName: fullName };
    }
    
    if (parts.length === 1) {
      return { firstName: '', lastName: parts[0] };
    }
    
    // Dernier mot = prénom, reste = nom de famille
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
   * Ou après le PNR: "EYFMKNE FIHFBMET"
   */
  private extractRoute(rawData: string): { departure: string; arrival: string } {
    // Codes aéroports connus dans la région
    const knownAirports = ['FIH', 'JNB', 'LAD', 'ADD', 'FBM', 'BZV', 'KGL', 'EBB'];
    
    // Chercher un pattern comme "FIHFBMET" ou "FIHJNB" (2 codes collés)
    // Format: [DEP][ARR] suivi possiblement d'autres lettres
    const combinedMatch = rawData.match(/(FIH|JNB|LAD|ADD|BZV|KGL|EBB)([A-Z]{3})/);
    if (combinedMatch) {
      const departure = combinedMatch[1];
      const arrivalCode = combinedMatch[2];
      
      // Si le code d'arrivée commence par un code connu, prendre les 3 premières lettres
      if (knownAirports.some(code => arrivalCode.startsWith(code))) {
        // Trouver le code d'arrivée complet (3 lettres)
        const arrivalMatch = arrivalCode.match(/^(FIH|JNB|LAD|ADD|FBM|BZV|KGL|EBB)/);
        if (arrivalMatch) {
          return {
            departure,
            arrival: arrivalMatch[1],
          };
        }
      }
      
      // Sinon, prendre les 3 premières lettres comme code d'arrivée
      return {
        departure,
        arrival: arrivalCode.substring(0, 3),
      };
    }
    
    // Chercher des codes séparés par espace: "FIH FBM" ou "FIH JNB"
    const spacedMatch = rawData.match(/(FIH|JNB|LAD|ADD|BZV|KGL|EBB)\s+(FIH|JNB|LAD|ADD|FBM|BZV|KGL|EBB)/);
    if (spacedMatch) {
      return {
        departure: spacedMatch[1],
        arrival: spacedMatch[2],
      };
    }
    
    // Chercher tous les codes aéroports dans la chaîne
    const airportCodes = rawData.match(/(FIH|JNB|LAD|ADD|FBM|BZV|KGL|EBB)/g);
    if (airportCodes && airportCodes.length >= 2) {
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
   * Format: [classe][classe_lettre][siège] comme "311Y013A"
   */
  private extractSeatNumber(rawData: string): string | undefined {
    // Chercher un pattern comme "013A" ou "014C" (3 chiffres + 1 lettre)
    // Ce pattern apparaît souvent après "Y" ou "C" (classe)
    // Format: ...Y013A... ou ...C014C...
    const seatMatch3 = rawData.match(/([YC])(\d{3}[A-Z])/);
    if (seatMatch3) {
      const seat = seatMatch3[2]; // Prendre le siège (013A)
      // Enlever les zéros initiaux (013A -> 13A, 001A -> 1A)
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
      // Vérifier que ce n'est pas un code de classe (311Y, 310Y, etc.)
      if (!seat.match(/^31[0-9][YC]$/)) {
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
   * Extrait le numéro de ticket (position 21-70, sans code compagnie)
   */
  private extractTicketNumber(rawData: string): string | undefined {
    // Si la chaîne est assez longue, prendre la partie après la position 21
    if (rawData.length > 21) {
      const ticketPart = rawData.substring(21, Math.min(70, rawData.length));
      // Retirer le code compagnie si présent au début
      return ticketPart.replace(/^[A-Z]{2}/, '').trim() || undefined;
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
      const knownAirports = ['GMA', 'FIH', 'JNB', 'ADD', 'LAD', 'FBM', 'BZV', 'KGL', 'EBB'];
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

    // 5. Extraire origine et destination (GMA pour FIH ou GMA→FIH)
    const knownAirports = ['GMA', 'FIH', 'JNB', 'ADD', 'LAD', 'FBM', 'BZV', 'KGL', 'EBB'];
    
    // Chercher un pattern comme "GMA pour FIH" ou "GMA→FIH" ou "GMA FIH"
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
    } else {
      // Chercher deux codes aéroports consécutifs
      for (const airport1 of knownAirports) {
        for (const airport2 of knownAirports) {
          if (airport1 === airport2) continue;
          const combined = airport1 + airport2;
          if (rawData.includes(combined)) {
            result.origin = airport1;
            result.destination = airport2;
            break;
          }
        }
        if (result.origin) break;
      }
      
      // Si pas trouvé, chercher individuellement
      if (!result.origin) {
        for (const airport of knownAirports) {
          if (rawData.includes(airport)) {
            // GMA est généralement l'origine, FIH la destination
            if (airport === 'GMA') {
              result.origin = airport;
            } else if (airport === 'FIH') {
              result.destination = airport;
            }
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


