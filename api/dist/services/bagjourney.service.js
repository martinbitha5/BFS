"use strict";
/**
 * Service BagJourney pour l'intégration SITA
 * Gère la communication avec l'API BagJourney de SITA
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeBagJourneyService = initializeBagJourneyService;
exports.getBagJourneyService = getBagJourneyService;
const axios_1 = __importDefault(require("axios"));
class BagJourneyService {
    constructor(config) {
        this.isEnabled = false;
        this.config = config || {
            apiKey: process.env.BAGJOURNEY_API_KEY || '',
            baseUrl: process.env.BAGJOURNEY_BASE_URL || 'https://api.developer.aero',
            timeout: parseInt(process.env.BAGJOURNEY_TIMEOUT || '30000')
        };
        this.isEnabled = this.config.apiKey !== '';
        this.axiosInstance = axios_1.default.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }
    /**
     * Récupère le statut d'un bagage par numéro de tag
     */
    async getBagStatus(tagNumber, flightDate) {
        try {
            const params = { tagNumber, flightDate };
            // Simulation de la réponse pour le moment
            // TODO: Implémenter l'appel réel à l'API SITA
            const mockResponse = {
                tagNumber,
                flightDate: flightDate || new Date().toISOString().split('T')[0],
                events: [
                    {
                        code: 'CHECKED_IN',
                        description: 'Bagage enregistré',
                        timestamp: new Date().toISOString(),
                        location: 'Comptoir d\'enregistrement',
                        airportCode: 'CDG'
                    }
                ],
                currentStatus: {
                    code: 'CHECKED_IN',
                    description: 'Bagage enregistré',
                    location: 'CDG',
                    timestamp: new Date().toISOString()
                },
                lastUpdate: new Date().toISOString()
            };
            return {
                success: true,
                data: mockResponse,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur inconnue',
                timestamp: new Date().toISOString()
            };
        }
    }
    /**
     * Récupère les bagages pour un vol spécifique
     */
    async getFlightBags(flightNumber, flightDate) {
        try {
            const params = { flightNumber, flightDate };
            // Simulation de la réponse pour le moment
            // TODO: Implémenter l'appel réel à l'API SITA
            const mockResponse = {
                flightNumber,
                flightDate,
                bags: [],
                totalBags: 0,
                delayedBags: 0,
                rushBags: 0
            };
            return {
                success: true,
                data: mockResponse,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur inconnue',
                timestamp: new Date().toISOString()
            };
        }
    }
    /**
     * Vérifie si le service BagJourney est configuré et disponible
     */
    isConfigured() {
        return !!(this.config.apiKey && this.config.baseUrl);
    }
    /**
     * Vérifie si le service est activé
     */
    isServiceEnabled() {
        return this.isEnabled;
    }
    /**
     * Récupère la configuration actuelle (sans la clé API)
     */
    getConfig() {
        return {
            baseUrl: this.config.baseUrl,
            timeout: this.config.timeout
        };
    }
    /**
     * Récupère l'historique d'un bagage (alias de getBagStatus)
     */
    async getBagHistory(request) {
        return this.getBagStatus(request.tagNumber, request.flightDate);
    }
    /**
     * Récupère les bagages pour un vol (alias de getFlightBags)
     */
    async getBagsForFlight(request) {
        return this.getFlightBags(request.flightNumber, request.flightDate);
    }
    /**
     * Récupère les bagages par nom de passager
     */
    async getBagsByPassenger(request) {
        try {
            // TODO: Implémenter l'appel réel à l'API SITA
            const mockResponse = {
                flightNumber: request.flightNumber || 'UNKNOWN',
                flightDate: request.flightDate || new Date().toISOString().split('T')[0],
                bags: [],
                totalBags: 0,
                delayedBags: 0,
                rushBags: 0
            };
            return {
                success: true,
                data: mockResponse,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur inconnue',
                timestamp: new Date().toISOString()
            };
        }
    }
    /**
     * Synchronise les données de bagages avec BagJourney
     */
    async syncBaggageData(tagNumbers, options) {
        try {
            const results = [];
            // Simuler la synchronisation pour chaque tag
            for (const tagNumber of tagNumbers) {
                const bagStatus = await this.getBagStatus(tagNumber);
                if (bagStatus.success && bagStatus.data) {
                    results.push({
                        tagNumber,
                        status: 'synced',
                        data: bagStatus.data
                    });
                }
                else {
                    results.push({
                        tagNumber,
                        status: 'failed',
                        error: bagStatus.error
                    });
                }
            }
            return {
                success: true,
                data: {
                    synced: results.filter(r => r.status === 'synced').length,
                    failed: results.filter(r => r.status === 'failed').length,
                    results
                },
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur de synchronisation',
                timestamp: new Date().toISOString()
            };
        }
    }
}
// Export d'une instance singleton
let bagJourneyServiceInstance = null;
/**
 * Initialise le service BagJourney avec une configuration personnalisée
 */
function initializeBagJourneyService(config) {
    bagJourneyServiceInstance = new BagJourneyService(config);
    return bagJourneyServiceInstance;
}
/**
 * Récupère l'instance du service BagJourney
 */
function getBagJourneyService() {
    if (!bagJourneyServiceInstance) {
        bagJourneyServiceInstance = new BagJourneyService();
    }
    return bagJourneyServiceInstance;
}
exports.default = BagJourneyService;
