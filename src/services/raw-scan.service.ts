import * as SQLite from 'expo-sqlite';
import { CreateRawScanParams, RawScan, RawScanResult, ScanStatusField } from '../types/raw-scan.types';

/**
 * Service de gestion des scans bruts
 * Stocke les données brutes des scans sans parsing immédiat
 * Le parsing sera effectué dans le dashboard web lors de l'export
 */
class RawScanService {
    private db: SQLite.SQLiteDatabase | null = null;
    private dbServiceCache: any = null; // ✅ Cache pour éviter les imports dynamiques répétés

    /**
     * Initialise le service avec la base de données
     */
    initialize(database: SQLite.SQLiteDatabase): void {
        this.db = database;
    }
    
    /**
     * Obtient le databaseService (avec cache)
     */
    private async getDbService(): Promise<any> {
        if (!this.dbServiceCache) {
            const module = await import('./database.service');
            this.dbServiceCache = module.databaseService;
        }
        return this.dbServiceCache;
    }

    /**
     * Crée ou met à jour un scan brut
     * Si raw_data existe déjà, met à jour le statut au lieu de créer un doublon
     * 
     * @param params - Paramètres du scan
     * @returns { id, isNew, scanCount }
     */
    async createOrUpdateRawScan(params: CreateRawScanParams): Promise<RawScanResult> {
        if (!this.db) throw new Error('RawScanService not initialized');

        const { rawData, scanType, statusField, userId, airportCode, baggageRfidTag } = params;

        // 1. Chercher si raw_data existe déjà
        const existing = await this.findByRawData(rawData);

        if (existing) {
            // Mise à jour du statut existant
            await this.updateStatus(existing.id, statusField, userId, baggageRfidTag);

            // Récupérer le scan_count mis à jour
            const updated = await this.findById(existing.id);
            
            // ✅ AJOUTER À LA QUEUE DE SYNCHRONISATION (mise à jour)
            await this.addToSyncQueue(existing.id, 'UPDATE', updated!, userId);

            return {
                id: existing.id,
                isNew: false,
                scanCount: updated?.scanCount || existing.scanCount + 1,
            };
        }

        // 2. Créer un nouveau scan
        const id = `raw_scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        const statusColumnName = `status_${statusField}`;
        const timestampColumnName = `${statusField}_at`;
        const userColumnName = `${statusField}_by`;

        // Construction de la requête SQL dynamique
        const columns = [
            'id', 'raw_data', 'scan_type', 'airport_code',
            statusColumnName, timestampColumnName, userColumnName,
            'first_scanned_at', 'last_scanned_at',
            'scan_count', 'synced', 'created_at', 'updated_at'
        ];

        const values = [
            id, rawData, scanType, airportCode,
            1, now, userId,
            now, now,
            1, 0, now, now
        ];

        // Ajouter baggage_rfid_tag si fourni
        if (baggageRfidTag) {
            columns.push('baggage_rfid_tag');
            values.push(baggageRfidTag);
        }

        const placeholders = columns.map(() => '?').join(', ');
        const columnsStr = columns.join(', ');

        await this.db.runAsync(
            `INSERT INTO raw_scans (${columnsStr}) VALUES (${placeholders})`,
            values
        );
        
        // Récupérer le scan créé pour la sync
        const newScan = await this.findById(id);
        
        // ✅ AJOUTER À LA QUEUE DE SYNCHRONISATION (nouveau scan)
        if (newScan) {
            await this.addToSyncQueue(id, 'CREATE', newScan, userId);
        }

        return {
            id,
            isNew: true,
            scanCount: 1,
        };
    }

    /**
     * Ajoute un raw scan à la queue de synchronisation
     */
    private async addToSyncQueue(
        recordId: string,
        operation: 'CREATE' | 'UPDATE',
        scanData: RawScan,
        userId: string
    ): Promise<void> {
        if (!this.db) return;
        
        try {
            // ✅ Utiliser le cache au lieu de l'import dynamique répété
            const databaseService = await this.getDbService();
            
            // ✅ TRANSFORMER EN SNAKE_CASE POUR L'API
            const apiData = {
                raw_data: scanData.rawData,
                scan_type: scanData.scanType,
                status_checkin: scanData.statusCheckin,
                status_baggage: scanData.statusBaggage,
                status_boarding: scanData.statusBoarding,
                status_arrival: scanData.statusArrival,
                checkin_at: scanData.checkinAt,
                baggage_at: scanData.baggageAt,
                baggage_rfid_tag: scanData.baggageRfidTag,
                boarding_at: scanData.boardingAt,
                arrival_at: scanData.arrivalAt,
                airport_code: scanData.airportCode,
                first_scanned_at: scanData.firstScannedAt,
                last_scanned_at: scanData.lastScannedAt,
                scan_count: scanData.scanCount,
            };
            
            // ⚠️ DÉSACTIVÉ: Raw scans ne sont pas synchronisés
            // Les raw scans restent locaux uniquement
            // await databaseService.addToSyncQueue({
            //     tableName: 'raw_scans',
            //     recordId,
            //     operation,
            //     data: JSON.stringify(apiData),
            //     retryCount: 0,
            //     userId,
            // });
            
            console.log(`[RawScan] ✅ Enregistré localement (pas de sync): ${operation} - ${recordId}`);
        } catch (error) {
            console.error('[RawScan] Erreur lors de l\'enregistrement local:', error);
            // Ne pas bloquer l'opération principale si l'enregistrement échoue
        }
    }

    /**
     * Met à jour un statut spécifique d'un scan existant
     * 
     * @param id - ID du scan
     * @param statusField - Champ de statut à mettre à jour
     * @param userId - ID de l'utilisateur
     * @param baggageRfidTag - Tag RFID (optionnel, pour baggage)
     */
    async updateStatus(
        id: string,
        statusField: ScanStatusField,
        userId: string,
        baggageRfidTag?: string
    ): Promise<void> {
        if (!this.db) throw new Error('RawScanService not initialized');

        const now = new Date().toISOString();
        const statusColumnName = `status_${statusField}`;
        const timestampColumnName = `${statusField}_at`;
        const userColumnName = `${statusField}_by`;

        // Construction dynamique de la requête
        let updateParts = [
            `${statusColumnName} = 1`,
            `${timestampColumnName} = ?`,
            `${userColumnName} = ?`,
            'last_scanned_at = ?',
            'scan_count = scan_count + 1',
            'updated_at = ?'
        ];

        let updateValues = [now, userId, now, now];

        // Ajouter baggage_rfid_tag si fourni et si c'est un scan baggage
        if (baggageRfidTag && statusField === 'baggage') {
            updateParts.push('baggage_rfid_tag = ?');
            updateValues.push(baggageRfidTag);
        }

        updateValues.push(id);

        await this.db.runAsync(
            `UPDATE raw_scans SET ${updateParts.join(', ')} WHERE id = ?`,
            updateValues
        );
    }

    /**
     * Trouve un scan par raw_data
     * 
     * @param rawData - Données brutes scannées
     * @returns Le scan trouvé ou null
     */
    async findByRawData(rawData: string): Promise<RawScan | null> {
        if (!this.db) throw new Error('RawScanService not initialized');

        const result = await this.db.getFirstAsync<any>(
            'SELECT * FROM raw_scans WHERE raw_data = ?',
            [rawData]
        );

        if (!result) return null;

        return this.mapToRawScan(result);
    }

    /**
     * Trouve un scan par ID
     * 
     * @param id - ID du scan
     * @returns Le scan trouvé ou null
     */
    async findById(id: string): Promise<RawScan | null> {
        if (!this.db) throw new Error('RawScanService not initialized');

        const result = await this.db.getFirstAsync<any>(
            'SELECT * FROM raw_scans WHERE id = ?',
            [id]
        );

        if (!result) return null;

        return this.mapToRawScan(result);
    }

    /**
     * Récupère tous les scans d'un aéroport
     * 
     * @param airportCode - Code de l'aéroport
     * @param limit - Nombre maximum de résultats
     * @returns Liste des scans
     */
    async getByAirport(airportCode: string, limit: number = 100): Promise<RawScan[]> {
        if (!this.db) throw new Error('RawScanService not initialized');

        const results = await this.db.getAllAsync<any>(
            'SELECT * FROM raw_scans WHERE airport_code = ? ORDER BY last_scanned_at DESC LIMIT ?',
            [airportCode, limit]
        );

        return results.map(r => this.mapToRawScan(r));
    }

    /**
     * Récupère tous les scans non synchronisés
     * 
     * @param limit - Nombre maximum de résultats
     * @returns Liste des scans
     */
    async getPendingSync(limit: number = 50): Promise<RawScan[]> {
        if (!this.db) throw new Error('RawScanService not initialized');

        const results = await this.db.getAllAsync<any>(
            'SELECT * FROM raw_scans WHERE synced = 0 ORDER BY created_at ASC LIMIT ?',
            [limit]
        );

        return results.map(r => this.mapToRawScan(r));
    }

    /**
     * Marque un scan comme synchronisé
     * 
     * @param id - ID du scan
     */
    async markAsSynced(id: string): Promise<void> {
        if (!this.db) throw new Error('RawScanService not initialized');

        await this.db.runAsync(
            'UPDATE raw_scans SET synced = 1 WHERE id = ?',
            [id]
        );
    }

    /**
     * Compte le nombre de scans par type
     * 
     * @param airportCode - Code de l'aéroport
     * @returns Statistiques
     */
    async getStats(airportCode: string): Promise<{
        total: number;
        boardingPass: number;
        baggageTag: number;
        checkinCompleted: number;
        baggageCompleted: number;
        boardingCompleted: number;
        arrivalCompleted: number;
    }> {
        if (!this.db) throw new Error('RawScanService not initialized');

        const result = await this.db.getFirstAsync<any>(
            `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN scan_type = 'boarding_pass' THEN 1 ELSE 0 END) as boardingPass,
        SUM(CASE WHEN scan_type = 'baggage_tag' THEN 1 ELSE 0 END) as baggageTag,
        SUM(CASE WHEN status_checkin = 1 THEN 1 ELSE 0 END) as checkinCompleted,
        SUM(CASE WHEN status_baggage = 1 THEN 1 ELSE 0 END) as baggageCompleted,
        SUM(CASE WHEN status_boarding = 1 THEN 1 ELSE 0 END) as boardingCompleted,
        SUM(CASE WHEN status_arrival = 1 THEN 1 ELSE 0 END) as arrivalCompleted
      FROM raw_scans WHERE airport_code = ?`,
            [airportCode]
        );

        return {
            total: result?.total || 0,
            boardingPass: result?.boardingPass || 0,
            baggageTag: result?.baggageTag || 0,
            checkinCompleted: result?.checkinCompleted || 0,
            baggageCompleted: result?.baggageCompleted || 0,
            boardingCompleted: result?.boardingCompleted || 0,
            arrivalCompleted: result?.arrivalCompleted || 0,
        };
    }

    /**
     * Mappe un résultat de base de données vers RawScan
     */
    private mapToRawScan(row: any): RawScan {
        return {
            id: row.id,
            rawData: row.raw_data,
            scanType: row.scan_type,
            statusCheckin: Boolean(row.status_checkin),
            statusBaggage: Boolean(row.status_baggage),
            statusBoarding: Boolean(row.status_boarding),
            statusArrival: Boolean(row.status_arrival),
            checkinAt: row.checkin_at,
            checkinBy: row.checkin_by,
            baggageAt: row.baggage_at,
            baggageBy: row.baggage_by,
            baggageRfidTag: row.baggage_rfid_tag,
            boardingAt: row.boarding_at,
            boardingBy: row.boarding_by,
            arrivalAt: row.arrival_at,
            arrivalBy: row.arrival_by,
            airportCode: row.airport_code,
            firstScannedAt: row.first_scanned_at,
            lastScannedAt: row.last_scanned_at,
            scanCount: row.scan_count,
            synced: Boolean(row.synced),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}

export const rawScanService = new RawScanService();
