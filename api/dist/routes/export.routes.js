"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const parser_service_1 = require("../services/parser.service");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/export/raw-scans?airport=XXX&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 * Exporter les scans bruts avec parsing
 */
router.get('/raw-scans', async (req, res) => {
    try {
        const { airport, start_date, end_date, status } = req.query;
        if (!airport) {
            return res.status(400).json({ error: 'Le code aéroport est requis' });
        }
        // Récupérer les scans bruts
        let query = database_1.supabase
            .from('raw_scans')
            .select('*')
            .eq('airport_code', airport)
            .order('last_scanned_at', { ascending: false });
        if (start_date) {
            query = query.gte('first_scanned_at', start_date);
        }
        if (end_date) {
            query = query.lte('first_scanned_at', end_date);
        }
        if (status) {
            const statusField = `status_${status}`;
            query = query.eq(statusField, true);
        }
        const { data: rawScans, error } = await query;
        if (error) {
            console.error('Error fetching raw scans:', error);
            return res.status(500).json({ error: 'Erreur lors de la récupération des scans' });
        }
        // Parser chaque scan
        const parsedScans = (rawScans || []).map((scan) => {
            let parsed = null;
            let parsingError = undefined;
            try {
                // Tenter de parser les données brutes
                const parsedData = parser_service_1.parserService.parse(scan.raw_data);
                parsed = {
                    pnr: parsedData.pnr,
                    fullName: parsedData.fullName,
                    flightNumber: parsedData.flightNumber,
                    departure: parsedData.departure,
                    arrival: parsedData.arrival,
                    route: parsedData.route,
                    seatNumber: parsedData.seatNumber,
                    ticketNumber: parsedData.ticketNumber,
                    airline: parsedData.airline,
                    companyCode: parsedData.companyCode,
                    format: parsedData.format,
                };
            }
            catch (err) {
                parsingError = err.message || 'Erreur de parsing';
            }
            return {
                id: scan.id,
                rawData: scan.raw_data,
                scanType: scan.scan_type,
                statusCheckin: scan.status_checkin,
                statusBaggage: scan.status_baggage,
                statusBoarding: scan.status_boarding,
                statusArrival: scan.status_arrival,
                airportCode: scan.airport_code,
                firstScannedAt: scan.first_scanned_at,
                lastScannedAt: scan.last_scanned_at,
                scanCount: scan.scan_count,
                parsed,
                parsingError,
            };
        });
        // Statistiques
        const stats = {
            total: parsedScans.length,
            parsed_successfully: parsedScans.filter(s => s.parsed !== null).length,
            parsing_failed: parsedScans.filter(s => s.parsed === null).length,
            by_type: {
                boarding_pass: parsedScans.filter(s => s.scanType === 'boarding_pass').length,
                baggage_tag: parsedScans.filter(s => s.scanType === 'baggage_tag').length,
            },
            by_status: {
                checkin: parsedScans.filter(s => s.statusCheckin).length,
                baggage: parsedScans.filter(s => s.statusBaggage).length,
                boarding: parsedScans.filter(s => s.statusBoarding).length,
                arrival: parsedScans.filter(s => s.statusArrival).length,
            },
        };
        res.json({
            success: true,
            data: parsedScans,
            stats,
        });
    }
    catch (err) {
        console.error('Error in GET /export/raw-scans:', err);
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
});
exports.default = router;
