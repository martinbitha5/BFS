"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
/**
 * Route publique pour tracker un bagage
 * Accepte PNR ou tag RFID
 * GET /api/v1/public/track?pnr=ABC123
 * GET /api/v1/public/track?tag=RF123456
 */
router.get('/track', async (req, res, next) => {
    try {
        const { pnr, tag } = req.query;
        if (!pnr && !tag) {
            return res.status(400).json({
                success: false,
                error: 'Veuillez fournir un PNR ou un numéro de bagage'
            });
        }
        let baggage = null;
        let baggageType = 'national';
        // 1. Rechercher dans les bagages nationaux
        if (pnr) {
            // Rechercher par PNR - trouver le passager et ses bagages
            const { data: nationalBaggage, error: nationalError } = await database_1.supabase
                .from('baggages')
                .select(`
          id,
          tag_number,
          status,
          weight,
          current_location,
          last_scanned_at,
          passengers!inner (
            full_name,
            pnr,
            flight_number,
            departure,
            arrival
          )
        `)
                .eq('passengers.pnr', pnr.toUpperCase())
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (nationalBaggage && !nationalError) {
                const passenger = nationalBaggage.passengers;
                baggage = {
                    bag_id: nationalBaggage.tag_number,
                    status: nationalBaggage.status,
                    weight: nationalBaggage.weight,
                    current_location: nationalBaggage.current_location,
                    last_scanned_at: nationalBaggage.last_scanned_at,
                    passenger_name: passenger.full_name,
                    pnr: passenger.pnr,
                    flight_number: passenger.flight_number,
                    origin: passenger.departure,
                    destination: passenger.arrival
                };
                baggageType = 'national';
            }
        }
        else if (tag) {
            // Rechercher par tag RFID dans bagages nationaux
            const { data: nationalBaggage, error: nationalError } = await database_1.supabase
                .from('baggages')
                .select(`
          id,
          tag_number,
          status,
          weight,
          current_location,
          last_scanned_at,
          passengers!inner (
            full_name,
            pnr,
            flight_number,
            departure,
            arrival
          )
        `)
                .ilike('tag_number', tag.toUpperCase())
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (nationalBaggage && !nationalError) {
                const passenger = nationalBaggage.passengers;
                baggage = {
                    bag_id: nationalBaggage.tag_number,
                    status: nationalBaggage.status,
                    weight: nationalBaggage.weight,
                    current_location: nationalBaggage.current_location,
                    last_scanned_at: nationalBaggage.last_scanned_at,
                    passenger_name: passenger.full_name,
                    pnr: passenger.pnr,
                    flight_number: passenger.flight_number,
                    origin: passenger.departure,
                    destination: passenger.arrival
                };
                baggageType = 'national';
            }
        }
        // 2. Si aucun bagage national trouvé, chercher dans bagages internationaux
        if (!baggage) {
            const searchField = pnr ? 'pnr' : 'tag_number';
            const searchValue = pnr ? pnr.toUpperCase() : tag.toUpperCase();
            const { data: internationalBaggage, error: intlError } = await database_1.supabase
                .from('international_baggages')
                .select('*')
                .ilike(searchField, searchValue)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (internationalBaggage && !intlError) {
                baggage = {
                    bag_id: internationalBaggage.tag_number,
                    status: internationalBaggage.status,
                    weight: internationalBaggage.weight,
                    current_location: internationalBaggage.airport_code,
                    last_scanned_at: internationalBaggage.scanned_at,
                    passenger_name: internationalBaggage.passenger_name || 'Passager international',
                    pnr: internationalBaggage.pnr,
                    flight_number: internationalBaggage.flight_number,
                    origin: null,
                    destination: null
                };
                baggageType = 'international';
            }
        }
        // 3. Si toujours rien, chercher dans les rapports BIRS
        if (!baggage) {
            const searchField = pnr ? 'pnr' : 'bag_id';
            const searchValue = pnr ? pnr.toUpperCase() : tag.toUpperCase();
            const { data: birsItems, error: birsError } = await database_1.supabase
                .from('birs_report_items')
                .select(`
          id,
          bag_id,
          weight,
          passenger_name,
          pnr,
          received,
          loaded,
          created_at,
          birs_reports!inner (
            flight_number,
            origin,
            destination
          )
        `)
                .ilike(searchField, searchValue)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (birsItems && !birsError) {
                const birsReport = birsItems.birs_reports;
                // Déterminer le statut basé sur les champs received/loaded
                let status = 'scanned';
                if (birsItems.received) {
                    status = 'arrived';
                }
                else if (birsItems.loaded) {
                    status = 'in_transit';
                }
                baggage = {
                    bag_id: birsItems.bag_id,
                    status: status,
                    weight: birsItems.weight,
                    current_location: birsReport.destination,
                    last_scanned_at: birsItems.created_at,
                    passenger_name: birsItems.passenger_name || 'Passager international',
                    pnr: birsItems.pnr,
                    flight_number: birsReport.flight_number,
                    origin: birsReport.origin,
                    destination: birsReport.destination
                };
                baggageType = 'birs';
            }
        }
        // 4. Aucun bagage trouvé
        if (!baggage) {
            return res.status(404).json({
                success: false,
                error: 'Aucun bagage trouvé avec ces informations. Vérifiez votre PNR ou numéro de bagage.'
            });
        }
        return res.json({
            success: true,
            data: {
                bag_id: baggage.bag_id,
                passenger_name: baggage.passenger_name,
                pnr: baggage.pnr || 'N/A',
                flight_number: baggage.flight_number || 'N/A',
                status: baggage.status,
                current_location: baggage.current_location || 'En cours de traitement',
                last_scanned_at: baggage.last_scanned_at,
                origin: baggage.origin,
                destination: baggage.destination,
                weight: baggage.weight,
                baggage_type: baggageType
            }
        });
    }
    catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Erreur lors de la recherche du bagage:', error);
        }
        next(error);
    }
});
exports.default = router;
