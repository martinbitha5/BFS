/**
 * Service de gestion des bagages RUSH (soute pleine)
 * Gère la déclaration manuelle et le suivi des bagages à réacheminer
 */

import { Baggage } from '../types/baggage.types';
import { InternationalBaggage } from '../types/birs.types';
import { birsDatabaseService } from './birs-database.service';
import { databaseService } from './database.service';
import { logAudit } from '../utils/audit.util';

interface RushDeclaration {
  baggageId: string;
  baggageType: 'national' | 'international';
  declaredBy: string;
  declaredAt: string;
  reason: string;
  nextFlightNumber?: string;
  remarks?: string;
}

class RushService {
  /**
   * Déclare manuellement un bagage national comme RUSH (soute pleine)
   */
  async declareNationalBaggageAsRush(
    baggageId: string,
    userId: string,
    reason: string,
    nextFlightNumber?: string,
    remarks?: string
  ): Promise<void> {
    console.log('[RUSH] 📦 Déclaration bagage national en RUSH:', {
      baggageId,
      userId,
      reason,
      nextFlightNumber
    });

    // Vérifier que le bagage existe et récupérer ses infos
    const baggage = await this.getNationalBaggage(baggageId);
    
    if (!baggage) {
      throw new Error(`Bagage national ${baggageId} non trouvé`);
    }

    // Vérifier le statut actuel
    if (baggage.status === 'rush') {
      console.warn('[RUSH] ⚠️ Bagage déjà marqué comme RUSH');
      throw new Error('Ce bagage est déjà marqué comme RUSH');
    }

    if (baggage.status === 'arrived') {
      throw new Error('Impossible de marquer un bagage arrivé comme RUSH');
    }

    // Mettre à jour le statut
    await databaseService.updateBaggageStatus(baggageId, 'rush', userId);

    // Logger l'action
    await logAudit(
      'MARK_RUSH',
      'baggage',
      JSON.stringify({
        baggageId,
        baggageType: 'national',
        rfidTag: baggage.rfidTag,
        previousStatus: baggage.status,
        reason,
        nextFlightNumber,
        remarks
      }),
      baggageId
    );

    console.log('[RUSH] ✅ Bagage national marqué comme RUSH avec succès');
  }

  /**
   * Déclare manuellement un bagage international comme RUSH
   */
  async declareInternationalBaggageAsRush(
    baggageId: string,
    userId: string,
    reason: string,
    nextFlightNumber?: string,
    remarks?: string
  ): Promise<void> {
    console.log('[RUSH] 🌍 Déclaration bagage international en RUSH:', {
      baggageId,
      userId,
      reason,
      nextFlightNumber
    });

    // Vérifier que le bagage existe
    const baggage = await birsDatabaseService.getInternationalBaggageById(baggageId);
    
    if (!baggage) {
      throw new Error(`Bagage international ${baggageId} non trouvé`);
    }

    // Vérifier le statut actuel
    if (baggage.status === 'rush') {
      console.warn('[RUSH] ⚠️ Bagage déjà marqué comme RUSH');
      throw new Error('Ce bagage est déjà marqué comme RUSH');
    }

    const now = new Date().toISOString();

    // Mettre à jour le statut
    await birsDatabaseService.updateInternationalBaggage(baggageId, {
      status: 'rush',
      remarks: remarks || `RUSH: ${reason}${nextFlightNumber ? ` - Vol suivant: ${nextFlightNumber}` : ''}`
    });

    // Logger l'action
    await logAudit(
      'MARK_RUSH',
      'international_baggage',
      JSON.stringify({
        baggageId,
        baggageType: 'international',
        rfidTag: baggage.rfidTag,
        previousStatus: baggage.status,
        reason,
        nextFlightNumber,
        remarks
      }),
      baggageId
    );

    console.log('[RUSH] ✅ Bagage international marqué comme RUSH avec succès');
  }

  /**
   * Annule le statut RUSH d'un bagage national
   * (par exemple si finalement il a été chargé)
   */
  async cancelNationalRush(
    baggageId: string,
    userId: string,
    newStatus: 'checked' | 'arrived',
    reason: string
  ): Promise<void> {
    console.log('[RUSH] 🔄 Annulation RUSH bagage national:', {
      baggageId,
      newStatus,
      reason
    });

    const baggage = await this.getNationalBaggage(baggageId);
    
    if (!baggage) {
      throw new Error(`Bagage ${baggageId} non trouvé`);
    }

    if (baggage.status !== 'rush') {
      throw new Error('Ce bagage n\'est pas marqué comme RUSH');
    }

    // Mettre à jour le statut
    await databaseService.updateBaggageStatus(baggageId, newStatus, userId);

    // Logger l'action
    await logAudit(
      'CANCEL_RUSH',
      'baggage',
      JSON.stringify({
        baggageId,
        baggageType: 'national',
        rfidTag: baggage.rfidTag,
        newStatus,
        reason
      }),
      baggageId
    );

    console.log('[RUSH] ✅ RUSH annulé avec succès');
  }

  /**
   * Annule le statut RUSH d'un bagage international
   */
  async cancelInternationalRush(
    baggageId: string,
    userId: string,
    newStatus: 'scanned' | 'reconciled',
    reason: string
  ): Promise<void> {
    console.log('[RUSH] 🔄 Annulation RUSH bagage international:', {
      baggageId,
      newStatus,
      reason
    });

    const baggage = await birsDatabaseService.getInternationalBaggageById(baggageId);
    
    if (!baggage) {
      throw new Error(`Bagage ${baggageId} non trouvé`);
    }

    if (baggage.status !== 'rush') {
      throw new Error('Ce bagage n\'est pas marqué comme RUSH');
    }

    const now = new Date().toISOString();

    // Mettre à jour le statut
    await birsDatabaseService.updateInternationalBaggage(baggageId, {
      status: newStatus,
      remarks: `RUSH annulé: ${reason}`
    });

    // Logger l'action
    await logAudit(
      'CANCEL_RUSH',
      'international_baggage',
      JSON.stringify({
        baggageId,
        baggageType: 'international',
        rfidTag: baggage.rfidTag,
        newStatus,
        reason
      }),
      baggageId
    );

    console.log('[RUSH] ✅ RUSH annulé avec succès');
  }

  /**
   * Récupère tous les bagages nationaux en statut RUSH
   */
  async getNationalRushBaggages(airportCode: string): Promise<Baggage[]> {
    const db = databaseService.getDatabase();
    if (!db) throw new Error('Database not initialized');

    const results = await db.getAllAsync<Baggage>(
      `SELECT b.* FROM baggages b
       LEFT JOIN passengers p ON b.passenger_id = p.id
       WHERE b.status = 'rush' 
       AND (p.departure = ? OR p.arrival = ?)
       ORDER BY b.updated_at DESC`,
      [airportCode, airportCode]
    );

    return results.map(b => ({
      ...b,
      synced: Boolean(b.synced),
    }));
  }

  /**
   * Récupère tous les bagages internationaux en statut RUSH
   */
  async getInternationalRushBaggages(airportCode: string): Promise<InternationalBaggage[]> {
    return await birsDatabaseService.getInternationalBaggagesByStatus(airportCode, 'rush');
  }

  /**
   * Obtient les statistiques des bagages RUSH
   */
  async getRushStatistics(airportCode: string): Promise<{
    totalRush: number;
    nationalRush: number;
    internationalRush: number;
    rushToday: number;
  }> {
    const nationalRush = await this.getNationalRushBaggages(airportCode);
    const internationalRush = await this.getInternationalRushBaggages(airportCode);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const rushToday = [
      ...nationalRush.filter(b => b.updatedAt >= todayISO),
      ...internationalRush.filter(b => b.updatedAt >= todayISO)
    ].length;

    return {
      totalRush: nationalRush.length + internationalRush.length,
      nationalRush: nationalRush.length,
      internationalRush: internationalRush.length,
      rushToday
    };
  }

  /**
   * Valide qu'un bagage peut être marqué comme RUSH
   */
  async validateRushDeclaration(
    baggageId: string,
    baggageType: 'national' | 'international'
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      if (baggageType === 'national') {
        const baggage = await this.getNationalBaggage(baggageId);
        
        if (!baggage) {
          errors.push('Bagage non trouvé');
          return { valid: false, errors };
        }

        if (baggage.status === 'rush') {
          errors.push('Le bagage est déjà marqué comme RUSH');
        }

        if (baggage.status === 'arrived') {
          errors.push('Impossible de marquer un bagage arrivé comme RUSH');
        }
      } else {
        const baggage = await birsDatabaseService.getInternationalBaggageById(baggageId);
        
        if (!baggage) {
          errors.push('Bagage international non trouvé');
          return { valid: false, errors };
        }

        if (baggage.status === 'rush') {
          errors.push('Le bagage est déjà marqué comme RUSH');
        }
      }
    } catch (error) {
      errors.push(`Erreur de validation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Méthode helper pour récupérer un bagage national
   */
  private async getNationalBaggage(baggageId: string): Promise<Baggage | null> {
    const db = databaseService.getDatabase();
    if (!db) throw new Error('Database not initialized');

    const result = await db.getFirstAsync<Baggage>(
      'SELECT * FROM baggages WHERE id = ?',
      [baggageId]
    );

    if (!result) return null;

    return {
      ...result,
      synced: Boolean(result.synced),
    };
  }
}

export const rushService = new RushService();
