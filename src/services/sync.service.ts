import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncQueueItem } from '../types/sync.types';
import { databaseService } from './database.service';

const STORAGE_KEYS = {
    AUTO_SYNC_ENABLED: '@bfs:auto_sync_enabled',
    API_URL: '@bfs:api_url',
    API_KEY: '@bfs:api_key',
};

/**
 * Service de synchronisation automatique avec Supabase
 * Traite la queue de synchronisation et envoie les données vers l'API
 */
class SyncService {
    private isSyncing: boolean = false;
    private syncInterval: ReturnType<typeof setInterval> | null = null;
    private readonly SYNC_INTERVAL_MS = 30000; // 30 secondes
    private readonly MAX_RETRIES_BEFORE_SLOWDOWN = 50; // Basculer à un intervalle plus long après 50 tentatives
    
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
     * Démarre la synchronisation automatique
     */
    async startAutoSync(): Promise<void> {
        // Vérifier si l'auto-sync est activée
        const autoSyncEnabled = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_SYNC_ENABLED);
        if (autoSyncEnabled === 'false') {
            console.log('[Sync] Auto-sync désactivée');
            return;
        }

        // Arrêter l'intervalle existant
        this.stopAutoSync();

        console.log('[Sync] Démarrage de la synchronisation automatique');

        // Première synchronisation immédiate
        await this.syncPendingItems();

        // Synchronisation périodique
        this.syncInterval = setInterval(async () => {
            await this.syncPendingItems();
        }, this.SYNC_INTERVAL_MS);
    }

    /**
     * Arrête la synchronisation automatique
     */
    stopAutoSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('[Sync] Synchronisation automatique arrêtée');
        }
    }

    /**
     * Synchronise les éléments en attente
     */
    async syncPendingItems(): Promise<{ success: number; failed: number }> {
        if (this.isSyncing) {
            console.log('[Sync] Synchronisation déjà en cours...');
            return { success: 0, failed: 0 };
        }

        this.isSyncing = true;
        let successCount = 0;
        let failedCount = 0;

        try {
            const pendingItems = await databaseService.getPendingSyncItems(50);
            
            if (pendingItems.length === 0) {
                // console.log('[Sync] Aucun élément à synchroniser');
                return { success: 0, failed: 0 };
            }

            console.log(`[Sync] ${pendingItems.length} élément(s) à synchroniser`);

            for (const item of pendingItems) {
                try {
                    // ✅ VALIDATION : Ignorer les items corrompus (tableName undefined)
                    if (!item.tableName || String(item.tableName) === 'undefined') {
                        console.warn(`[Sync] ⚠️ Item corrompu détecté (tableName=${item.tableName}), suppression...`);
                        await databaseService.removeSyncQueueItem(item.id);
                        continue;
                    }
                    
                    console.log(`[Sync] Tentative sync: ${item.tableName}/${item.recordId} (${item.operation})`);
                    await this.syncItem(item);
                    await databaseService.removeSyncQueueItem(item.id);
                    successCount++;
                } catch (error: any) {
                    failedCount++;
                    const newRetryCount = item.retryCount + 1;
                    const backoffDelay = this.getBackoffDelay(item.retryCount);
                    
                    // ✅ LOG DÉTAILLÉ DE L'ERREUR
                    console.error(`[Sync] ❌ ÉCHEC ${item.tableName}/${item.recordId}:`);
                    console.error(`[Sync]    → Erreur: ${error.message}`);
                    console.error(`[Sync]    → Tentative: #${newRetryCount}`);
                    console.error(`[Sync]    → Prochain retry dans: ${(backoffDelay / 1000).toFixed(1)}s`);
                    if (error.stack) {
                        console.error(`[Sync]    → Stack:`, error.stack);
                    }
                    
                    // 🔄 RETRY INDÉFINI: Toujours garder l'item, juste incrémenter retry_count
                    // avec backoff exponentiel
                    await databaseService.updateSyncQueueItem(
                        item.id,
                        newRetryCount,
                        `${error.message} (${new Date().toISOString()})`
                    );
                }
            }

            if (successCount > 0) {
                console.log(`[Sync] ✓ ${successCount} élément(s) synchronisé(s)`);
            }
            if (failedCount > 0) {
                console.log(`[Sync] ✗ ${failedCount} élément(s) échoué(s)`);
            }
        } catch (error) {
            console.error('[Sync] Erreur lors de la synchronisation:', error);
        } finally {
            this.isSyncing = false;
        }

        return { success: successCount, failed: failedCount };
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
