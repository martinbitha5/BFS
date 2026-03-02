import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { SyncQueueItem } from '../types/sync.types';
import { setSyncQueueCallback } from '../utils/sync-trigger';
import { databaseService } from './database.service';
import { flightService } from './flight.service';

const STORAGE_KEYS = {
    AUTO_SYNC_ENABLED: '@bfs:auto_sync_enabled',
    API_URL: '@bfs:api_url',
    API_KEY: '@bfs:api_key',
};

/** Envoi par lots (batch) : une requête API par type de table */

/**
 * Service de synchronisation automatique avec Supabase
 * Traite la queue de synchronisation et envoie les données vers l'API
 * - Sync instantanée : intervalle 2s quand données en attente, 30s sinon
 * - Sync au retour de l'app (AppState)
 * - Traitement en parallèle (8 requêtes simultanées)
 */
class SyncService {
    private isSyncing: boolean = false;
    private syncAgainWhenDone: boolean = false;
    private syncTimeout: ReturnType<typeof setTimeout> | null = null;
    private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
    private readonly SYNC_INTERVAL_WHEN_PENDING_MS = 400; // 400ms quand données en attente → sync très rapide
    private readonly SYNC_INTERVAL_WHEN_EMPTY_MS = 30000; // 30 secondes quand la file est vide
    
    // ✅ CACHE pour éviter les appels répétés à AsyncStorage
    private cachedApiUrl: string | null = null;
    private cachedApiKey: string | null = null;
    private cacheLoaded: boolean = false;

    /**
     * Calcule le délai d'attente avant retry avec backoff exponentiel
     * Formule: min(baseDelay * 2^retryCount, maxDelay)
     */
    private getBackoffDelay(retryCount: number): number {
        const baseDelay = 1000; // 1 seconde
        const maxDelay = 5 * 60 * 1000; // 5 minutes max
        const exponentialDelay = baseDelay * Math.pow(2, retryCount);
        return Math.min(exponentialDelay, maxDelay);
    }

    /**
     * Planifie la prochaine synchronisation (intervalle adaptatif)
     */
    private scheduleNextSync(): void {
        if (this.syncTimeout) clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(async () => {
            const result = await this.syncPendingItems();
            if (this.syncAgainWhenDone) {
                this.syncAgainWhenDone = false;
                this.syncTimeout = setTimeout(() => this.triggerSyncNow(), 0);
                return;
            }
            const pending = await this.getPendingCount();
            const delay = pending > 0 || result.success > 0
                ? this.SYNC_INTERVAL_WHEN_PENDING_MS
                : this.SYNC_INTERVAL_WHEN_EMPTY_MS;
            this.syncTimeout = setTimeout(() => this.scheduleNextSync(), delay);
        }, 0);
    }

    /**
     * Démarre la synchronisation automatique
     */
    async startAutoSync(): Promise<void> {
        const autoSyncEnabled = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_SYNC_ENABLED);
        if (autoSyncEnabled === 'false') {
            console.log('[Sync] Auto-sync désactivée');
            return;
        }

        this.stopAutoSync();

        console.log('[Sync] Démarrage de la synchronisation automatique (instantanée)');

        // Première sync immédiate
        await this.syncPendingItems();

        // Sync immédiate quand items ajoutés à la queue (check-in, baggage, etc.)
        setSyncQueueCallback(() => this.triggerSyncNow());

        // Sync au retour de l'app (AppState)
        this.appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') {
                console.log('[Sync] App au premier plan → sync immédiate');
                this.syncPendingItems().catch((e) => console.warn('[Sync] Erreur sync au focus:', e));
            }
        });

        // Intervalle adaptatif : 2s si données en attente, 30s sinon
        const pending = await this.getPendingCount();
        const delay = pending > 0 ? this.SYNC_INTERVAL_WHEN_PENDING_MS : this.SYNC_INTERVAL_WHEN_EMPTY_MS;
        this.syncTimeout = setTimeout(() => this.scheduleNextSync(), delay);
    }

    /**
     * Arrête la synchronisation automatique
     */
    stopAutoSync(): void {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = null;
        }
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
            this.appStateSubscription = null;
        }
        setSyncQueueCallback(null);
        console.log('[Sync] Synchronisation automatique arrêtée');
    }

    /**
     * Déclenche une sync immédiate (appelé quand des items sont ajoutés à la queue)
     */
    triggerSyncNow(): void {
        if (this.isSyncing) {
            this.syncAgainWhenDone = true;
            return;
        }
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = null;
        }
        this.syncPendingItems().then((result) => {
            if (this.syncAgainWhenDone) {
                this.syncAgainWhenDone = false;
                setTimeout(() => this.triggerSyncNow(), 0);
                return;
            }
            const delay = result.success > 0 || result.failed > 0
                ? this.SYNC_INTERVAL_WHEN_PENDING_MS
                : this.SYNC_INTERVAL_WHEN_EMPTY_MS;
            this.syncTimeout = setTimeout(() => this.scheduleNextSync(), delay);
        });
    }

    /**
     * Groupe les items par type de table (exclut les items invalides)
     */
    private groupByTable(items: SyncQueueItem[]): Map<string, SyncQueueItem[]> {
        const map = new Map<string, SyncQueueItem[]>();
        for (const item of items) {
            if (!item.tableName || String(item.tableName) === 'undefined') continue;
            const list = map.get(item.tableName) || [];
            list.push(item);
            map.set(item.tableName, list);
        }
        return map;
    }

    /**
     * Synchronise un batch d'items du même type en une seule requête API
     */
    private async syncBatch(tableName: string, items: SyncQueueItem[]): Promise<{ success: number; failed: number }> {
        if (items.length === 0) return { success: 0, failed: 0 };

        await this.loadApiConfig();
        const apiUrl = this.cachedApiUrl;
        const apiKey = this.cachedApiKey;

        if (!apiUrl) {
            throw new Error('Configuration API manquante (API_URL non définie)');
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['x-api-key'] = apiKey;

        let endpoint = '';
        let body: Record<string, unknown>;

        switch (tableName) {
            case 'passengers': {
                const passengers = items.map((item) => {
                    const data = JSON.parse(item.data);
                    return {
                        pnr: data.pnr,
                        full_name: data.full_name || data.fullName,
                        flight_number: data.flight_number || data.flightNumber,
                        seat_number: data.seat_number || data.seatNumber || null,
                        departure: data.departure,
                        arrival: data.arrival,
                        airport_code: data.airport_code || data.airportCode,
                        baggage_count: data.baggage_count ?? data.baggageCount ?? 0,
                        baggage_base_number: data.baggage_base_number || data.baggageBaseNumber || null,
                        checked_in_at: data.checked_in_at || data.checkedInAt || new Date().toISOString(),
                    };
                });
                endpoint = `${apiUrl}/api/v1/passengers/sync`;
                body = { passengers };
                break;
            }
            case 'baggages': {
                const baggages = items.map((item) => {
                    const data = JSON.parse(item.data);
                    const { id: _, ...rest } = data;
                    return rest;
                });
                endpoint = `${apiUrl}/api/v1/baggage/sync`;
                body = { baggages };
                break;
            }
            case 'boarding_status': {
                const boardings = items.map((item) => {
                    const data = JSON.parse(item.data);
                    return {
                        passenger_id: data.passenger_id,
                        boarded_at: data.boarded_at || new Date().toISOString(),
                        ...(data.boarded_by && { boarded_by: data.boarded_by }),
                    };
                }).filter((b: any) => b.passenger_id);
                if (boardings.length === 0) return { success: items.length, failed: 0 };
                endpoint = `${apiUrl}/api/v1/boarding/sync`;
                body = { boardings };
                break;
            }
            case 'raw_scans':
                // Pas d'endpoint batch pour raw_scans, on traite un par un
                return this.syncRawScansIndividually(items);
            default:
                throw new Error(`Table non supportée: ${tableName}`);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            if (result.errors && result.errors.length > 0) {
                throw new Error(`Erreurs API: ${JSON.stringify(result.errors)}`);
            }

            await databaseService.removeSyncQueueItems(items.map((i) => i.id));
            console.log(`[Sync] ✓ Batch ${tableName}: ${items.length} élément(s) synchronisé(s)`);
            return { success: items.length, failed: 0 };
        } catch (error: any) {
            const errMsg = `${error.message} (${new Date().toISOString()})`;
            for (const item of items) {
                await databaseService.updateSyncQueueItem(item.id, item.retryCount + 1, errMsg);
            }
            console.error(`[Sync] ❌ Batch ${tableName}: ${error.message}`);
            return { success: 0, failed: items.length };
        }
    }

    /**
     * raw_scans n'a pas d'endpoint batch : envoi un par un
     */
    private async syncRawScansIndividually(items: SyncQueueItem[]): Promise<{ success: number; failed: number }> {
        let success = 0;
        let failed = 0;
        for (const item of items) {
            try {
                await this.syncItem(item);
                await databaseService.removeSyncQueueItem(item.id);
                success++;
            } catch (error: any) {
                await databaseService.updateSyncQueueItem(
                    item.id,
                    item.retryCount + 1,
                    `${error.message} (${new Date().toISOString()})`
                );
                failed++;
            }
        }
        return { success, failed };
    }

    /**
     * Synchronise les éléments en attente (batch par type de table)
     */
    async syncPendingItems(): Promise<{ success: number; failed: number }> {
        if (this.isSyncing) {
            return { success: 0, failed: 0 };
        }

        this.isSyncing = true;
        let totalSuccess = 0;
        let totalFailed = 0;

        try {
            const pendingItems = await databaseService.getPendingSyncItems(100);

            if (pendingItems.length === 0) {
                return { success: 0, failed: 0 };
            }

            const grouped = this.groupByTable(pendingItems);
            console.log(`[Sync] ${pendingItems.length} élément(s) → ${grouped.size} batch(s)`);

            for (const [tableName, items] of grouped) {
                const { success, failed } = await this.syncBatch(tableName, items);
                totalSuccess += success;
                totalFailed += failed;
            }

            if (totalSuccess > 0 || totalFailed > 0) {
                console.log(`[Sync] ✓ ${totalSuccess} OK, ✗ ${totalFailed} échoué(s)`);
                if (totalSuccess > 0) flightService.clearFlightsCache();
            }
        } catch (error) {
            console.error('[Sync] Erreur lors de la synchronisation:', error);
        } finally {
            this.isSyncing = false;
        }

        return { success: totalSuccess, failed: totalFailed };
    }

    /**
     * Charge et met en cache les valeurs API (appelé une seule fois)
     */
    private async loadApiConfig(): Promise<void> {
        if (this.cacheLoaded) return;
        
        this.cachedApiUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_URL);
        this.cachedApiKey = await AsyncStorage.getItem(STORAGE_KEYS.API_KEY);
        this.cacheLoaded = true;
    }

    /**
     * Synchronise un élément spécifique
     */
    private async syncItem(item: SyncQueueItem): Promise<void> {
        // ✅ Utiliser le cache au lieu de charger à chaque fois
        await this.loadApiConfig();
        const apiUrl = this.cachedApiUrl;
        const apiKey = this.cachedApiKey;

        if (!apiUrl) {
            throw new Error('Configuration API manquante (API_URL non définie)');
        }

        let data = JSON.parse(item.data);
        let endpoint = '';
        let method = 'POST';

        // Déterminer l'endpoint selon la table
        switch (item.tableName) {
            case 'passengers':
                // Utiliser /sync pour éviter la validation du vol
                endpoint = `${apiUrl}/api/v1/passengers/sync`;
                method = 'POST';
                // Nettoyer et mapper les colonnes du passager pour l'API
                // Note: airline et airline_code n'existent pas dans la table passengers
                const cleanPassenger = {
                    pnr: data.pnr,
                    full_name: data.full_name || data.fullName,
                    flight_number: data.flight_number || data.flightNumber,
                    seat_number: data.seat_number || data.seatNumber || null,
                    departure: data.departure,
                    arrival: data.arrival,
                    airport_code: data.airport_code || data.airportCode,
                    baggage_count: data.baggage_count ?? data.baggageCount ?? 0,
                    baggage_base_number: data.baggage_base_number || data.baggageBaseNumber || null,
                    checked_in_at: data.checked_in_at || data.checkedInAt || new Date().toISOString(),
                };
                // Wrapper les données dans un tableau pour /sync
                data = { passengers: [cleanPassenger] };
                break;
            case 'baggages':
                endpoint = `${apiUrl}/api/v1/baggage/sync`;
                method = 'POST';
                // Supprimer l'ID local (non-UUID) avant d'envoyer à l'API
                const { id: localBaggageId, ...baggageDataWithoutId } = data;
                // Wrapper les données dans un tableau pour /sync
                data = { baggages: [baggageDataWithoutId] };
                break;
            case 'boarding_status':
                endpoint = `${apiUrl}/api/v1/boarding`;
                method = 'POST';
                break;
            case 'raw_scans':
                // ✅ NOUVEAU: Support des raw scans
                endpoint = `${apiUrl}/api/v1/raw-scans`;
                method = 'POST'; // L'API gère CREATE et UPDATE automatiquement
                // Convertir baggageRfidTag en baggage_rfid_tag pour l'API
                if (data.baggageRfidTag !== undefined) {
                    data.baggage_rfid_tag = data.baggageRfidTag;
                    delete data.baggageRfidTag;
                }
                break;
            default:
                throw new Error(`Table non supportée: ${item.tableName}`);
        }


        console.log(`[Sync] 📡 Requête: ${method} ${endpoint}`);
        console.log(`[Sync] 📦 Données:`, JSON.stringify(data, null, 2));

        try {
            // Construire les headers
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            
            // Ajouter l'API key seulement si elle est définie
            if (apiKey) {
                headers['x-api-key'] = apiKey;
            }
            
            // Timeout 15s pour éviter les blocages en production
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(endpoint, {
                method,
                headers,
                body: JSON.stringify(data),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            console.log(`[Sync] 📨 Réponse HTTP: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[Sync] 📛 Erreur serveur:`, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log(`[Sync] ✅ Réponse API:`, JSON.stringify(result));
            
            // Vérifier si l'API a retourné des erreurs
            if (result.errors && result.errors.length > 0) {
                console.error(`[Sync] ⚠️ Erreurs retournées par l'API:`, result.errors);
                throw new Error(`Erreurs API: ${JSON.stringify(result.errors)}`);
            }
            
            // Vérifier que des données ont été insérées/mises à jour
            if (result.count === 0 && item.tableName === 'passengers') {
                console.warn(`[Sync] ⚠️ Aucun passager inséré/mis à jour`);
            }
            
            console.log(`[Sync] ✓ ${item.tableName}/${item.recordId} synchronisé`);
        } catch (fetchError: any) {
            console.error(`[Sync] 🌐 Erreur réseau/fetch:`, fetchError.message);
            throw fetchError;
        }
    }

    /**
     * Force la synchronisation immédiate (manuel)
     */
    async forceSyncNow(): Promise<{ success: number; failed: number }> {
        console.log('[Sync] Synchronisation manuelle déclenchée');
        return await this.syncPendingItems();
    }

    /**
     * Obtient le nombre d'éléments en attente
     */
    async getPendingCount(): Promise<number> {
        const items = await databaseService.getPendingSyncItems(1000);
        return items.length;
    }
}

export const syncService = new SyncService();
