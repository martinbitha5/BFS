"use strict";
/**
 * Routes API BagJourney de SITA
 * Intégration du suivi des bagages SITA dans le système BFS
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const airport_restriction_middleware_1 = require("../middleware/airport-restriction.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const bagjourney_service_1 = require("../services/bagjourney.service");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/bagjourney/status/:tagNumber
 * Récupère le statut d'un bagage depuis BagJourney
 * @param tagNumber - Numéro de tag RFID du bagage
 * @param flightDate - Date du vol (optionnel, format YYYY-MM-DD)
 */
router.get('/status/:tagNumber', auth_middleware_1.apiKeyAuth, airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const { tagNumber } = req.params;
        const { flightDate } = req.query;
        const bagJourneyService = (0, bagjourney_service_1.getBagJourneyService)();
        if (!bagJourneyService) {
            return res.status(503).json({
                success: false,
                error: 'BagJourney service is not configured',
            });
        }
        const response = await bagJourneyService.getBagHistory({
            tagNumber,
            flightDate: flightDate,
        });
        if (response.success) {
            res.json({
                success: true,
                data: response.data,
                timestamp: response.timestamp,
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: response.error,
                timestamp: response.timestamp,
            });
        }
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/bagjourney/flight/:flightNumber/:flightDate
 * Récupère la liste des bagages pour un vol spécifique
 * @param flightNumber - Numéro de vol
 * @param flightDate - Date du vol (format YYYY-MM-DD)
 * @param airportCode - Code aéroport (optionnel)
 */
router.get('/flight/:flightNumber/:flightDate', auth_middleware_1.apiKeyAuth, airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const { flightNumber, flightDate } = req.params;
        const { airport } = req.query;
        const bagJourneyService = (0, bagjourney_service_1.getBagJourneyService)();
        if (!bagJourneyService) {
            return res.status(503).json({
                success: false,
                error: 'BagJourney service is not configured',
            });
        }
        const response = await bagJourneyService.getBagsForFlight({
            flightNumber,
            flightDate,
            airportCode: airport,
        });
        if (response.success) {
            res.json({
                success: true,
                data: response.data,
                timestamp: response.timestamp,
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: response.error,
                timestamp: response.timestamp,
            });
        }
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/bagjourney/passenger/:passengerName
 * Récupère les bagages par nom de passager
 * @param passengerName - Nom du passager
 * @param flightNumber - Numéro de vol (optionnel)
 * @param flightDate - Date du vol (optionnel, format YYYY-MM-DD)
 */
router.get('/passenger/:passengerName', auth_middleware_1.apiKeyAuth, airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const { passengerName } = req.params;
        const { flightNumber, flightDate } = req.query;
        const bagJourneyService = (0, bagjourney_service_1.getBagJourneyService)();
        if (!bagJourneyService) {
            return res.status(503).json({
                success: false,
                error: 'BagJourney service is not configured',
            });
        }
        const response = await bagJourneyService.getBagsByPassenger({
            passengerName,
            flightNumber: flightNumber,
            flightDate: flightDate,
        });
        if (response.success) {
            res.json({
                success: true,
                data: response.data,
                timestamp: response.timestamp,
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: response.error,
                timestamp: response.timestamp,
            });
        }
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/bagjourney/sync
 * Synchronise les données BagJourney avec le système local
 * @body { tagNumbers: string[], options: BagJourneySyncOptions }
 */
router.post('/sync', auth_middleware_1.apiKeyAuth, airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const { tagNumbers, options } = req.body;
        if (!Array.isArray(tagNumbers) || tagNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'tagNumbers must be a non-empty array',
            });
        }
        const bagJourneyService = (0, bagjourney_service_1.getBagJourneyService)();
        if (!bagJourneyService) {
            return res.status(503).json({
                success: false,
                error: 'BagJourney service is not configured',
            });
        }
        const syncOptions = {
            enableRealTimeSync: options?.enableRealTimeSync ?? true,
            syncInterval: options?.syncInterval ?? 5, // minutes
            batchSize: options?.batchSize ?? 10,
            retryAttempts: options?.retryAttempts ?? 3,
        };
        const response = await bagJourneyService.syncBaggageData(tagNumbers, syncOptions);
        if (response.success) {
            res.json({
                success: true,
                data: response.data,
                timestamp: response.timestamp,
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: response.error,
                timestamp: response.timestamp,
            });
        }
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/bagjourney/config
 * Récupère la configuration BagJourney (sans la clé API)
 */
router.get('/config', auth_middleware_1.apiKeyAuth, airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const bagJourneyService = (0, bagjourney_service_1.getBagJourneyService)();
        if (!bagJourneyService) {
            return res.status(503).json({
                success: false,
                error: 'BagJourney service is not configured',
            });
        }
        const config = bagJourneyService.getConfig();
        const isEnabled = bagJourneyService.isServiceEnabled();
        res.json({
            success: true,
            data: {
                isEnabled,
                config,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/bagjourney/health
 * Vérifie la disponibilité du service BagJourney
 */
router.get('/health', auth_middleware_1.apiKeyAuth, airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const bagJourneyService = (0, bagjourney_service_1.getBagJourneyService)();
        if (!bagJourneyService) {
            return res.status(503).json({
                success: false,
                error: 'BagJourney service is not configured',
            });
        }
        const isEnabled = bagJourneyService.isServiceEnabled();
        res.json({
            success: isEnabled,
            data: {
                service: 'bagjourney',
                status: isEnabled ? 'enabled' : 'disabled',
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
