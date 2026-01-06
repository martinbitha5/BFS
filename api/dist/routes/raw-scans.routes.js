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
const realtime_routes_1 = require("./realtime.routes");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/raw-scans?airport=XXX&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&status=checkin
 * Récupérer les scans bruts avec filtres
 * RESTRICTION: Nécessite le code aéroport et filtre automatiquement par aéroport
 */
router.get('/', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const { airport, start_date, end_date, status, scan_type } = req.query;
        // Le middleware requireAirportCode garantit que airport existe
        if (!airport) {
            return res.status(400).json({ error: 'Le code aéroport est requis' });
        }
        let query = database_1.supabase
            .from('raw_scans')
            .select('*')
            .eq('airport_code', airport)
            .order('last_scanned_at', { ascending: false });
        // Filtre par dates
        if (start_date) {
            query = query.gte('first_scanned_at', start_date);
        }
        if (end_date) {
            query = query.lte('first_scanned_at', end_date);
        }
        // Filtre par statut
        if (status) {
            const statusField = `status_${status}`;
            query = query.eq(statusField, true);
        }
        // Filtre par type de scan
        if (scan_type) {
            query = query.eq('scan_type', scan_type);
        }
        const { data, error, count } = await query;
        if (error) {
            console.error('Error fetching raw scans:', error);
            return res.status(500).json({ error: 'Erreur lors de la récupération des scans' });
        }
        res.json({
            success: true,
            data: data || [],
            count: count || data?.length || 0,
        });
    }
    catch (err) {
        console.error('Error in GET /raw-scans:', err);
        next(err);
    }
});
/**
 * GET /api/v1/raw-scans/stats?airport=XXX
 * Statistiques des scans bruts
 */
router.get('/stats', async (req, res, next) => {
    try {
        const { airport } = req.query;
        if (!airport) {
            return res.status(400).json({ error: 'Le code aéroport est requis' });
        }
        // Requête pour compter les statuts
        const { data, error } = await database_1.supabase
            .from('raw_scans')
            .select('*')
            .eq('airport_code', airport);
        if (error) {
            console.error('Error fetching stats:', error);
            return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
        }
        const stats = {
            total: data?.length || 0,
            by_type: {
                boarding_pass: data?.filter(s => s.scan_type === 'boarding_pass').length || 0,
                baggage_tag: data?.filter(s => s.scan_type === 'baggage_tag').length || 0,
            },
            by_status: {
                checkin: data?.filter(s => s.status_checkin).length || 0,
                baggage: data?.filter(s => s.status_baggage).length || 0,
                boarding: data?.filter(s => s.status_boarding).length || 0,
                arrival: data?.filter(s => s.status_arrival).length || 0,
            },
        };
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (err) {
        console.error('Error in GET /raw-scans/stats:', err);
        next(err);
    }
});
/**
 * POST /api/v1/raw-scans (sync depuis l'app mobile)
 * Créer ou mettre à jour un scan brut
 * VALIDATION: Vérifie que le vol est programmé avant d'accepter le scan
 */
router.post('/', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const { raw_data, scan_type, status_checkin, status_baggage, status_boarding, status_arrival, airport_code, ...restData } = req.body;
        if (!raw_data || !scan_type || !airport_code) {
            return res.status(400).json({
                error: 'Données manquantes (raw_data, scan_type, airport_code requis)',
            });
        }
        // VALIDATION: Si c'est un boarding pass (check-in), valider le vol
        if (scan_type === 'boarding_pass' && status_checkin) {
            const { validateFlightForScan } = await Promise.resolve().then(() => __importStar(require('../middleware/scan-validation.middleware')));
            // Extraire le numéro de vol du boarding pass
            const flightMatch = raw_data.match(/\b([A-Z]{2,3}\d{2,4})\b/);
            if (flightMatch) {
                const flightNumber = flightMatch[1];
                const validation = await validateFlightForScan(flightNumber, airport_code);
                if (!validation.valid) {
                    return res.status(403).json({
                        success: false,
                        error: validation.reason || 'Vol non programmé',
                        rejected: true,
                        flightNumber,
                        message: `Le scan a été refusé car le vol ${flightNumber} n'est pas programmé à l'aéroport ${airport_code}`
                    });
                }
            }
        }
        // Vérifier si le scan existe déjà  
        const { data: existing, error: existingError } = await database_1.supabase
            .from('raw_scans')
            .select('id, scan_count, status_checkin, status_baggage, status_boarding, status_arrival')
            .eq('raw_data', raw_data)
            .single();
        // Ignorer l'erreur PGRST116 (no rows returned) - c'est normal si le scan n'existe pas
        if (existingError && existingError.code !== 'PGRST116') {
            console.error('Error checking existing scan:', existingError);
            return res.status(500).json({ error: 'Erreur lors de la vérification du scan' });
        }
        if (existing) {
            // Mise à jour
            const { data, error } = await database_1.supabase
                .from('raw_scans')
                .update({
                ...restData,
                status_checkin: status_checkin || existing.status_checkin,
                status_baggage: status_baggage || existing.status_baggage,
                status_boarding: status_boarding || existing.status_boarding,
                status_arrival: status_arrival || existing.status_arrival,
                scan_count: existing.scan_count + 1,
                last_scanned_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) {
                console.error('Error updating raw scan:', error);
                return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
            }
            // ✅ TEMPS RÉEL: Notifier les clients SSE
            (0, realtime_routes_1.notifyRawScan)(airport_code, data);
            (0, realtime_routes_1.notifyStatsUpdate)(airport_code);
            return res.json({
                success: true,
                data,
                is_new: false,
            });
        }
        // Création - Filtrer les colonnes valides pour PostgreSQL
        const insertData = {
            raw_data,
            scan_type,
            status_checkin: status_checkin || false,
            status_baggage: status_baggage || false,
            status_boarding: status_boarding || false,
            status_arrival: status_arrival || false,
            airport_code,
            first_scanned_at: new Date().toISOString(),
            last_scanned_at: new Date().toISOString(),
            scan_count: 1,
        };
        // Ajouter les colonnes optionnelles si elles sont présentes et valides
        // Note: Les colonnes *_by sont des UUID qui référencent users(id)
        // On ne les inclut que si elles sont des UUID valides
        if (restData.checkin_at)
            insertData.checkin_at = restData.checkin_at;
        if (restData.baggage_at)
            insertData.baggage_at = restData.baggage_at;
        if (restData.baggage_rfid_tag)
            insertData.baggage_rfid_tag = restData.baggage_rfid_tag;
        if (restData.boarding_at)
            insertData.boarding_at = restData.boarding_at;
        if (restData.arrival_at)
            insertData.arrival_at = restData.arrival_at;
        // Les colonnes *_by référencent users(id) - ne pas les inclure pour éviter les erreurs FK
        // L'API utilise le contexte auth pour identifier l'utilisateur
        const { data, error } = await database_1.supabase
            .from('raw_scans')
            .insert(insertData)
            .select()
            .single();
        if (error) {
            console.error('Error creating raw scan:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            console.error('Data sent:', JSON.stringify({
                raw_data,
                scan_type,
                status_checkin,
                status_baggage,
                status_boarding,
                status_arrival,
                airport_code,
                ...restData,
            }, null, 2));
            return res.status(500).json({
                error: 'Erreur lors de la création',
                details: error.message || error.code,
                hint: error.hint
            });
        }
        // ✅ TEMPS RÉEL: Notifier les clients SSE d'un nouveau scan
        (0, realtime_routes_1.notifyRawScan)(airport_code, data);
        (0, realtime_routes_1.notifyStatsUpdate)(airport_code);
        res.status(201).json({
            success: true,
            data,
            is_new: true,
        });
    }
    catch (err) {
        console.error('Error in POST /raw-scans:', err);
        next(err);
    }
});
exports.default = router;
