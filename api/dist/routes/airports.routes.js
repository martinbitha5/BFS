"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
// Liste des aéroports supportés par le système
const SUPPORTED_AIRPORTS = [
    // Aéroports RDC
    { code: 'FIH', name: 'Kinshasa', iataCode: 'FIH', country: 'RDC' },
    { code: 'FKI', name: 'Kisangani', iataCode: 'FKI', country: 'RDC' },
    { code: 'GOM', name: 'Goma', iataCode: 'GOM', country: 'RDC' },
    { code: 'FBM', name: 'Lubumbashi', iataCode: 'FBM', country: 'RDC' },
    { code: 'KWZ', name: 'Kolwezi', iataCode: 'KWZ', country: 'RDC' },
    { code: 'KGA', name: 'Kananga', iataCode: 'KGA', country: 'RDC' },
    { code: 'MJM', name: 'Mbuji-Mayi', iataCode: 'MJM', country: 'RDC' },
    { code: 'GMA', name: 'Gemena', iataCode: 'GMA', country: 'RDC' },
    { code: 'MDK', name: 'Mbandaka', iataCode: 'MDK', country: 'RDC' },
    { code: 'KND', name: 'Kindu', iataCode: 'KND', country: 'RDC' },
    // Destinations internationales
    { code: 'LFW', name: 'Lomé', iataCode: 'LFW', country: 'Togo' },
    { code: 'ABJ', name: 'Abidjan', iataCode: 'ABJ', country: 'Côte d\'Ivoire' },
    { code: 'NBO', name: 'Nairobi', iataCode: 'NBO', country: 'Kenya' },
    { code: 'EBB', name: 'Entebbe', iataCode: 'EBB', country: 'Ouganda' },
    { code: 'CMN', name: 'Casablanca', iataCode: 'CMN', country: 'Maroc' },
    { code: 'IST', name: 'Istanbul', iataCode: 'IST', country: 'Turquie' },
    { code: 'ADD', name: 'Addis Abeba', iataCode: 'ADD', country: 'Éthiopie' },
];
// GET /api/v1/airports - Liste de tous les aéroports supportés
router.get('/', async (req, res, next) => {
    try {
        res.json({
            success: true,
            count: SUPPORTED_AIRPORTS.length,
            data: SUPPORTED_AIRPORTS
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/v1/airports/active - Aéroports avec des données actives
router.get('/active', async (req, res, next) => {
    try {
        // Récupérer les aéroports qui ont des passagers enregistrés
        const { data: passengers, error } = await database_1.supabase
            .from('passengers')
            .select('airport_code')
            .not('airport_code', 'is', null);
        if (error)
            throw error;
        // Extraire les codes d'aéroport uniques
        const activeAirportCodes = [...new Set(passengers?.map(p => p.airport_code) || [])];
        // Filtrer les aéroports supportés pour ne retourner que ceux actifs
        const activeAirports = SUPPORTED_AIRPORTS.filter(airport => activeAirportCodes.includes(airport.code));
        res.json({
            success: true,
            count: activeAirports.length,
            data: activeAirports
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/v1/airports/:code - Détails d'un aéroport
router.get('/:code', async (req, res, next) => {
    try {
        const { code } = req.params;
        const airport = SUPPORTED_AIRPORTS.find(a => a.code === code);
        if (!airport) {
            return res.status(404).json({
                success: false,
                error: 'Aéroport non trouvé'
            });
        }
        res.json({
            success: true,
            data: airport
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
