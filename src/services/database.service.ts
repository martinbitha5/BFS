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
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
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

  async updateBaggageStatus(baggageId: string, status: 'checked' | 'arrived', userId: string): Promise<void> {
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
    
    const results = await this.db.getAllAsync<SyncQueueItem>(
      'SELECT * FROM sync_queue WHERE retry_count < 5 ORDER BY created_at ASC LIMIT ?',
      [limit]
    );

    return results;
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

