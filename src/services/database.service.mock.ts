import * as SQLite from 'expo-sqlite';
import { SQLITE_SCHEMA } from '../database/schema';
import { Passenger } from '../types/passenger.types';
import { Baggage } from '../types/baggage.types';
import { BoardingStatus } from '../types/boarding.types';
import { SyncQueueItem } from '../types/sync.types';
import { mockService } from './mock.service';
import { auditService } from './audit.service';

/**
 * Service de base de données mocké utilisant mockService
 * Simule le comportement de database.service.ts mais avec des données en mémoire
 * Note: La base de données SQLite est toujours initialisée pour l'audit
 */
class DatabaseServiceMock {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      // Toujours initialiser la vraie base de données SQLite pour l'audit
      // même en mode mock, car l'audit doit être persistant
      this.db = await SQLite.openDatabaseAsync('bfs.db');
      
      // Vérifier si la table audit_log existe déjà et si elle a la colonne airport_code
      try {
        const tableInfo = await this.db.getAllAsync<{ name: string }>(
          "PRAGMA table_info(audit_log)"
        );
        const hasAirportCodeColumn = tableInfo.some(col => col.name === 'airport_code');
        
        if (!hasAirportCodeColumn && tableInfo.length > 0) {
          // La table existe mais sans la colonne airport_code, l'ajouter
          await this.db.execAsync(`
            ALTER TABLE audit_log ADD COLUMN airport_code TEXT;
            CREATE INDEX IF NOT EXISTS idx_audit_log_airport_code ON audit_log(airport_code);
          `);
        }
      } catch (migrationError) {
        // La table n'existe pas encore, elle sera créée par le schéma
      }
      
      await this.db.execAsync(SQLITE_SCHEMA);
      // Initialiser le service d'audit avec la vraie base de données
      await auditService.initialize(this.db);
      console.log('Mock database initialized (with real SQLite for audit)');
    } catch (error) {
      console.error('Error initializing mock database:', error);
      // Ne pas bloquer l'application si l'initialisation échoue
    }
  }

  /**
   * Obtenir la référence à la base de données
   * Utile pour les services qui en ont besoin (BIRS, etc.)
   */
  getDatabase(): SQLite.SQLiteDatabase | null {
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  // Passengers
  async createPassenger(passenger: Omit<Passenger, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return await mockService.createPassenger(passenger);
  }

  async getPassengerByPnr(pnr: string): Promise<Passenger | null> {
    return await mockService.getPassengerByPnr(pnr);
  }

  async getPassengerById(id: string): Promise<Passenger | null> {
    return await mockService.getPassengerById(id);
  }

  async getPassengersByAirport(airportCode: string): Promise<Passenger[]> {
    return await mockService.getPassengersByAirport(airportCode);
  }

  // Baggage
  async createBaggage(baggage: Omit<Baggage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return await mockService.createBaggage(baggage);
  }

  async getBaggageByRfidTag(rfidTag: string): Promise<Baggage | null> {
    return await mockService.getBaggageByRfidTag(rfidTag);
  }

  async getBaggagesByPassengerId(passengerId: string): Promise<Baggage[]> {
    return await mockService.getBaggagesByPassengerId(passengerId);
  }

  async getBaggagesByPassengerIds(passengerIds: string[]): Promise<Baggage[]> {
    return await mockService.getBaggagesByPassengerIds(passengerIds);
  }

  async getBaggagesByAirport(airportCode: string): Promise<Baggage[]> {
    return await mockService.getBaggagesByAirport(airportCode);
  }

  async updateBaggageStatus(baggageId: string, status: 'checked' | 'arrived' | 'rush', userId: string): Promise<void> {
    return await mockService.updateBaggageStatus(baggageId, status, userId);
  }

  // Boarding Status
  async getBoardingStatusByPassengerId(passengerId: string): Promise<BoardingStatus | null> {
    return await mockService.getBoardingStatusByPassengerId(passengerId);
  }

  async getBoardingStatusesByPassengerIds(passengerIds: string[]): Promise<BoardingStatus[]> {
    return await mockService.getBoardingStatusesByPassengerIds(passengerIds);
  }

  async getBoardingStatusesByAirport(airportCode: string): Promise<BoardingStatus[]> {
    return await mockService.getBoardingStatusesByAirport(airportCode);
  }

  async createOrUpdateBoardingStatus(
    status: Omit<BoardingStatus, 'id' | 'createdAt'>
  ): Promise<string> {
    return await mockService.createOrUpdateBoardingStatus(status);
  }

  // Sync Queue (mocké - ne fait rien réellement)
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt'>): Promise<string> {
    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Mock: Added to sync queue', { id, ...item });
    return id;
  }

  async getPendingSyncItems(limit: number = 50): Promise<SyncQueueItem[]> {
    // Retourner une liste vide pour le mock
    return [];
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    console.log('Mock: Removed from sync queue', id);
  }

  async updateSyncQueueItem(id: string, retryCount: number, lastError?: string): Promise<void> {
    console.log('Mock: Updated sync queue item', { id, retryCount, lastError });
  }
}

export const databaseServiceMock = new DatabaseServiceMock();

