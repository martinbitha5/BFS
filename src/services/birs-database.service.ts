/**
 * Service de base de données pour le système BIRS
 */

import * as SQLite from 'expo-sqlite';
import {
    BirsReport,
    BirsReportItem,
    BirsStatistics,
    InternationalBaggage,
    InternationalBaggageStatus
} from '../types/birs.types';

class BirsDatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  initialize(database: SQLite.SQLiteDatabase): void {
    this.db = database;
    console.log('[BIRS DB] ✅ Base de données BIRS initialisée');
  }

  /**
   * Vérifie si la base de données est initialisée
   */
  isInitialized(): boolean {
    return this.db !== null;
  }

  // ==================== INTERNATIONAL BAGGAGES ====================

  async createInternationalBaggage(
    data: Omit<InternationalBaggage, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `intl_bag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO international_baggages (
        id, rfid_tag, scanned_at, scanned_by, airport_code, status,
        birs_report_id, passenger_name, pnr, flight_number, origin,
        weight, remarks, reconciled_at, reconciled_by, synced, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.rfidTag,
        data.scannedAt,
        data.scannedBy,
        data.airportCode,
        data.status,
        data.birsReportId || null,
        data.passengerName || null,
        data.pnr || null,
        data.flightNumber || null,
        data.origin || null,
        data.weight || null,
        data.remarks || null,
        data.reconciledAt || null,
        data.reconciledBy || null,
        data.synced ? 1 : 0,
        now,
        now
      ]
    );

    return id;
  }

  async getInternationalBaggageById(id: string): Promise<InternationalBaggage | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM international_baggages WHERE id = ?',
      [id]
    );

    if (!result) return null;

    return this.mapInternationalBaggage(result);
  }

  async getInternationalBaggageByRfidTag(rfidTag: string): Promise<InternationalBaggage | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM international_baggages WHERE rfid_tag = ?',
      [rfidTag]
    );

    if (!result) return null;

    return this.mapInternationalBaggage(result);
  }

  async getInternationalBaggagesByStatus(
    airportCode: string,
    status: InternationalBaggageStatus
  ): Promise<InternationalBaggage[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM international_baggages WHERE airport_code = ? AND status = ? ORDER BY scanned_at DESC',
      [airportCode, status]
    );

    return results.map(r => this.mapInternationalBaggage(r));
  }

  async getUnreconciledBaggages(airportCode: string): Promise<InternationalBaggage[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      `SELECT * FROM international_baggages 
       WHERE airport_code = ? AND status IN ('scanned', 'pending') 
       ORDER BY scanned_at DESC`,
      [airportCode]
    );

    return results.map(r => this.mapInternationalBaggage(r));
  }

  async updateInternationalBaggage(
    id: string,
    updates: Partial<InternationalBaggage>
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        const dbKey = this.camelToSnake(key);
        fields.push(`${dbKey} = ?`);
        
        if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    });

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.runAsync(
      `UPDATE international_baggages SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // ==================== BIRS REPORTS ====================

  async createBirsReport(
    data: Omit<BirsReport, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `birs_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO birs_reports (
        id, report_type, flight_number, flight_date, origin, destination,
        airline, airline_code, file_name, file_size, uploaded_at, uploaded_by,
        airport_code, total_baggages, reconciled_count, unmatched_count,
        processed_at, raw_data, synced, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.reportType,
        data.flightNumber,
        data.flightDate,
        data.origin,
        data.destination,
        data.airline,
        data.airlineCode || null,
        data.fileName,
        data.fileSize,
        data.uploadedAt,
        data.uploadedBy,
        data.airportCode,
        data.totalBaggages,
        data.reconciledCount,
        data.unmatchedCount,
        data.processedAt || null,
        data.rawData,
        data.synced ? 1 : 0,
        now,
        now
      ]
    );

    return id;
  }

  async getBirsReportById(id: string): Promise<BirsReport | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM birs_reports WHERE id = ?',
      [id]
    );

    if (!result) return null;

    return this.mapBirsReport(result);
  }

  async getBirsReportsByAirport(airportCode: string): Promise<BirsReport[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM birs_reports WHERE airport_code = ? ORDER BY uploaded_at DESC',
      [airportCode]
    );

    return results.map(r => this.mapBirsReport(r));
  }

  async updateBirsReport(id: string, updates: Partial<BirsReport>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        const dbKey = this.camelToSnake(key);
        fields.push(`${dbKey} = ?`);
        
        if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    });

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.runAsync(
      `UPDATE birs_reports SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // ==================== BIRS REPORT ITEMS ====================

  async createBirsReportItem(
    data: Omit<BirsReportItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `birs_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO birs_report_items (
        id, birs_report_id, bag_id, passenger_name, pnr, seat_number,
        class, psn, weight, route, categories, loaded, received,
        international_baggage_id, reconciled_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.birsReportId,
        data.bagId,
        data.passengerName,
        data.pnr || null,
        data.seatNumber || null,
        data.class || null,
        data.psn || null,
        data.weight || null,
        data.route || null,
        data.categories || null,
        data.loaded !== undefined ? (data.loaded ? 1 : 0) : null,
        data.received !== undefined ? (data.received ? 1 : 0) : null,
        data.internationalBaggageId || null,
        data.reconciledAt || null,
        now,
        now
      ]
    );

    return id;
  }

  async getBirsReportItemsByReportId(reportId: string): Promise<BirsReportItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM birs_report_items WHERE birs_report_id = ?',
      [reportId]
    );

    return results.map(r => this.mapBirsReportItem(r));
  }

  async updateBirsReportItem(id: string, updates: Partial<BirsReportItem>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        const dbKey = this.camelToSnake(key);
        fields.push(`${dbKey} = ?`);
        
        if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    });

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db.runAsync(
      `UPDATE birs_report_items SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // ==================== STATISTICS ====================

  async getBirsStatistics(airportCode: string): Promise<BirsStatistics> {
    if (!this.db) throw new Error('Database not initialized');

    // Bagages internationaux par statut
    const baggageStats = await this.db.getAllAsync<any>(
      `SELECT status, COUNT(*) as count 
       FROM international_baggages 
       WHERE airport_code = ? 
       GROUP BY status`,
      [airportCode]
    );

    let scannedBaggages = 0;
    let reconciledBaggages = 0;
    let unmatchedBaggages = 0;
    let pendingBaggages = 0;

    baggageStats.forEach((stat: any) => {
      switch (stat.status) {
        case 'scanned':
          scannedBaggages = stat.count;
          break;
        case 'reconciled':
          reconciledBaggages = stat.count;
          break;
        case 'unmatched':
          unmatchedBaggages = stat.count;
          break;
        case 'pending':
          pendingBaggages = stat.count;
          break;
      }
    });

    const totalInternationalBaggages = scannedBaggages + reconciledBaggages + unmatchedBaggages + pendingBaggages;

    // Rapports BIRS
    const reportsCount = await this.db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) as total FROM birs_reports WHERE airport_code = ?',
      [airportCode]
    );

    const totalReports = reportsCount?.total || 0;

    // Rapports de la semaine
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyReports = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM birs_reports 
       WHERE airport_code = ? AND uploaded_at >= ?`,
      [airportCode, oneWeekAgo.toISOString()]
    );

    // Rapports du mois
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const monthlyReports = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM birs_reports 
       WHERE airport_code = ? AND uploaded_at >= ?`,
      [airportCode, oneMonthAgo.toISOString()]
    );

    // Taux de réconciliation moyen
    const avgReconciliation = await this.db.getFirstAsync<{ avg: number }>(
      `SELECT AVG(CAST(reconciled_count AS FLOAT) / CAST(total_baggages AS FLOAT) * 100) as avg 
       FROM birs_reports 
       WHERE airport_code = ? AND total_baggages > 0`,
      [airportCode]
    );

    // Top origines
    const topOrigins = await this.db.getAllAsync<{ airport: string; count: number }>(
      `SELECT origin as airport, COUNT(*) as count 
       FROM birs_reports 
       WHERE airport_code = ? 
       GROUP BY origin 
       ORDER BY count DESC 
       LIMIT 5`,
      [airportCode]
    );

    // Top compagnies
    const topAirlines = await this.db.getAllAsync<{ airline: string; count: number }>(
      `SELECT airline, COUNT(*) as count 
       FROM birs_reports 
       WHERE airport_code = ? 
       GROUP BY airline 
       ORDER BY count DESC 
       LIMIT 5`,
      [airportCode]
    );

    return {
      totalInternationalBaggages,
      scannedBaggages,
      reconciledBaggages,
      unmatchedBaggages,
      pendingBaggages,
      totalReports,
      reportsThisWeek: weeklyReports?.count || 0,
      reportsThisMonth: monthlyReports?.count || 0,
      averageReconciliationRate: Math.round(avgReconciliation?.avg || 0),
      topOrigins: topOrigins || [],
      topAirlines: topAirlines || []
    };
  }

  // ==================== UTILS ====================

  private mapInternationalBaggage(row: any): InternationalBaggage {
    return {
      id: row.id,
      rfidTag: row.rfid_tag,
      scannedAt: row.scanned_at,
      scannedBy: row.scanned_by,
      airportCode: row.airport_code,
      status: row.status,
      birsReportId: row.birs_report_id || undefined,
      passengerName: row.passenger_name || undefined,
      pnr: row.pnr || undefined,
      flightNumber: row.flight_number || undefined,
      origin: row.origin || undefined,
      weight: row.weight || undefined,
      remarks: row.remarks || undefined,
      reconciledAt: row.reconciled_at || undefined,
      reconciledBy: row.reconciled_by || undefined,
      synced: Boolean(row.synced),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapBirsReport(row: any): BirsReport {
    return {
      id: row.id,
      reportType: row.report_type,
      flightNumber: row.flight_number,
      flightDate: row.flight_date,
      origin: row.origin,
      destination: row.destination,
      airline: row.airline,
      airlineCode: row.airline_code || undefined,
      fileName: row.file_name,
      fileSize: row.file_size,
      uploadedAt: row.uploaded_at,
      uploadedBy: row.uploaded_by,
      airportCode: row.airport_code,
      totalBaggages: row.total_baggages,
      reconciledCount: row.reconciled_count,
      unmatchedCount: row.unmatched_count,
      processedAt: row.processed_at || undefined,
      rawData: row.raw_data,
      synced: Boolean(row.synced),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapBirsReportItem(row: any): BirsReportItem {
    return {
      id: row.id,
      birsReportId: row.birs_report_id,
      bagId: row.bag_id,
      passengerName: row.passenger_name,
      pnr: row.pnr || undefined,
      seatNumber: row.seat_number || undefined,
      class: row.class || undefined,
      psn: row.psn || undefined,
      weight: row.weight || undefined,
      route: row.route || undefined,
      categories: row.categories || undefined,
      loaded: row.loaded !== null ? Boolean(row.loaded) : undefined,
      received: row.received !== null ? Boolean(row.received) : undefined,
      internationalBaggageId: row.international_baggage_id || undefined,
      reconciledAt: row.reconciled_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export const birsDatabaseService = new BirsDatabaseService();
