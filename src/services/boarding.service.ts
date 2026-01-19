/**
 * Service de Gestion du Boarding (Embarquement)
 * Synchronise les embarquements avec le serveur en temps réel
 */

import { BoardingConfirmation, BoardingError, BoardingErrorType } from '../types/boarding-new.types';
import { logAudit } from '../utils/audit.util';
import { apiService } from './api.service';
import { authService } from './auth.service';
import { rawScanService } from './raw-scan.service';

class BoardingService {
  private localCache: BoardingConfirmation[] = [];

  /**
   * Confirmer l'embarquement d'un passager
   * 1. Cherche le scan existant pour obtenir les bonnes infos
   * 2. Crée confirmation locale
   * 3. Synchronise avec le serveur en arrière-plan
   */
  async confirmBoarding(
    rawData: string,
    flightNumber: string,
    seatNumber?: string,
    gate?: string
  ): Promise<BoardingConfirmation> {
    const user = await authService.getCurrentUser();
    if (!user) {
      throw this.createError('unknown', 'Utilisateur non connecté');
    }

    try {
      // Chercher le scan existant pour obtenir l'ID correct
      const existingScan = await rawScanService.findByRawData(rawData);
      
      const confirmationId = this.generateUUID();
      const now = new Date().toISOString();

      // ✅ CRÉER LA CONFIRMATION LOCALE D'ABORD (retour immédiat)
      const confirmation: BoardingConfirmation = {
        id: confirmationId,
        scanId: existingScan?.id || '',
        passengerId: existingScan?.id || user.id, // Utiliser l'ID du scan (passager) sinon user.id
        passagerName: 'Passager scanné',
        flightNumber,
        seatNumber,
        gate,
        boardedAt: now,
        boardedBy: user.id, // Celui qui confirme l'embarquement
        scannedAt: now,
        syncStatus: 'pending', // En attente de sync
        syncError: undefined,
        syncedAt: undefined,
      };

      // Stocker localement
      this.localCache.unshift(confirmation);
      if (this.localCache.length > 100) {
        this.localCache = this.localCache.slice(0, 100);
      }

      console.log('[BOARDING] ✅ Confirmation locale créée:', confirmationId);

      // Enregistrer l'audit
      try {
        await logAudit(
          'BOARD_PASSENGER',
          'boarding',
          `Embarquement confirmé - Vol: ${flightNumber} - Siège: ${seatNumber || 'N/A'}`,
          confirmationId
        );
      } catch (auditError) {
        console.warn('[BOARDING] Erreur audit:', auditError);
      }

      // 🚀 SYNCHRONISER AVEC LE SERVEUR EN ARRIÈRE-PLAN (non-bloquant)
      this.syncBoardingToServer(confirmation, user, existingScan).catch(error => {
        console.error('[BOARDING] Erreur sync serveur:', error);
      });

      // Retourner immédiatement avec la confirmation locale
      return confirmation;
    } catch (error) {
      console.error('[BOARDING] Erreur confirmBoarding:', error);
      throw error;
    }
  }

  /**
   * Synchroniser l'embarquement avec le serveur
   * Appelle POST /api/v1/boarding avec le passenger_id du scan
   */
  private async syncBoardingToServer(
    confirmation: BoardingConfirmation,
    user: any,
    existingScan?: any
  ): Promise<void> {
    try {
      console.log('[BOARDING] 🚀 Début sync serveur pour:', confirmation.id);

      // Vérifier qu'on a un passenger_id valide
      if (!confirmation.passengerId || confirmation.passengerId === user.id) {
        console.warn('[BOARDING] ⚠️ Pas de passager valide trouvé, skip sync');
        return;
      }

      // Appeler la route POST /api/v1/boarding
      const response = await apiService.post('/api/v1/boarding', {
        passenger_id: confirmation.passengerId,
        boarded_at: confirmation.boardedAt,
        boarded_by: confirmation.boardedBy,
      });

      if (response.success) {
        console.log('[BOARDING] ✅ Embarquement synchronisé au serveur!');
        
        // Mettre à jour le statut local
        const index = this.localCache.findIndex(c => c.id === confirmation.id);
        if (index >= 0) {
          this.localCache[index].syncStatus = 'synced';
          this.localCache[index].syncedAt = new Date().toISOString();
        }
      } else {
        console.warn('[BOARDING] ⚠️ Erreur sync:', response.error);
        
        // Mettre à jour le statut local avec l'erreur
        const index = this.localCache.findIndex(c => c.id === confirmation.id);
        if (index >= 0) {
          this.localCache[index].syncStatus = 'failed';
          this.localCache[index].syncError = response.error;
        }
      }
    } catch (error) {
      console.error('[BOARDING] Erreur syncBoardingToServer:', error);
      
      // Mettre à jour le statut local avec l'erreur
      const index = this.localCache.findIndex(c => c.id === confirmation.id);
      if (index >= 0) {
        this.localCache[index].syncStatus = 'failed';
        this.localCache[index].syncError = String(error);
      }
    }
  }

  /**
   * Récupérer les embarquements récents (locaux)
   */
  async getRecentBoardings(limit: number = 10): Promise<BoardingConfirmation[]> {
    return this.localCache.slice(0, limit);
  }

  /**
   * Récupérer l'historique pour un vol
   */
  async getBoardingHistory(flightNumber: string): Promise<BoardingConfirmation[]> {
    return this.localCache.filter(b => b.flightNumber === flightNumber);
  }

  /**
   * Récupérer les stats d'embarquement
   */
  async getBoardingStats(flightNumber: string): Promise<any> {
    const boardings = this.localCache.filter(b => b.flightNumber === flightNumber);
    return {
      flightNumber,
      totalBoarded: boardings.length,
      synced: boardings.filter(b => b.syncStatus === 'synced').length,
      pending: boardings.filter(b => b.syncStatus === 'pending').length,
      failed: boardings.filter(b => b.syncStatus === 'failed').length,
    };
  }

  /**
   * Créer une erreur
   */
  private createError(type: BoardingErrorType, message: string): BoardingError {
    return {
      type,
      message,
      severity: 'error',
    };
  }

  /**
   * Générer un UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Export du singleton
export const boardingService = new BoardingService();
