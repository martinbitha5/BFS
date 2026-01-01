import * as SQLite from 'expo-sqlite';
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
      
      // ✅ OPTIMISATIONS SQLITE POUR LA PERFORMANCE
      await this.db.runAsync('PRAGMA foreign_keys = ON');
      await this.db.runAsync('PRAGMA journal_mode = WAL');      // Write-Ahead Logging - plus rapide
      await this.db.runAsync('PRAGMA synchronous = NORMAL');   // Bon équilibre performance/sécurité
      await this.db.runAsync('PRAGMA cache_size = 10000');     // Cache plus grand (10MB)
      await this.db.runAsync('PRAGMA temp_store = MEMORY');    // Temp tables en mémoire
      
      // Run migrations FIRST to fix existing databases
      await this.runMigrations();
      
      // Create tables individually (safer than execAsync with full schema)
      await this.createTablesIndividually();
      
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

  private async createTablesIndividually(): Promise<void> {
    if (!this.db) return;

    const tables = [
      `CREATE TABLE IF NOT EXISTS passengers (
        id TEXT PRIMARY KEY,
        pnr TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        first_name TEXT NOT NULL,
        flight_number TEXT NOT NULL,
        flight_time TEXT,
        airline TEXT,
        airline_code TEXT,
        departure TEXT NOT NULL,
        arrival TEXT NOT NULL,
        route TEXT NOT NULL,
        company_code TEXT,
        ticket_number TEXT,
        seat_number TEXT,
        cabin_class TEXT,
        baggage_count INTEGER DEFAULT 0,
        baggage_base_number TEXT,
        raw_data TEXT,
        format TEXT,
        checked_in_at TEXT NOT NULL,
        checked_in_by TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS baggages (
        id TEXT PRIMARY KEY,
        passenger_id TEXT NOT NULL,
        tag_number TEXT UNIQUE,
        expected_tag TEXT,
        status TEXT NOT NULL DEFAULT 'checked',
        weight REAL,
        flight_number TEXT,
        airport_code TEXT,
        current_location TEXT,
        checked_at TEXT,
        checked_by TEXT,
        arrived_at TEXT,
        arrived_by TEXT,
        delivered_at TEXT,
        last_scanned_at TEXT,
        last_scanned_by TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (passenger_id) REFERENCES passengers(id)
      )`,
      `CREATE TABLE IF NOT EXISTS boarding_status (
        id TEXT PRIMARY KEY,
        passenger_id TEXT UNIQUE NOT NULL,
        boarded INTEGER DEFAULT 0,
        boarded_at TEXT,
        boarded_by TEXT,
        gate TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (passenger_id) REFERENCES passengers(id)
      )`,
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        airport_code TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS raw_scans (
        id TEXT PRIMARY KEY,
        raw_data TEXT NOT NULL,
        scan_type TEXT NOT NULL,
        status_checkin INTEGER DEFAULT 0,
        status_baggage INTEGER DEFAULT 0,
        status_boarding INTEGER DEFAULT 0,
        status_arrival INTEGER DEFAULT 0,
        checkin_at TEXT,
        checkin_by TEXT,
        baggage_at TEXT,
        baggage_by TEXT,
        baggage_rfid_tag TEXT,
        boarding_at TEXT,
        boarding_by TEXT,
        arrival_at TEXT,
        arrival_by TEXT,
        airport_code TEXT NOT NULL,
        first_scanned_at TEXT NOT NULL,
        last_scanned_at TEXT NOT NULL,
        scan_count INTEGER DEFAULT 1,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS international_baggages (
        id TEXT PRIMARY KEY,
        tag_number TEXT UNIQUE NOT NULL,
        scanned_at TEXT NOT NULL,
        scanned_by TEXT NOT NULL,
        airport_code TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scanned',
        birs_report_id TEXT,
        passenger_name TEXT,
        pnr TEXT,
        flight_number TEXT,
        origin TEXT,
        weight REAL,
        remarks TEXT,
        reconciled_at TEXT,
        reconciled_by TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS birs_reports (
        id TEXT PRIMARY KEY,
        report_type TEXT NOT NULL,
        flight_number TEXT NOT NULL,
        flight_date TEXT NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        airline TEXT NOT NULL,
        airline_code TEXT,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        uploaded_at TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        airport_code TEXT NOT NULL,
        total_baggages INTEGER DEFAULT 0,
        reconciled_count INTEGER DEFAULT 0,
        unmatched_count INTEGER DEFAULT 0,
        processed_at TEXT,
        raw_data TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS birs_report_items (
        id TEXT PRIMARY KEY,
        birs_report_id TEXT NOT NULL,
        bag_id TEXT NOT NULL,
        passenger_name TEXT NOT NULL,
        pnr TEXT,
        seat_number TEXT,
        class TEXT,
        psn TEXT,
        weight REAL,
        route TEXT,
        categories TEXT,
        loaded INTEGER,
        received INTEGER,
        international_baggage_id TEXT,
        reconciled_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (birs_report_id) REFERENCES birs_reports(id)
      )`
    ];

    // Create indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_passengers_pnr ON passengers(pnr)`,
      `CREATE INDEX IF NOT EXISTS idx_passengers_departure ON passengers(departure)`,
      `CREATE INDEX IF NOT EXISTS idx_passengers_arrival ON passengers(arrival)`,
      `CREATE INDEX IF NOT EXISTS idx_baggages_passenger_id ON baggages(passenger_id)`,
      `CREATE INDEX IF NOT EXISTS idx_baggages_tag_number ON baggages(tag_number)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(retry_count)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_log_airport_code ON audit_log(airport_code)`,
      `CREATE INDEX IF NOT EXISTS idx_raw_scans_raw_data ON raw_scans(raw_data)`,
      `CREATE INDEX IF NOT EXISTS idx_raw_scans_airport ON raw_scans(airport_code)`,
      `CREATE INDEX IF NOT EXISTS idx_raw_scans_statuses ON raw_scans(status_checkin, status_baggage, status_boarding, status_arrival)`,
      `CREATE INDEX IF NOT EXISTS idx_raw_scans_rfid ON raw_scans(baggage_rfid_tag)`,
      `CREATE INDEX IF NOT EXISTS idx_raw_scans_scan_type ON raw_scans(scan_type)`,
      `CREATE INDEX IF NOT EXISTS idx_international_baggages_tag_number ON international_baggages(tag_number)`,
      `CREATE INDEX IF NOT EXISTS idx_international_baggages_status ON international_baggages(status)`,
      `CREATE INDEX IF NOT EXISTS idx_international_baggages_airport ON international_baggages(airport_code)`,
      `CREATE INDEX IF NOT EXISTS idx_international_baggages_birs_report ON international_baggages(birs_report_id)`,
      `CREATE INDEX IF NOT EXISTS idx_birs_reports_flight ON birs_reports(flight_number)`,
      `CREATE INDEX IF NOT EXISTS idx_birs_reports_airport ON birs_reports(airport_code)`,
      `CREATE INDEX IF NOT EXISTS idx_birs_reports_date ON birs_reports(flight_date)`,
      `CREATE INDEX IF NOT EXISTS idx_birs_report_items_report_id ON birs_report_items(birs_report_id)`,
      `CREATE INDEX IF NOT EXISTS idx_birs_report_items_bag_id ON birs_report_items(bag_id)`,
      `CREATE INDEX IF NOT EXISTS idx_birs_report_items_intl_baggage ON birs_report_items(international_baggage_id)`
    ];

    // Create tables
    for (const table of tables) {
      try {
        await this.db.runAsync(table);
      } catch (e) {
        console.log('[DB] Table creation skipped (might already exist):', e);
      }
    }

    // Create indexes
    for (const index of indexes) {
      try {
        await this.db.runAsync(index);
      } catch (e) {
        console.log('[DB] Index creation skipped:', e);
      }
    }

    console.log('[DB] All tables and indexes created individually');
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) return;

    try {
      // Check if baggages table exists first
      const tables = await this.db.getAllAsync<any>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='baggages'"
      );
      
      if (tables.length === 0) {
        console.log('[DB] baggages table does not exist yet, skipping migrations');
        return;
      }

      // Check if tag_number column exists in baggages table
      const baggagesInfo = await this.db.getAllAsync<any>(
        "PRAGMA table_info(baggages)"
      );
      
      const existingColumnNames = baggagesInfo.map((col: any) => col.name);
      console.log('[DB] Existing baggages columns:', existingColumnNames.join(', '));
      const hasTagNumber = existingColumnNames.includes('tag_number');
      
      if (!hasTagNumber) {
        console.log('[DB] ⚠️ tag_number column MISSING - recreating baggages table');
        try {
          // Supprimer l'ancienne table et la recréer avec le bon schéma
          await this.db.runAsync(`DROP TABLE IF EXISTS baggages`);
          await this.db.runAsync(`CREATE TABLE IF NOT EXISTS baggages (
            id TEXT PRIMARY KEY,
            passenger_id TEXT NOT NULL,
            tag_number TEXT,
            expected_tag TEXT,
            status TEXT NOT NULL DEFAULT 'checked',
            weight REAL,
            flight_number TEXT,
            airport_code TEXT,
            current_location TEXT,
            checked_at TEXT,
            checked_by TEXT,
            arrived_at TEXT,
            arrived_by TEXT,
            delivered_at TEXT,
            last_scanned_at TEXT,
            last_scanned_by TEXT,
            synced INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (passenger_id) REFERENCES passengers(id)
          )`);
          await this.db.runAsync(`CREATE INDEX IF NOT EXISTS idx_baggages_tag_number ON baggages(tag_number)`);
          await this.db.runAsync(`CREATE INDEX IF NOT EXISTS idx_baggages_passenger_id ON baggages(passenger_id)`);
          console.log('[DB] ✅ baggages table recreated with tag_number column');
        } catch (e: any) {
          console.error('[DB] Failed to recreate baggages table:', e?.message || e);
        }
        return; // Skip other migrations since we recreated the table
      } else {
        console.log('[DB] ✅ tag_number column already exists');
      }

      // Check if other expected columns exist in baggages
      const expectedColumns = ['expected_tag', 'weight', 'flight_number', 'airport_code', 'current_location', 'delivered_at', 'last_scanned_at', 'last_scanned_by'];
      
      for (const col of expectedColumns) {
        if (!existingColumnNames.includes(col)) {
          console.log(`[DB] Adding missing column ${col} to baggages table`);
          let columnDef = `${col} TEXT`;
          if (col === 'weight') columnDef = `${col} REAL`;
          try {
            await this.db.runAsync(`ALTER TABLE baggages ADD COLUMN ${columnDef}`);
          } catch (e) {
            console.log(`[DB] Column ${col} might already exist`);
          }
        }
      }

      // Check passengers table for missing columns
      const passengersInfo = await this.db.getAllAsync<any>(
        "PRAGMA table_info(passengers)"
      );
      
      const passengerExistingColumnNames = passengersInfo.map((col: any) => col.name);
      const passengerExpectedColumns = ['baggage_count', 'baggage_base_number'];
      
      for (const col of passengerExpectedColumns) {
        if (!passengerExistingColumnNames.includes(col)) {
          console.log(`[DB] Adding missing column ${col} to passengers table`);
          let columnDef = `${col} TEXT`;
          if (col === 'baggage_count') columnDef = `${col} INTEGER DEFAULT 0`;
          try {
            await this.db.runAsync(`ALTER TABLE passengers ADD COLUMN ${columnDef}`);
          } catch (e) {
            console.log(`[DB] Column ${col} might already exist`);
          }
        }
      }

      console.log('[DB] Migrations completed successfully');
    } catch (error) {
      console.error('[DB] Migration error:', error);
      // Don't throw - migrations are optional, database should still work
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

    // ✅ SYNCHRONISATION: Ajouter à la queue pour envoi vers PostgreSQL
    // Note: Seules les colonnes existantes dans le schéma PostgreSQL
    await this.addToSyncQueue({
      tableName: 'passengers',
      recordId: id,
      operation: 'CREATE',
      data: JSON.stringify({
        pnr: passenger.pnr,
        full_name: passenger.fullName,
        flight_number: passenger.flightNumber,
        seat_number: passenger.seatNumber || null,
        class: passenger.cabinClass || null,
        departure: passenger.departure,
        arrival: passenger.arrival,
        airport_code: (passenger as any).airportCode || passenger.departure,
        baggage_count: passenger.baggageCount || 0,
        baggage_base_number: passenger.baggageBaseNumber || null,
        checked_in: true,
        checked_in_at: passenger.checkedInAt,
      }),
      retryCount: 0,
      userId: passenger.checkedInBy,
    });

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
   * @returns Le passager trouvé ou null
   */
  async getPassengerByExpectedTag(tagNumber: string): Promise<Passenger | null> {
    if (!this.db) throw new Error('Database not initialized');

    const cleanTag = tagNumber.trim();
    
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
          // Mapper les colonnes snake_case vers camelCase
          return {
            id: passenger.id,
            pnr: passenger.pnr,
            fullName: passenger.full_name,
            firstName: passenger.first_name,
            lastName: passenger.last_name,
            flightNumber: passenger.flight_number,
            flightTime: passenger.flight_time,
            airline: passenger.airline,
            airlineCode: passenger.airline_code,
            departure: passenger.departure,
            arrival: passenger.arrival,
            route: passenger.route,
            companyCode: passenger.company_code,
            ticketNumber: passenger.ticket_number,
            seatNumber: passenger.seat_number,
            cabinClass: passenger.cabin_class,
            baggageCount: passenger.baggage_count,
            baggageBaseNumber: passenger.baggage_base_number,
            rawData: passenger.raw_data,
            format: passenger.format,
            checkedInAt: passenger.checked_in_at,
            checkedInBy: passenger.checked_in_by,
            synced: Boolean(passenger.synced),
            createdAt: passenger.created_at,
            updatedAt: passenger.updated_at,
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
        id, passenger_id, tag_number, expected_tag, status, weight,
        flight_number, airport_code, current_location,
        checked_at, checked_by, arrived_at, arrived_by, delivered_at,
        last_scanned_at, last_scanned_by, synced, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        baggage.passengerId,
        baggage.tagNumber,
        baggage.expectedTag || null,
        baggage.status,
        baggage.weight || null,
        baggage.flightNumber || null,
        baggage.airportCode || null,
        baggage.currentLocation || null,
        baggage.checkedAt || null,
        baggage.checkedBy || null,
        baggage.arrivedAt || null,
        baggage.arrivedBy || null,
        baggage.deliveredAt || null,
        baggage.lastScannedAt || null,
        baggage.lastScannedBy || null,
        baggage.synced ? 1 : 0,
        now,
        now,
      ]
    );

    // ✅ SYNCHRONISATION: Ajouter à la queue pour envoi vers PostgreSQL
    // Note: passenger_id n'est pas inclus car c'est un ID local, pas un UUID PostgreSQL
    await this.addToSyncQueue({
      tableName: 'baggages',
      recordId: id,
      operation: 'CREATE',
      data: JSON.stringify({
        tag_number: baggage.tagNumber,
        status: baggage.status,
        weight: baggage.weight || null,
        flight_number: baggage.flightNumber || null,
        airport_code: baggage.airportCode || null,
        current_location: baggage.currentLocation || null,
        checked_at: baggage.checkedAt || null,
        arrived_at: baggage.arrivedAt || null,
        delivered_at: baggage.deliveredAt || null,
        last_scanned_at: baggage.lastScannedAt || null,
      }),
      retryCount: 0,
      userId: baggage.checkedBy || 'system',
    });

    return id;
  }

  async getBaggageByTagNumber(tagNumber: string): Promise<Baggage | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM baggages WHERE tag_number = ?',
      [tagNumber]
    );

    if (result) {
      // Mapper snake_case (SQLite) vers camelCase (TypeScript)
      return {
        id: result.id,
        passengerId: result.passenger_id,
        tagNumber: result.tag_number,
        expectedTag: result.expected_tag,
        status: result.status,
        weight: result.weight,
        flightNumber: result.flight_number,
        airportCode: result.airport_code,
        currentLocation: result.current_location,
        checkedAt: result.checked_at,
        checkedBy: result.checked_by,
        arrivedAt: result.arrived_at,
        arrivedBy: result.arrived_by,
        deliveredAt: result.delivered_at,
        lastScannedAt: result.last_scanned_at,
        lastScannedBy: result.last_scanned_by,
        synced: Boolean(result.synced),
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      };
    }

    return null;
  }

  async getBaggagesByPassengerId(passengerId: string): Promise<Baggage[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM baggages WHERE passenger_id = ? ORDER BY created_at ASC',
      [passengerId]
    );

    return results.map(b => ({
      id: b.id,
      passengerId: b.passenger_id,
      tagNumber: b.tag_number,
      expectedTag: b.expected_tag,
      status: b.status,
      weight: b.weight,
      flightNumber: b.flight_number,
      airportCode: b.airport_code,
      currentLocation: b.current_location,
      checkedAt: b.checked_at,
      checkedBy: b.checked_by,
      arrivedAt: b.arrived_at,
      arrivedBy: b.arrived_by,
      deliveredAt: b.delivered_at,
      lastScannedAt: b.last_scanned_at,
      lastScannedBy: b.last_scanned_by,
      synced: Boolean(b.synced),
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));
  }

  // Batch methods for performance optimization
  async getBaggagesByPassengerIds(passengerIds: string[]): Promise<Baggage[]> {
    if (!this.db) throw new Error('Database not initialized');
    if (passengerIds.length === 0) return [];

    // Create placeholders for IN clause
    const placeholders = passengerIds.map(() => '?').join(',');
    const results = await this.db.getAllAsync<any>(
      `SELECT * FROM baggages WHERE passenger_id IN (${placeholders}) ORDER BY passenger_id, created_at ASC`,
      passengerIds
    );

    return results.map(b => ({
      id: b.id,
      passengerId: b.passenger_id,
      tagNumber: b.tag_number,
      expectedTag: b.expected_tag,
      status: b.status,
      weight: b.weight,
      flightNumber: b.flight_number,
      airportCode: b.airport_code,
      currentLocation: b.current_location,
      checkedAt: b.checked_at,
      checkedBy: b.checked_by,
      arrivedAt: b.arrived_at,
      arrivedBy: b.arrived_by,
      deliveredAt: b.delivered_at,
      lastScannedAt: b.last_scanned_at,
      lastScannedBy: b.last_scanned_by,
      synced: Boolean(b.synced),
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));
  }

  async getBaggagesByAirport(airportCode: string): Promise<Baggage[]> {
    if (!this.db) throw new Error('Database not initialized');

    // Get baggages for passengers that have departure or arrival matching the airport
    const results = await this.db.getAllAsync<any>(
      `SELECT b.* FROM baggages b
       INNER JOIN passengers p ON b.passenger_id = p.id
       WHERE p.departure = ? OR p.arrival = ?
       ORDER BY b.created_at DESC`,
      [airportCode, airportCode]
    );

    return results.map(b => ({
      id: b.id,
      passengerId: b.passenger_id,
      tagNumber: b.tag_number,
      expectedTag: b.expected_tag,
      status: b.status,
      weight: b.weight,
      flightNumber: b.flight_number,
      airportCode: b.airport_code,
      currentLocation: b.current_location,
      checkedAt: b.checked_at,
      checkedBy: b.checked_by,
      arrivedAt: b.arrived_at,
      arrivedBy: b.arrived_by,
      deliveredAt: b.delivered_at,
      lastScannedAt: b.last_scanned_at,
      lastScannedBy: b.last_scanned_by,
      synced: Boolean(b.synced),
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));
  }

  async updateBaggageStatus(baggageId: string, status: 'checked' | 'loaded' | 'in_transit' | 'arrived' | 'delivered' | 'rush' | 'lost', userId: string): Promise<void> {
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

