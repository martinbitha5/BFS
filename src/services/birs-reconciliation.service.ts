/**
 * Service de réconciliation automatique entre bagages scannés et rapports BIRS
 */

import {
    BirsReportItem,
    InternationalBaggage,
    ReconciliationMatch,
    ReconciliationOptions,
    ReconciliationResult
} from '../types/birs.types';

class BirsReconciliationService {
  /**
   * Calcule la similarité entre deux chaînes (Levenshtein distance normalisée)
   * Retourne un score de 0 à 100
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 100;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 100;
    
    // Calcul de la distance de Levenshtein
    const matrix: number[][] = [];
    
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    const maxLength = Math.max(s1.length, s2.length);
    const distance = matrix[s2.length][s1.length];
    const similarity = ((maxLength - distance) / maxLength) * 100;
    
    return Math.round(similarity);
  }

  /**
   * Normalise un numéro de bagage pour la comparaison
   */
  private normalizeBagId(bagId: string): string {
    if (!bagId) return '';
    
    // Retirer les espaces et caractères spéciaux
    let normalized = bagId.trim().toUpperCase();
    
    // Retirer les préfixes courants (ET, TK, etc.)
    normalized = normalized.replace(/^(ET|TK|AF|KL|SN|BR)\s*/i, '');
    
    // Garder seulement les chiffres et lettres
    normalized = normalized.replace(/[^A-Z0-9]/g, '');
    
    return normalized;
  }

  /**
   * Normalise un nom de passager
   */
  private normalizePassengerName(name: string): string {
    if (!name) return '';
    
    // Retirer les espaces multiples, mettre en majuscules
    return name.trim().toUpperCase().replace(/\s+/g, ' ');
  }

  /**
   * Essaie de matcher un bagage avec un item du rapport
   */
  private tryMatch(
    baggage: InternationalBaggage,
    item: BirsReportItem,
    options: ReconciliationOptions
  ): ReconciliationMatch | null {
    const matchedOn: string[] = [];
    let totalScore = 0;
    let scoreCount = 0;

    // Match sur le Bag ID (priorité haute)
    if (options.matchOnBagId !== false) {
      const bagId1 = this.normalizeBagId(baggage.rfidTag);
      const bagId2 = this.normalizeBagId(item.bagId);
      
      if (bagId1 && bagId2) {
        if (bagId1 === bagId2) {
          matchedOn.push('bagId');
          totalScore += 100;
          scoreCount++;
        } else if (options.fuzzyMatch) {
          const similarity = this.calculateSimilarity(bagId1, bagId2);
          if (similarity >= (options.fuzzyThreshold || 80)) {
            matchedOn.push('bagId-fuzzy');
            totalScore += similarity;
            scoreCount++;
          }
        }
      }
    }

    // Match sur le nom du passager
    if (options.matchOnPassengerName !== false && baggage.passengerName && item.passengerName) {
      const name1 = this.normalizePassengerName(baggage.passengerName);
      const name2 = this.normalizePassengerName(item.passengerName);
      
      if (name1 === name2) {
        matchedOn.push('passengerName');
        totalScore += 100;
        scoreCount++;
      } else if (options.fuzzyMatch) {
        const similarity = this.calculateSimilarity(name1, name2);
        if (similarity >= (options.fuzzyThreshold || 70)) {
          matchedOn.push('passengerName-fuzzy');
          totalScore += similarity;
          scoreCount++;
        }
      }
    }

    // Match sur le PNR
    if (options.matchOnPnr !== false && baggage.pnr && item.pnr) {
      if (baggage.pnr.toUpperCase() === item.pnr.toUpperCase()) {
        matchedOn.push('pnr');
        totalScore += 100;
        scoreCount++;
      }
    }

    // Calculer le score final
    if (matchedOn.length === 0) {
      return null;
    }

    const finalScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    return {
      internationalBaggageId: baggage.id,
      birsReportItemId: item.id,
      matchScore: finalScore,
      matchedOn
    };
  }

  /**
   * Réconcilie les bagages scannés avec un rapport BIRS
   */
  async reconcileBaggages(
    internationalBaggages: InternationalBaggage[],
    reportItems: BirsReportItem[],
    options: ReconciliationOptions = {
      matchOnBagId: true,
      matchOnPassengerName: true,
      matchOnPnr: true,
      fuzzyMatch: true,
      fuzzyThreshold: 80
    }
  ): Promise<ReconciliationResult> {
    const matches: ReconciliationMatch[] = [];
    const matchedBaggageIds = new Set<string>();
    const matchedItemIds = new Set<string>();

    // Pour chaque bagage scanné, chercher le meilleur match dans le rapport
    for (const baggage of internationalBaggages) {
      let bestMatch: ReconciliationMatch | null = null;
      let bestScore = 0;

      for (const item of reportItems) {
        // Skip si déjà matché
        if (matchedItemIds.has(item.id)) continue;

        const match = this.tryMatch(baggage, item, options);
        
        if (match && match.matchScore > bestScore) {
          bestMatch = match;
          bestScore = match.matchScore;
        }
      }

      // Accepter le match si le score est suffisant
      const minScore = options.fuzzyMatch ? (options.fuzzyThreshold || 70) : 100;
      
      if (bestMatch && bestScore >= minScore) {
        matches.push(bestMatch);
        matchedBaggageIds.add(bestMatch.internationalBaggageId);
        matchedItemIds.add(bestMatch.birsReportItemId);
      }
    }

    // Calculer les non-matchés
    const unmatchedScannedBags = internationalBaggages
      .filter(b => !matchedBaggageIds.has(b.id))
      .map(b => b.id);

    const unmatchedReportItems = reportItems
      .filter(i => !matchedItemIds.has(i.id))
      .map(i => i.id);

    return {
      reportId: reportItems[0]?.birsReportId || '',
      totalItems: reportItems.length,
      matchedCount: matches.length,
      unmatchedScanned: unmatchedScannedBags.length,
      unmatchedReport: unmatchedReportItems.length,
      matches,
      unmatchedScannedBags,
      unmatchedReportItems,
      processedAt: new Date().toISOString(),
      processedBy: 'system'
    };
  }

  /**
   * Réconcilie un seul bagage avec les items disponibles
   */
  async reconcileSingleBaggage(
    baggage: InternationalBaggage,
    reportItems: BirsReportItem[],
    options: ReconciliationOptions = {
      matchOnBagId: true,
      matchOnPassengerName: true,
      matchOnPnr: true,
      fuzzyMatch: true,
      fuzzyThreshold: 80
    }
  ): Promise<ReconciliationMatch | null> {
    let bestMatch: ReconciliationMatch | null = null;
    let bestScore = 0;

    for (const item of reportItems) {
      const match = this.tryMatch(baggage, item, options);
      
      if (match && match.matchScore > bestScore) {
        bestMatch = match;
        bestScore = match.matchScore;
      }
    }

    const minScore = options.fuzzyMatch ? (options.fuzzyThreshold || 70) : 100;
    
    return bestMatch && bestScore >= minScore ? bestMatch : null;
  }

  /**
   * Génère des suggestions de match pour l'utilisateur
   */
  async getSuggestedMatches(
    baggage: InternationalBaggage,
    reportItems: BirsReportItem[],
    maxSuggestions: number = 5
  ): Promise<Array<ReconciliationMatch & { item: BirsReportItem }>> {
    const suggestions: Array<ReconciliationMatch & { item: BirsReportItem }> = [];

    for (const item of reportItems) {
      const match = this.tryMatch(baggage, item, {
        matchOnBagId: true,
        matchOnPassengerName: true,
        matchOnPnr: true,
        fuzzyMatch: true,
        fuzzyThreshold: 50 // Seuil plus bas pour les suggestions
      });

      if (match && match.matchScore > 0) {
        suggestions.push({ ...match, item });
      }
    }

    // Trier par score décroissant
    suggestions.sort((a, b) => b.matchScore - a.matchScore);

    // Retourner les top N suggestions
    return suggestions.slice(0, maxSuggestions);
  }

  /**
   * Calcule les statistiques de réconciliation
   */
  calculateReconciliationStats(result: ReconciliationResult): {
    reconciliationRate: number;
    averageMatchScore: number;
    perfectMatches: number;
    fuzzyMatches: number;
  } {
    const reconciliationRate = result.totalItems > 0
      ? Math.round((result.matchedCount / result.totalItems) * 100)
      : 0;

    const totalScore = result.matches.reduce((sum, m) => sum + m.matchScore, 0);
    const averageMatchScore = result.matches.length > 0
      ? Math.round(totalScore / result.matches.length)
      : 0;

    const perfectMatches = result.matches.filter(m => m.matchScore === 100).length;
    const fuzzyMatches = result.matches.filter(m => m.matchScore < 100).length;

    return {
      reconciliationRate,
      averageMatchScore,
      perfectMatches,
      fuzzyMatches
    };
  }
}

export const birsReconciliationService = new BirsReconciliationService();
