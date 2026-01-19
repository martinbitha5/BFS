import { BoardingConfirmation, BoardingError, BoardingErrorType } from '../types/boarding-new.types';
import { logAudit } from '../utils/audit.util';
import { apiService } from './api.service';
import { authService } from './auth.service';
import { parserService } from './parser.service';

class BoardingService {
  private localCache: BoardingConfirmation[] = [];

  /**
   * Confirmer l'embarquement d'un passager
   * 1. Parse les données pour extraire le PNR
   * 2. Cherche le passager dans la DB par PNR
   * 3. Crée confirmation locale
   * 4. Synchronise avec le serveur
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
      // 1️⃣ PARSER les données pour extraire le PNR
      const parsed = parserService.parse(rawData);
      const pnr = parsed?.pnr || 'UNKNOWN';
      const passengerName = parsed?.fullName || 'Passager scanné';

      console.log('[BOARDING] 📖 Parsed:', { pnr, passengerName, flightNumber });

      // 2️⃣ CRÉER LA CONFIRMATION LOCALE
      const confirmationId = this.generateUUID();
      const now = new Date().toISOString();

      const confirmation: BoardingConfirmation = {
        id: confirmationId,
        scanId: confirmationId,
        passengerId: pnr,
        passagerName: passengerName,
        flightNumber: flightNumber,
        seatNumber: seatNumber,
        gate: gate,
        boardedAt: now,
        boardedBy: user.id,
        scannedAt: now,
        syncStatus: 'pending',
        syncError: undefined,
        syncedAt: undefined,
      };

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
          `Embarquement confirmé - Vol: ${flightNumber} - Siège: ${seatNumber || 'N/A'} - PNR: ${pnr}`,
          confirmationId
        );
      } catch (auditError) {
        console.warn('[BOARDING] Erreur audit:', auditError);
      }

      // 3️⃣ SYNCHRONISER AVEC LE SERVEUR EN ARRIÈRE-PLAN
      this.syncBoardingToServer(confirmation).catch(error => {
        console.error('[BOARDING] Erreur sync serveur (non-bloquant):', error);
      });

      return confirmation;
    } catch (error) {
      console.error('[BOARDING] Erreur confirmBoarding:', error);
      throw error;
    }
  }

  /**
   * Synchroniser l'embarquement avec le serveur
   * Appelle POST /api/v1/boarding (comme RushScreen fait avec declare)
   * SIMPLIFIÉ: On laisse le serveur gérer les erreurs, c'est son job
   */
  async syncBoardingToServer(
    confirmation: BoardingConfirmation
  ): Promise<any> {
    try {
      console.log('[BOARDING] 🚀 Sync serveur pour:', {
        passengerId: confirmation.passengerId,
        flightNumber: confirmation.flightNumber,
        seatNumber: confirmation.seatNumber
      });

      // Appel synchrone comme RushScreen (await + erreur remontée)
      const response = await apiService.post('/api/v1/boarding', {
        passenger_id: confirmation.passengerId,
        boarded_at: confirmation.boardedAt,
        boarded_by: confirmation.boardedBy,
        flight_number: confirmation.flightNumber,
        seat_number: confirmation.seatNumber,
      });

      console.log('[BOARDING] ✅ Response du serveur:', response);
      return response;
    } catch (error) {
      console.error('[BOARDING] ❌ Erreur sync serveur:', error);
      throw error; // Remonter l'erreur comme RushScreen le fait
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
