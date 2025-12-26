import * as SQLite from 'expo-sqlite';
import { SQLITE_SCHEMA } from '../database/schema';
import { Baggage } from '../types/baggage.types';
import { BoardingStatus } from '../types/boarding.types';
import { Passenger } from '../types/passenger.types';
import { SyncQueueItem } from '../types/sync.types';
import { auditService } from './audit.service';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('bfs.db');
      await this.db.execAsync(SQLITE_SCHEMA);
      // Initialiser le service d'audit
      await auditService.initialize(this.db);
      // Initialiser le service BIRS (import dynamique pour éviter les cycles)
      const { birsDatabaseService } = await import('./birs-database.service');
      birsDatabaseService.initialize(this.db);
      // Initialiser le service raw-scan
      const { rawScanService } = await import('./raw-scan.service');
      rawScanService.initialize(this.db);
      console.log('Database initialized successfully (with BIRS and RawScan support)');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
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
    if (!this.db) throw new Error('Database not initialized');

    const id = `passenger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO passengers (
        id, pnr, full_name, last_name, first_name, flight_number, flight_time,
        airline, airline_code, departure, arrival, route, company_code,
        ticket_number, seat_number, cabin_class, baggage_count, baggage_base_number,
        raw_data, format, checked_in_at, checked_in_by, synced, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        passenger.pnr,
        passenger.fullName,
        passenger.lastName,
        passenger.firstName,
        passenger.flightNumber,
        passenger.flightTime || null,
        passenger.airline || null,
        passenger.airlineCode || null,
        passenger.departure,
        passenger.arrival,
        passenger.route,
        passenger.companyCode || null,
        passenger.ticketNumber || null,
        passenger.seatNumber || null,
        passenger.cabinClass || null,
        passenger.baggageCount,
        passenger.baggageBaseNumber || null,
        passenger.rawData || null,
        passenger.format || null,
        passenger.checkedInAt,
        passenger.checkedInBy,
        passenger.synced ? 1 : 0,
        now,
        now,
      ]
    );

    return id;
  }

  async getPassengerByPnr(pnr: string): Promise<Passenger | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<Passenger>(
      'SELECT * FROM passengers WHERE pnr = ?',
      [pnr]
    );

    if (result) {
      return {
        ...result,
        synced: Boolean(result.synced),
      };
    }

    return null;
  }

  /**
   * Cherche un passager par son nom complet
   * Utilise une recherche insensible à la casse
   */
  async getPassengerByName(fullName: string): Promise<Passenger | null> {
    if (!this.db) throw new Error('Database not initialized');

    // Normaliser le nom pour la recherche (majuscules, sans espaces multiples)
    const normalizedName = fullName.trim().toUpperCase().replace(/\s+/g, ' ');

    const result = await this.db.getFirstAsync<Passenger>(
      'SELECT * FROM passengers WHERE UPPER(full_name) = ? OR UPPER(full_name) LIKE ?',
      [normalizedName, `%${normalizedName}%`]
    );

    if (result) {
      return {
        ...result,
        synced: Boolean(result.synced),
      };
    }

    return null;
  }

  /**
   * Cherche un passager par tag de bagage attendu
   * 
   * Format du tag scanné: 9071366379001 (13 chiffres)
   * - 9071366379 = Base (10 chiffres)
   * - 001 = Séquence (ce bagage est le 1er)
   * 
   * Pour un passager avec 3 bagages et base 9071366379:
   * - Bagage 1: base 9071366379, tag = 9071366379 ou 9071366379001
   * - Bagage 2: base 9071366380, tag = 9071366380 ou 9071366380002
   * - Bagage 3: base 9071366381, tag = 9071366381 ou 9071366381003
   * 
   * @param rfidTag - Le tag RFID scanné (ex: "9071366379001" ou "9071366379")
   * @returns Le passager trouvé ou null
   */
  async getPassengerByExpectedTag(rfidTag: string): Promise<Passenger | null> {
    if (!this.db) throw new Error('Database not initialized');

    const cleanTag = rfidTag.trim();
    
    // Extraire la base du tag scanné
    // Si 13 chiffres: les 10 premiers sont la base, les 3 derniers sont la séquence
    // Si 10 chiffres: c'est directement la base
    let scannedBase: string;
    let scannedSequence: number | null = null;
    
    if (cleanTag.length === 13 && /^\d{13}$/.test(cleanTag)) {
      scannedBase = cleanTag.substring(0, 10);
      scannedSequence = parseInt(cleanTag.substring(10, 13), 10);
      console.log(`[DB] Tag 13 chiffres détecté: base=${scannedBase}, séquence=${scannedSequence}`);
    } else if (cleanTag.length === 10 && /^\d{10}$/.test(cleanTag)) {
      scannedBase = cleanTag;
      console.log(`[DB] Tag 10 chiffres détecté: base=${scannedBase}`);
    } else {
      // Format non reconnu, essayer quand même avec les 10 premiers chiffres
      const numericPart = cleanTag.replace(/\D/g, '');
      if (numericPart.length >= 10) {
        scannedBase = numericPart.substring(0, 10);
        console.log(`[DB] Tag format inconnu, extraction base: ${scannedBase}`);
      } else {
        console.log(`[DB] ❌ Format de tag non reconnu: ${cleanTag}`);
        return null;
      }
    }
    
    const scannedBaseNum = parseInt(scannedBase, 10);
    if (isNaN(scannedBaseNum)) {
      console.log(`[DB] ❌ Base non numérique: ${scannedBase}`);
      return null;
    }
    
    // Récupérer tous les passagers avec un numéro de base de bagage
    const passengers = await this.db.getAllAsync<any>(
      'SELECT * FROM passengers WHERE baggage_base_number IS NOT NULL AND baggage_count > 0'
    );

    for (const passenger of passengers) {
      const baseNumber = passenger.baggage_base_number;
      const baggageCount = passenger.baggage_count || 0;
      
      if (!baseNumber || baggageCount === 0) continue;

      const passengerBaseNum = parseInt(baseNumber, 10);
      if (isNaN(passengerBaseNum)) continue;

      // Vérifier si le tag scanné correspond à un des bagages attendus
      // Les tags attendus vont de baseNumber à baseNumber + (baggageCount - 1)
      for (let i = 0; i < baggageCount; i++) {
        const expectedBaseNum = passengerBaseNum + i;
        
        // Le tag scanné correspond si sa base correspond
        if (scannedBaseNum === expectedBaseNum) {
          console.log(`[DB] ✅ Tag ${cleanTag} correspond au passager ${passenger.full_name}`);
          console.log(`[DB]    Base passager: ${baseNumber}, Bagage #${i + 1}/${baggageCount}`);
          return {
            ...passenger,
            synced: Boolean(passenger.synced),
          };
        }
      }
    }

    console.log(`[DB] ❌ Aucun passager trouvé avec le tag: ${cleanTag} (base: ${scannedBase})`);
    return null;
  }

  async getPassengerById(id: string): Promise<Passenger | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<Passenger>(
      'SELECT * FROM passengers WHERE id = ?',
      [id]
    );

    if (result) {
      return {
        ...result,
        synced: Boolean(result.synced),
      };
    }

    return null;
  }

  async getPassengersByAirport(airportCode: string): Promise<Passenger[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<Passenger>(
      'SELECT * FROM passengers WHERE departure = ? OR arrival = ? ORDER BY created_at DESC',
      [airportCode, airportCode]
    );

    return results.map(p => ({
      ...p,
      synced: Boolean(p.synced),
    }));
  }

  // Baggage
  async createBaggage(baggage: Omit<Baggage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `baggage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO baggages (
        id, passenger_id, rfid_tag, expected_tag, status,
        checked_at, checked_by, arrived_at, arrived_by,
        synced, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        baggage.passengerId,
        baggage.rfidTag,
        baggage.expectedTag || null,
        baggage.status,
        baggage.checkedAt || null,
        baggage.checkedBy || null,
        baggage.arrivedAt || null,
        baggage.arrivedBy || null,
        baggage.synced ? 1 : 0,
        now,
        now,
      ]
    );

    return id;
  }

  async getBaggageByRfidTag(rfidTag: string): Promise<Baggage | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<Baggage>(
      'SELECT * FROM baggages WHERE rfid_tag = ?',
      [rfidTag]
    );

    if (result) {
      return {
        ...result,
        synced: Boolean(result.synced),
      };
    }

    return null;
  }

  async getBaggagesByPassengerId(passengerId: string): Promise<Baggage[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<Baggage>(
      'SELECT * FROM baggages WHERE passenger_id = ? ORDER BY created_at ASC',
      [passengerId]
    );

    return results.map(b => ({
      ...b,
      synced: Boolean(b.synced),
    }));
  }

  // Batch methods for performance optimization
  async getBaggagesByPassengerIds(passengerIds: string[]): Promise<Baggage[]> {
    if (!this.db) throw new Error('Database not initialized');
    if (passengerIds.length === 0) return [];

    // Create placeholders for IN clause
    const placeholders = passengerIds.map(() => '?').join(',');
    const results = await this.db.getAllAsync<Baggage>(
      `SELECT * FROM baggages WHERE passenger_id IN (${placeholders}) ORDER BY passenger_id, created_at ASC`,
      passengerIds
    );

    return results.map(b => ({
      ...b,
      synced: Boolean(b.synced),
    }));
  }

  async getBaggagesByAirport(airportCode: string): Promise<Baggage[]> {
    if (!this.db) throw new Error('Database not initialized');

    // Get baggages for passengers that have departure or arrival matching the airport
    const results = await this.db.getAllAsync<Baggage>(
      `SELECT b.* FROM baggages b
       INNER JOIN passengers p ON b.passenger_id = p.id
       WHERE p.departure = ? OR p.arrival = ?
       ORDER BY b.created_at DESC`,
      [airportCode, airportCode]
    );

    return results.map(b => ({
      ...b,
      synced: Boolean(b.synced),
    }));
  }

  async updateBaggageStatus(baggageId: string, status: 'checked' | 'arrived' | 'rush', userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    if (status === 'arrived') {
      // Mettre à jour le statut et les informations d'arrivée
      await this.db.runAsync(
        `UPDATE baggages SET
          status = ?, arrived_at = ?, arrived_by = ?, updated_at = ?
        WHERE id = ?`,
        [
          status,
          now,
          userId,
          now,
          baggageId,
        ]
      );
    } else if (status === 'checked') {
      // Mettre à jour le statut et les informations de vérification
      await this.db.runAsync(
        `UPDATE baggages SET
          status = ?, checked_at = ?, checked_by = ?, updated_at = ?
        WHERE id = ?`,
        [
          status,
          now,
          userId,
          now,
          baggageId,
        ]
      );
    } else if (status === 'rush') {
      // Marquer comme rush (soute pleine - à réacheminer)
      await this.db.runAsync(
        `UPDATE baggages SET
          status = ?, updated_at = ?
        WHERE id = ?`,
        [
          status,
          now,
          baggageId,
        ]
      );
    }
  }

  // Boarding Status
  async getBoardingStatusByPassengerId(passengerId: string): Promise<BoardingStatus | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<BoardingStatus>(
      'SELECT * FROM boarding_status WHERE passenger_id = ?',
      [passengerId]
    );

    if (result) {
      return {
        ...result,
        boarded: Boolean(result.boarded),
        synced: Boolean(result.synced),
      };
    }

    return null;
  }

  // Batch methods for performance optimization
  async getBoardingStatusesByPassengerIds(passengerIds: string[]): Promise<BoardingStatus[]> {
    if (!this.db) throw new Error('Database not initialized');
    if (passengerIds.length === 0) return [];

    // Create placeholders for IN clause
    const placeholders = passengerIds.map(() => '?').join(',');
    const results = await this.db.getAllAsync<BoardingStatus>(
      `SELECT * FROM boarding_status WHERE passenger_id IN (${placeholders})`,
      passengerIds
    );

    return results.map(bs => ({
      ...bs,
      boarded: Boolean(bs.boarded),
      synced: Boolean(bs.synced),
    }));
  }

  async getBoardingStatusesByAirport(airportCode: string): Promise<BoardingStatus[]> {
    if (!this.db) throw new Error('Database not initialized');

    // Get boarding statuses for passengers that have departure or arrival matching the airport
    const results = await this.db.getAllAsync<BoardingStatus>(
      `SELECT bs.* FROM boarding_status bs
       INNER JOIN passengers p ON bs.passenger_id = p.id
       WHERE p.departure = ? OR p.arrival = ?
       ORDER BY bs.created_at DESC`,
      [airportCode, airportCode]
    );

    return results.map(bs => ({
      ...bs,
      boarded: Boolean(bs.boarded),
      synced: Boolean(bs.synced),
    }));
  }

  async createOrUpdateBoardingStatus(
    status: Omit<BoardingStatus, 'id' | 'createdAt'>
  ): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.db.getFirstAsync<BoardingStatus>(
      'SELECT * FROM boarding_status WHERE passenger_id = ?',
      [status.passengerId]
    );

    if (existing) {
      const now = new Date().toISOString();
      await this.db.runAsync(
        `UPDATE boarding_status SET
          boarded = ?, boarded_at = ?, boarded_by = ?, synced = ?
        WHERE passenger_id = ?`,
        [
          status.boarded ? 1 : 0,
          status.boardedAt || null,
          status.boardedBy || null,
          status.synced ? 1 : 0,
          status.passengerId,
        ]
      );
      return existing.id;
    } else {
      const id = `boarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      await this.db.runAsync(
        `INSERT INTO boarding_status (
          id, passenger_id, boarded, boarded_at, boarded_by, synced, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          status.passengerId,
          status.boarded ? 1 : 0,
          status.boardedAt || null,
          status.boardedBy || null,
          status.synced ? 1 : 0,
          now,
        ]
      );

      return id;
    }
  }

  // Sync Queue
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO sync_queue (
        id, table_name, record_id, operation, data, retry_count, last_error, user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        item.tableName,
        item.recordId,
        item.operation,
        item.data,
        item.retryCount,
        item.lastError || null,
        item.userId,
        now,
      ]
    );

    return id;
  }

  async getPendingSyncItems(limit: number = 50): Promise<SyncQueueItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM sync_queue WHERE retry_count < 5 ORDER BY created_at ASC LIMIT ?',
      [limit]
    );

    // ✅ MAPPER SNAKE_CASE → CAMELCASE
    return results.map((row: any) => ({
      id: row.id,
      tableName: row.table_name,      // snake_case → camelCase
      recordId: row.record_id,        // snake_case → camelCase
      operation: row.operation,
      data: row.data,
      retryCount: row.retry_count,    // snake_case → camelCase
      lastError: row.last_error,      // snake_case → camelCase
      userId: row.user_id,            // snake_case → camelCase
      createdAt: row.created_at,      // snake_case → camelCase
    }));
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  }

  async updateSyncQueueItem(id: string, retryCount: number, lastError?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE sync_queue SET retry_count = ?, last_error = ? WHERE id = ?',
      [retryCount, lastError || null, id]
    );
  }
}

export const databaseService = new DatabaseService();

