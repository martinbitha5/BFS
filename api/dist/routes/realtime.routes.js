"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyStatsUpdate = notifyStatsUpdate;
exports.notifyNewPassenger = notifyNewPassenger;
exports.notifyNewBaggage = notifyNewBaggage;
exports.notifyRawScan = notifyRawScan;
exports.notifyBoardingUpdate = notifyBoardingUpdate;
exports.notifySyncComplete = notifySyncComplete;
const express_1 = require("express");
const database_1 = require("../config/database");
const airport_restriction_middleware_1 = require("../middleware/airport-restriction.middleware");
const realtime_service_1 = require("../services/realtime.service");
const router = (0, express_1.Router)();
// Génère un ID unique simple sans dépendance externe
function generateClientId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
/**
 * GET /api/v1/realtime/subscribe/:airport
 * SSE endpoint pour recevoir les mises à jour en temps réel
 * Note: L'authentification est faite via query params car EventSource ne supporte pas les headers
 */
router.get('/subscribe/:airport', (req, res) => {
    const { airport } = req.params;
    const { token, api_key } = req.query;
    const clientId = generateClientId();
    // Authentification simplifiée pour SSE (via query params)
    // En production, vous pouvez ajouter une vérification JWT ici
    if (!token && !api_key) {
        console.warn(`SSE: Connexion sans authentification pour ${airport}`);
        // Continuer quand même - l'authentification peut être optionnelle
    }
    // Configuration des headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Pour nginx
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();
    // Envoyer un événement de connexion initial
    const initData = {
        clientId,
        airportCode: airport.toUpperCase(),
        connectedAt: new Date().toISOString(),
        message: 'Connexion SSE établie - Mises à jour en temps réel activées',
    };
    res.write(`event: connected\ndata: ${JSON.stringify(initData)}\n\n`);
    // Enregistrer le client
    realtime_service_1.realtimeService.addClient(clientId, res, airport);
    // Envoyer les stats initiales immédiatement
    fetchAndSendStats(airport.toUpperCase(), res);
    // Gérer la déconnexion
    req.on('close', () => {
        realtime_service_1.realtimeService.removeClient(clientId);
    });
});
/**
 * GET /api/v1/realtime/stats
 * Retourne les stats du service SSE
 */
router.get('/stats', (req, res) => {
    res.json({
        success: true,
        data: realtime_service_1.realtimeService.getStats(),
    });
});
/**
 * POST /api/v1/realtime/trigger/:airport
 * Déclenche une mise à jour manuelle pour un aéroport
 * (utile pour le bouton "Actualiser" du dashboard)
 */
router.post('/trigger/:airport', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const { airport } = req.params;
        const airportCode = airport.toUpperCase();
        // Récupérer les stats
        const statsData = await getAirportStats(airportCode);
        // Broadcaster à tous les clients
        realtime_service_1.realtimeService.broadcast(airportCode, realtime_service_1.SSE_EVENTS.STATS_UPDATE, statsData);
        res.json({
            success: true,
            message: `Mise à jour diffusée à ${realtime_service_1.realtimeService.getClientCount()} client(s)`,
            data: statsData,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Fonction helper pour récupérer et envoyer les stats
 */
async function fetchAndSendStats(airportCode, res) {
    try {
        const statsData = await getAirportStats(airportCode);
        res.write(`event: ${realtime_service_1.SSE_EVENTS.STATS_UPDATE}\ndata: ${JSON.stringify(statsData)}\n\n`);
    }
    catch (error) {
        console.error('Erreur lors de la récupération des stats:', error);
    }
}
/**
 * Fonction pour récupérer les statistiques d'un aéroport
 */
async function getAirportStats(airportCode) {
    const today = new Date().toISOString().split('T')[0];
    const filterAirport = airportCode !== 'ALL';
    // Requêtes parallèles pour optimiser les performances
    const [passengersResult, baggagesResult, boardingResult, rawScansResult, flightsResult] = await Promise.all([
        // Passagers
        filterAirport
            ? database_1.supabase.from('passengers').select('*').eq('airport_code', airportCode)
            : database_1.supabase.from('passengers').select('*'),
        // Bagages
        filterAirport
            ? database_1.supabase.from('baggages').select('*').eq('airport_code', airportCode)
            : database_1.supabase.from('baggages').select('*'),
        // Boarding statuses
        filterAirport
            ? database_1.supabase.from('boarding_status').select('*, passengers!inner(airport_code)').eq('passengers.airport_code', airportCode)
            : database_1.supabase.from('boarding_status').select('*'),
        // Raw scans stats
        filterAirport
            ? database_1.supabase.from('raw_scans').select('scan_type, status_checkin, status_baggage, status_boarding, status_arrival').eq('airport_code', airportCode)
            : database_1.supabase.from('raw_scans').select('scan_type, status_checkin, status_baggage, status_boarding, status_arrival'),
        // Vols du jour
        filterAirport
            ? database_1.supabase.from('flight_schedule').select('*').eq('scheduled_date', today).eq('airport_code', airportCode)
            : database_1.supabase.from('flight_schedule').select('*').eq('scheduled_date', today),
    ]);
    const passengers = passengersResult.data || [];
    const baggages = baggagesResult.data || [];
    const boardingStatuses = boardingResult.data || [];
    const rawScans = rawScansResult.data || [];
    const flights = flightsResult.data || [];
    // Calculer les statistiques
    const totalPassengers = passengers.length;
    const totalBaggages = baggages.length;
    const boardedPassengers = boardingStatuses.filter(bs => bs.boarded).length;
    const arrivedBaggages = baggages.filter(b => b.status === 'arrived').length;
    const todayPassengers = passengers.filter(p => p.checked_in_at?.startsWith(today)).length;
    const todayBaggages = baggages.filter(b => b.created_at?.startsWith(today)).length;
    const uniqueFlights = [...new Set(passengers.map(p => p.flight_number).filter(Boolean))];
    // Raw scans stats
    const rawScansStats = {
        total: rawScans.length,
        by_type: {
            boarding_pass: rawScans.filter(s => s.scan_type === 'boarding_pass').length,
            baggage_tag: rawScans.filter(s => s.scan_type === 'baggage_tag').length,
        },
        by_status: {
            checkin: rawScans.filter(s => s.status_checkin).length,
            baggage: rawScans.filter(s => s.status_baggage).length,
            boarding: rawScans.filter(s => s.status_boarding).length,
            arrival: rawScans.filter(s => s.status_arrival).length,
        },
    };
    return {
        airportCode,
        stats: {
            totalPassengers,
            totalBaggages,
            boardedPassengers,
            notBoardedPassengers: totalPassengers - boardedPassengers,
            arrivedBaggages,
            inTransitBaggages: totalBaggages - arrivedBaggages,
            todayPassengers,
            todayBaggages,
            flightsCount: uniqueFlights.length,
            uniqueFlights,
        },
        rawScansStats,
        flightsCount: flights.length,
        timestamp: new Date().toISOString(),
    };
}
/**
 * Export de la fonction pour être utilisée par d'autres routes
 * (ex: lors de l'ajout d'un passager, bagage, etc.)
 */
async function notifyStatsUpdate(airportCode) {
    try {
        const statsData = await getAirportStats(airportCode);
        realtime_service_1.realtimeService.broadcast(airportCode, realtime_service_1.SSE_EVENTS.STATS_UPDATE, statsData);
    }
    catch (error) {
        console.error('Erreur lors de la notification SSE:', error);
    }
}
/**
 * Notifier d'un nouveau passager
 */
function notifyNewPassenger(airportCode, passenger) {
    realtime_service_1.realtimeService.broadcast(airportCode, realtime_service_1.SSE_EVENTS.NEW_PASSENGER, {
        passenger,
        timestamp: new Date().toISOString(),
    });
}
/**
 * Notifier d'un nouveau bagage
 */
function notifyNewBaggage(airportCode, baggage) {
    realtime_service_1.realtimeService.broadcast(airportCode, realtime_service_1.SSE_EVENTS.NEW_BAGGAGE, {
        baggage,
        timestamp: new Date().toISOString(),
    });
}
/**
 * Notifier d'un scan brut
 */
function notifyRawScan(airportCode, scan) {
    realtime_service_1.realtimeService.broadcast(airportCode, realtime_service_1.SSE_EVENTS.RAW_SCAN, {
        scan,
        timestamp: new Date().toISOString(),
    });
}
/**
 * Notifier d'une mise à jour d'embarquement
 */
function notifyBoardingUpdate(airportCode, update) {
    realtime_service_1.realtimeService.broadcast(airportCode, realtime_service_1.SSE_EVENTS.BOARDING_UPDATE, {
        ...update,
        timestamp: new Date().toISOString(),
    });
}
/**
 * Notifier de la fin d'une synchronisation
 */
function notifySyncComplete(airportCode, syncStats) {
    realtime_service_1.realtimeService.broadcast(airportCode, realtime_service_1.SSE_EVENTS.SYNC_COMPLETE, {
        syncStats,
        timestamp: new Date().toISOString(),
    });
}
exports.default = router;
