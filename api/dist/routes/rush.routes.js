"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
// GET /api/v1/rush/baggages - Liste des bagages RUSH
router.get('/baggages', async (req, res, next) => {
    try {
        const { airport, type } = req.query; // type: 'national' | 'international' | 'all'
        const rushBaggages = [];
        // Bagages nationaux en RUSH
        if (!type || type === 'national') {
            const { data: nationalBags, error: nationalError } = await database_1.supabase
                .from('baggages')
                .select(`
          *,
          passengers (
            full_name,
            pnr,
            flight_number,
            departure,
            arrival
          )
        `)
                .eq('status', 'rush');
            if (nationalError)
                throw nationalError;
            if (nationalBags) {
                const filtered = airport
                    ? nationalBags.filter((b) => b.passengers?.departure === airport || b.passengers?.arrival === airport)
                    : nationalBags;
                rushBaggages.push(...filtered.map((b) => ({
                    ...b,
                    baggageType: 'national'
                })));
            }
        }
        // Bagages internationaux en RUSH
        if (!type || type === 'international') {
            let query = database_1.supabase
                .from('international_baggages')
                .select('*')
                .eq('status', 'rush');
            if (airport) {
                query = query.eq('airport_code', airport);
            }
            const { data: internationalBags, error: internationalError } = await query;
            if (internationalError)
                throw internationalError;
            if (internationalBags) {
                rushBaggages.push(...internationalBags.map(b => ({
                    ...b,
                    baggageType: 'international'
                })));
            }
        }
        res.json({
            success: true,
            count: rushBaggages.length,
            data: rushBaggages
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/v1/rush/declare - Déclarer un bagage en RUSH
router.post('/declare', async (req, res, next) => {
    try {
        const { baggageId, baggageType, reason, nextFlightNumber, remarks, userId } = req.body;
        if (!baggageId || !baggageType || !reason) {
            return res.status(400).json({
                success: false,
                error: 'baggageId, baggageType et reason sont requis'
            });
        }
        if (baggageType === 'national') {
            // Mettre à jour le bagage national
            const { error } = await database_1.supabase
                .from('baggages')
                .update({ status: 'rush', updated_at: new Date().toISOString() })
                .eq('id', baggageId);
            if (error)
                throw error;
        }
        else if (baggageType === 'international') {
            // Mettre à jour le bagage international
            const remarkText = `RUSH: ${reason}${nextFlightNumber ? ` - Vol suivant: ${nextFlightNumber}` : ''}${remarks ? ` - ${remarks}` : ''}`;
            const { error } = await database_1.supabase
                .from('international_baggages')
                .update({
                status: 'rush',
                remarks: remarkText,
                updated_at: new Date().toISOString()
            })
                .eq('id', baggageId);
            if (error)
                throw error;
        }
        res.json({
            success: true,
            message: 'Bagage marqué comme RUSH avec succès'
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/v1/rush/statistics/:airport - Statistiques RUSH
router.get('/statistics/:airport', async (req, res, next) => {
    try {
        const { airport } = req.params;
        // Compter les bagages nationaux RUSH
        const { data: nationalBags, error: nationalError } = await database_1.supabase
            .from('baggages')
            .select(`
        *,
        passengers (departure, arrival)
      `)
            .eq('status', 'rush');
        if (nationalError)
            throw nationalError;
        const nationalCount = nationalBags?.filter((b) => b.passengers?.departure === airport || b.passengers?.arrival === airport).length || 0;
        // Compter les bagages internationaux RUSH
        const { data: internationalBags, error: internationalError } = await database_1.supabase
            .from('international_baggages')
            .select('*')
            .eq('airport_code', airport)
            .eq('status', 'rush');
        if (internationalError)
            throw internationalError;
        const internationalCount = internationalBags?.length || 0;
        // Compter ceux d'aujourd'hui
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();
        const todayCount = [
            ...(nationalBags?.filter((b) => (b.passengers?.departure === airport || b.passengers?.arrival === airport) &&
                b.updated_at >= todayISO) || []),
            ...(internationalBags?.filter((b) => b.updated_at >= todayISO) || [])
        ].length;
        res.json({
            success: true,
            data: {
                airportCode: airport,
                totalRush: nationalCount + internationalCount,
                nationalRush: nationalCount,
                internationalRush: internationalCount,
                rushToday: todayCount,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
