/**
 * Service d'extraction robuste du PNR depuis différents formats de boarding passes
 * Système flexible et extensible pour gérer de multiples patterns
 */

import { KNOWN_AIRPORT_CODES } from '../constants/airport-codes';

interface PnrCandidate {
  pnr: string;
  confidence: number; // Score de confiance (0-100)
  pattern: string; // Description du pattern trouvé
  position: number; // Position dans les données brutes
  context: {
    before: string; // Contexte avant le PNR
    after: string; // Contexte après le PNR
  };
}

class PnrExtractorService {
  constructor() {
    // Service initialisation - no patterns array needed (using direct strategies)
  }

  /**
   * Obtient les codes aéroports avec type correct
   */
  private getAirportCodes(): string[] {
    return Array.from(KNOWN_AIRPORT_CODES);
  }

  /**
   * Extrait le PNR depuis les données brutes en utilisant tous les patterns
   * Support complet pour : Ethiopian Airlines, Air Congo, formats IATA génériques
   * Robuste pour données de n'importe quelle longueur (260+ caractères)
   */
  extractPnr(rawData: string): string {
    // Nettoyer d'abord les données brutes (supprimer espaces inutiles, normaliser)
    const cleanedData = this.normalizeRawData(rawData);
    
    const candidates: PnrCandidate[] = [];
    const airportCodes = this.getAirportCodes();

    // STRATÉGIE 1: PATTERNS AVEC ESPACES (très fiable)
    // Format: M1[NOM]/[PRENOM] [1-9 LETTRES + PNR] [AÉROPORT ou ET + numéro]
    // S'applique à TOUS les formats qui commencent par M1/M2 (IATA standard)
    this.extractWithSpacePattern(cleanedData, airportCodes, candidates);
    
    // STRATÉGIE 2: ETHIOPIAN OPTIMISÉ (sans espaces)
    // Pattern collé: [8-9 LETTRES][CODE AÉROPORT]
    if (candidates.length === 0) {
      this.extractEthiopianDirect(cleanedData, airportCodes, candidates);
    }
    
    // STRATÉGIE 3: AIR CONGO (BET + numéro et patterns spécifiques)
    if (candidates.length === 0) {
      this.extractAirCongoDirect(cleanedData, airportCodes, candidates);
    }
    
    // STRATÉGIE 4: PATTERNS GÉNÉRIQUES IATA (fallback)
    if (candidates.length === 0) {
      this.extractGenericPatterns(cleanedData, airportCodes, candidates);
    }
    
    // Si aucun candidat trouvé
    if (candidates.length === 0) {
      console.log('[PNR-EXTRACTOR] Aucun candidat PNR trouvé');
      return 'UNKNOWN';
    }

    // Trier par confiance décroissante
    candidates.sort((a, b) => b.confidence - a.confidence);

    // Filtrer les doublons (garder celui avec la meilleure confiance)
    const uniqueCandidates: PnrCandidate[] = [];
    const seenPnr = new Set<string>();
    
    for (const candidate of candidates) {
      if (!seenPnr.has(candidate.pnr)) {
        seenPnr.add(candidate.pnr);
        uniqueCandidates.push(candidate);
      }
    }

    // Si on a plusieurs candidats du même pattern à la même position, garder le meilleur
    // Cela évite les conflits entre Pattern 4 et Pattern 4B
    const filteredByPosition: PnrCandidate[] = [];
    const seenPositions = new Map<number, PnrCandidate>();
    
    for (const candidate of uniqueCandidates) {
      const key = candidate.position;
      if (!seenPositions.has(key) || (seenPositions.get(key)!.confidence < candidate.confidence)) {
        if (seenPositions.has(key)) {
          // Remplacer l'ancien candidat
          const oldIdx = filteredByPosition.indexOf(seenPositions.get(key)!);
          if (oldIdx >= 0) {
            filteredByPosition[oldIdx] = candidate;
          }
        } else {
          filteredByPosition.push(candidate);
        }
        seenPositions.set(key, candidate);
      }
    }

    // Re-trier après filtrage
    filteredByPosition.sort((a, b) => b.confidence - a.confidence);

    // Prendre le meilleur candidat
    const bestCandidate = filteredByPosition[0];
    
    console.log('[PNR-EXTRACTOR] PNR extrait:', bestCandidate.pnr, {
      pattern: bestCandidate.pattern,
      confidence: bestCandidate.confidence,
      position: bestCandidate.position,
      totalCandidates: candidates.length,
      uniqueCandidates: filteredByPosition.length,
    });

    // Vérification supplémentaire : si la confiance est entre 30-40 et le PNR est bien positionné, l'accepter
    if (bestCandidate.confidence >= 30 && bestCandidate.confidence < 40) {
      // Vérifier que le PNR est bien positionné (après M1/M2 et avant ET ou codes aéroports)
      const isWellPositioned = bestCandidate.position > 5 && 
                                (bestCandidate.context.after.match(/^(ET|\s+ET|[A-Z]{3})/) || 
                                 airportCodes.some(apt => bestCandidate.context.after.includes(apt)));
      if (isWellPositioned) {
        console.log('[PNR-EXTRACTOR] PNR accepté malgré confiance modérée (bien positionné)');
        return bestCandidate.pnr;
      }
    }

    // Si la confiance est trop faible, retourner UNKNOWN
    // Mais accepter des confiances plus faibles si le pattern est spécifique et bien positionné
    const minConfidence = bestCandidate.pattern.includes('générique') ? 40 : 30;
    if (bestCandidate.confidence < minConfidence) {
      console.log('[PNR-EXTRACTOR] Confiance trop faible, retour UNKNOWN');
      return 'UNKNOWN';
    }

    return bestCandidate.pnr;
  }

  /**
   * Normalise les données brutes en supprimant les espaces inutiles
   * et en consolidant les données pour un meilleur traitement
   */
  private normalizeRawData(rawData: string): string {
    // Remplacer les espaces multiples par un seul espace
    // Garder les espaces nécessaires pour la structure
    return rawData
      .replace(/\s+/g, ' ') // Consolider les espaces multiples
      .trim(); // Supprimer les espaces au début/fin
  }

  /**
   * Stratégie 1: Extraction avec patterns espaces (très fiable)
   * S'applique à tous les formats commençant par M1/M2
   */
  private extractWithSpacePattern(
    rawData: string, 
    airportCodes: string[], 
    candidates: PnrCandidate[]
  ): void {
    // Chercher: [ESPACE][7-9 LETTRES][ESPACE][TEXTE]
    const spacePattern = /\s([A-Z]{7,9})\s+[A-Z]/g;
    const matches = Array.from(rawData.matchAll(spacePattern));
    
    for (const match of matches) {
      const letters = match[1];
      const matchIndex = match.index || 0;
      const before = rawData.substring(Math.max(0, matchIndex - 30), matchIndex);
      const after = rawData.substring(matchIndex + match[0].length, matchIndex + match[0].length + 20);
      
      // Valider: doit être après M1/M2
      if (!before.match(/^M[12][A-Z\s\/]+/)) {
        continue;
      }
      
      // Essayer les combinaisons dispersal + PNR (1-4 lettres + 6 lettres)
      // PRIORITÉ: 2+6 et 3+6 (patterns Ethiopian typiques) > 1+6 et 4+6
      for (let dispersalLen = 1; dispersalLen <= 4; dispersalLen++) {
        const pnrStart = dispersalLen;
        const pnrEnd = pnrStart + 6;
        
        if (pnrEnd <= letters.length) {
          const pnr = letters.substring(pnrStart, pnrEnd);
          
          // Ignorer si c'est un code aéroport
          if (airportCodes.includes(pnr)) {
            continue;
          }
          
          // Confiance maximale pour 2+6 et 3+6 (patterns Ethiopian typiques)
          // Confiance moyenne pour 1+6 et 4+6 (moins courants)
          let confidence: number;
          if (dispersalLen === 2 || dispersalLen === 3) {
            confidence = 98; // Très haute confiance pour patterns typiques
          } else if (dispersalLen === 1) {
            confidence = 70; // Confiance plus faible
          } else {
            confidence = 60; // Pattern rare
          }
          
          candidates.push({
            pnr,
            confidence,
            pattern: `Space-based [${dispersalLen}+6]`,
            position: matchIndex,
            context: { before, after },
          });
        }
      }
    }
  }

  /**
   * Stratégie 2: Ethiopian Airlines (pattern collé)
   */
  private extractEthiopianDirect(
    rawData: string,
    airportCodes: string[],
    candidates: PnrCandidate[]
  ): void {
    const airportCodes3 = airportCodes.filter(code => code.length === 3);
    const airportPattern = `(${airportCodes3.join('|')})`;
    const ethiopianRegex = new RegExp(`([A-Z]{1,4})([A-Z]{6})(${airportPattern})`, 'g');
    
    const matches = Array.from(rawData.matchAll(ethiopianRegex));
    for (const match of matches) {
      const pnr = match[2];
      const matchIndex = match.index || 0;
      const before = rawData.substring(Math.max(0, matchIndex - 30), matchIndex);
      
      if (airportCodes.includes(pnr)) continue;
      if (!before.match(/^M[12][A-Z\s\/]+/)) continue;
      
      candidates.push({
        pnr,
        confidence: 90,
        pattern: 'Ethiopian Direct',
        position: matchIndex,
        context: { before, after: '' },
      });
    }
  }

  /**
   * Stratégie 3: Air Congo (patterns BET, 1ET et structures spécifiques)
   */
  private extractAirCongoDirect(
    rawData: string,
    airportCodes: string[],
    candidates: PnrCandidate[]
  ): void {
    // Air Congo utilise souvent BET (code compagnie) et 9U
    // Format typique: [PNR 6][BET ou 1ET][numéro vol]
    
    // Pattern 1: PNR avant BET
    const betRegex = /([A-Z]{6})BET\d{3,4}/g;
    const betMatches = Array.from(rawData.matchAll(betRegex));
    for (const match of betMatches) {
      const pnr = match[1];
      if (airportCodes.includes(pnr)) continue;
      
      candidates.push({
        pnr,
        confidence: 80,
        pattern: 'Air Congo BET',
        position: match.index || 0,
        context: { before: '', after: '' },
      });
    }
    
    // Pattern 2: Après M1/M2, avant codes aéroports (format Air Congo)
    const airCongoPnrRegex = /M[12]([A-Z\s\/]+)([A-Z]{6})\s+([A-Z]{3})/g;
    const matches = Array.from(rawData.matchAll(airCongoPnrRegex));
    for (const match of matches) {
      const pnr = match[2];
      if (airportCodes.includes(pnr)) continue;
      
      candidates.push({
        pnr,
        confidence: 80,
        pattern: 'Air Congo M1/M2',
        position: match.index || 0,
        context: { before: '', after: '' },
      });
    }
  }

  /**
   * Stratégie 4: Patterns génériques IATA (fallback universel)
   */
  private extractGenericPatterns(
    rawData: string,
    airportCodes: string[],
    candidates: PnrCandidate[]
  ): void {
    // Pattern 1: PNR 6 lettres avant ET + numéro de vol
    const etRegex = /([A-Z]{6})ET\d{2,4}/g;
    const etMatches = Array.from(rawData.matchAll(etRegex));
    for (const match of etMatches) {
      const pnr = match[1];
      if (airportCodes.includes(pnr)) continue;
      
      candidates.push({
        pnr,
        confidence: 30,
        pattern: 'Generic ET pattern',
        position: match.index || 0,
        context: { before: '', after: '' },
      });
    }
    
    // Pattern 2: PNR 6 lettres avant codes aéroports
    const airportRegex = /([A-Z]{6})(FIH|GMA|CDG|LHR|JFK|ORY|AER|DXB|SIN|BKK|HND|NRT|ICN|PEK|SHA|PVG|KUL|SYD|LAX|SFO|DEN|ATL|ORD|JFK|MIA|BOS|LAS|SEA|PHX|CUN)/g;
    const airportMatches = Array.from(rawData.matchAll(airportRegex));
    for (const match of airportMatches) {
      const pnr = match[1];
      if (airportCodes.includes(pnr)) continue;
      
      candidates.push({
        pnr,
        confidence: 30,
        pattern: 'Generic Airport pattern',
        position: match.index || 0,
        context: { before: '', after: '' },
      });
    }
    
    // Pattern 3: PNR 6 lettres générique (dernier recours)
    const genericRegex = /([A-Z]{6})/g;
    const genericMatches = Array.from(rawData.matchAll(genericRegex));
    for (const match of genericMatches) {
      const pnr = match[1];
      if (airportCodes.includes(pnr)) continue;
      
      // Ignorer si dans une longue séquence (probablement du nom)
      const position = match.index || 0;
      const before = rawData.substring(Math.max(0, position - 10), position);
      const after = rawData.substring(position + 6, Math.min(rawData.length, position + 16));
      const context = rawData.substring(
        Math.max(0, position - 10),
        Math.min(rawData.length, position + 16)
      );
      if (context.match(/^[A-Z]{20,}/)) continue;
      
      candidates.push({
        pnr,
        confidence: 30,
        pattern: 'Generic 6-letter',
        position,
        context: { before, after },
      });
    }
  }
}

// Instance singleton
export const pnrExtractorService = new PnrExtractorService();

