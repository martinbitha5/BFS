"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const airport_restriction_middleware_1 = require("../middleware/airport-restriction.middleware");
const auto_sync_service_1 = require("../services/auto-sync.service");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/passengers
 * Récupérer tous les passagers avec filtres optionnels
 * RESTRICTION: Filtre automatiquement par aéroport de l'utilisateur
 */
router.get('/', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const { flight, pnr } = req.query;
        const airportCode = req.userAirportCode; // Peut être undefined si accès total
        // Auto-sync si la table est vide mais que des raw_scans existent
        if (airportCode) {
            await (0, auto_sync_service_1.autoSyncIfNeeded)(airportCode);
        }
        let query = database_1.supabase
            .from('passengers')
            .select('*, baggages(*), boarding_status(*)');
        // Filtrer par aéroport uniquement si l'utilisateur n'a pas accès total
        if (airportCode) {
            query = query.eq('airport_code', airportCode);
        }
        if (flight) {
            query = query.eq('flight_number', flight);
        }
        if (pnr) {
            query = query.eq('pnr', pnr.toString().toUpperCase());
        }
        const { data, error } = await query;
        if (error)
            throw error;
        // Transformer les données pour le dashboard (snake_case -> camelCase)
        const transformedData = data?.map(passenger => ({
            id: passenger.id,
            fullName: passenger.full_name,
            pnr: passenger.pnr,
            flightNumber: passenger.flight_number,
            departure: passenger.departure,
            arrival: passenger.arrival,
            seatNumber: passenger.seat_number,
            baggageCount: passenger.baggage_count || 0,
            checkedInAt: passenger.checked_in_at,
            airportCode: passenger.airport_code,
            baggages: passenger.baggages || [],
            boarding_status: passenger.boarding_status || []
        }));
        res.json({
            success: true,
            count: transformedData?.length || 0,
            data: transformedData || []
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/passengers/:id
 * Récupérer un passager spécifique
 * RESTRICTION: Vérifie que le passager appartient à l'aéroport de l'utilisateur
 */
router.get('/:id', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const { id } = req.params;
        const airportCode = req.userAirportCode; // Peut être undefined si accès total
        const hasFullAccess = req.hasFullAccess;
        let query = database_1.supabase
            .from('passengers')
            .select('*, baggages(*), boarding_status(*)')
            .eq('id', id);
        // Filtrer par aéroport uniquement si l'utilisateur n'a pas accès total
        if (airportCode && !hasFullAccess) {
            query = query.eq('airport_code', airportCode);
        }
        const { data, error } = await query.single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Passenger not found or access denied'
                });
            }
            throw error;
        }
        // Vérification de sécurité si l'utilisateur n'a pas accès total
        if (!hasFullAccess && airportCode && data && data.airport_code !== airportCode) {
            return res.status(403).json({
                success: false,
                error: 'Accès refusé : Ce passager n\'appartient pas à votre aéroport'
            });
        }
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/passengers/pnr/:pnr
 * Rechercher un passager par PNR
 */
router.get('/pnr/:pnr', async (req, res, next) => {
    try {
        const { pnr } = req.params;
        const { data, error } = await database_1.supabase
            .from('passengers')
            .select('*, baggages(*), boarding_status(*)')
            .eq('pnr', pnr)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Passenger not found with this PNR'
                });
            }
            throw error;
        }
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/passengers
 * Créer un nouveau passager (check-in)
 * RESTRICTION: Vérifie que le vol est programmé et que l'aéroport correspond
 */
router.post('/', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const passengerData = req.body;
        const airport = req.query.airport || passengerData.airport_code;
        if (!airport) {
            return res.status(400).json({
                success: false,
                error: 'Code aéroport requis'
            });
        }
        // VALIDATION: Vérifier que le vol est programmé
        if (passengerData.flight_number) {
            const { validateFlightForScan } = await Promise.resolve().then(() => __importStar(require('../middleware/scan-validation.middleware')));
            const validation = await validateFlightForScan(passengerData.flight_number, airport);
            if (!validation.valid) {
                return res.status(403).json({
                    success: false,
                    error: validation.reason || 'Vol non programmé',
                    rejected: true,
                    flightNumber: passengerData.flight_number
                });
            }
        }
        // FORCER l'aéroport dans les données
        passengerData.airport_code = airport;
        const { data, error } = await database_1.supabase
            .from('passengers')
            .insert(passengerData)
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({
            success: true,
            data
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PUT /api/v1/passengers/:id
 * Mettre à jour un passager
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { data, error } = await database_1.supabase
            .from('passengers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/passengers/sync
 * Synchronisation batch de passagers
 */
router.post('/sync', async (req, res, next) => {
    try {
        const { passengers } = req.body;
        if (!Array.isArray(passengers)) {
            return res.status(400).json({
                success: false,
                error: 'passengers must be an array'
            });
        }
        const { data, error } = await database_1.supabase
            .from('passengers')
            .upsert(passengers, { onConflict: 'id' })
            .select();
        if (error)
            throw error;
        res.json({
            success: true,
            count: data?.length || 0,
            data
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
