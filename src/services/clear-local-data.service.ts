import { databaseService } from './database.service';

/**
 * Service pour nettoyer toutes les données locales de l'application
 * Utilisé pour remettre l'app à zéro (utile pour les tests et la production)
 */
export class ClearLocalDataService {
  /**
   * Vider toutes les tables de la base de données locale
   */
  async clearAllLocalData(): Promise<void> {
    try {
      console.log('🧹 Début du nettoyage des données locales...');
      
      const db = databaseService.getDatabase();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      // 1. Supprimer tous les statuts d'embarquement
      await db.execAsync(`DELETE FROM boarding_status;`);
      console.log('✅ Statuts d\'embarquement supprimés');

      // 2. Supprimer tous les bagages
      await db.execAsync(`DELETE FROM baggages;`);
      console.log('✅ Bagages supprimés');

      // 3. Supprimer tous les bagages internationaux
      await db.execAsync(`DELETE FROM international_baggages;`);
      console.log('✅ Bagages internationaux supprimés');

      // 4. Supprimer tous les passagers
      await db.execAsync(`DELETE FROM passengers;`);
      console.log('✅ Passagers supprimés');

      // 5. Supprimer tous les raw scans
      await db.execAsync(`DELETE FROM raw_scans;`);
      console.log('✅ Raw scans supprimés');

      // 6. Supprimer toutes les actions d'audit
      await db.execAsync(`DELETE FROM audit_log;`);
      console.log('✅ Logs d\'audit supprimés');

      // 7. Vider la file de synchronisation
      await db.execAsync(`DELETE FROM sync_queue;`);
      console.log('✅ File de synchronisation vidée');

      // 8. Réinitialiser les compteurs auto-increment (SQLite) - optionnel
      try {
        await db.execAsync(`DELETE FROM sqlite_sequence;`);
        console.log('✅ Compteurs réinitialisés');
      } catch (seqError) {
        // Table sqlite_sequence n'existe pas forcément, ce n'est pas grave
        console.log('ℹ️ Pas de compteurs à réinitialiser (normal)');
      }

      console.log('✨ Nettoyage des données locales terminé !');
      console.log('');
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des données locales
   */
  async getLocalDataStats(): Promise<{
    passengers: number;
    baggages: number;
    internationalBaggages: number;
    boardingStatuses: number;
    rawScans: number;
    syncQueue: number;
  }> {
    try {
      const db = databaseService.getDatabase();
      if (!db) {
        throw new Error('Base de données non initialisée');
      }

      const stats = {
        passengers: 0,
        baggages: 0,
        internationalBaggages: 0,
        boardingStatuses: 0,
        rawScans: 0,
        syncQueue: 0,
      };

      // Compter les passagers
      const passengersResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM passengers'
      );
      stats.passengers = passengersResult?.count || 0;

      // Compter les bagages
      const baggagesResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM baggages'
      );
      stats.baggages = baggagesResult?.count || 0;

      // Compter les bagages internationaux
      const intBaggagesResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM international_baggages'
      );
      stats.internationalBaggages = intBaggagesResult?.count || 0;

      // Compter les statuts d'embarquement
      const boardingResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM boarding_status'
      );
      stats.boardingStatuses = boardingResult?.count || 0;

      // Compter les raw scans
      const rawScansResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM raw_scans'
      );
      stats.rawScans = rawScansResult?.count || 0;

      // Compter les items en attente de sync
      const syncResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM sync_queue'
      );
      stats.syncQueue = syncResult?.count || 0;

      return stats;
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      throw error;
    }
  }
}

// Instance singleton
export const clearLocalDataService = new ClearLocalDataService();
