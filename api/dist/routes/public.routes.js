"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const bagjourney_service_1 = require("../services/bagjourney.service");
const bagjourney_status_util_1 = require("../utils/bagjourney-status.util");
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
        const allBaggages = [];
        let passengerInfo = null;
        // Normaliser les paramètres de query (peuvent être string, array, ou undefined)
        let normalizedPnr = null;
        let normalizedTag = null;
        if (typeof pnr === 'string') {
            normalizedPnr = pnr.toUpperCase();
        }
        else if (Array.isArray(pnr)) {
            normalizedPnr = pnr[0]?.toUpperCase() || null;
        }
        if (typeof tag === 'string') {
            normalizedTag = tag.toUpperCase();
        }
        else if (Array.isArray(tag)) {
            normalizedTag = tag[0]?.toUpperCase() || null;
        }
        const searchPnr = normalizedPnr;
        console.log('[TRACK] Recherche avec PNR:', searchPnr, 'ou TAG:', normalizedTag);
        // 1. Rechercher dans les bagages nationaux
        if (searchPnr) {
            // D'abord trouver le passager par PNR
            const { data: passenger, error: passengerError } = await database_1.supabase
                .from('passengers')
                .select('id, full_name, pnr, flight_number, departure, arrival, baggage_count')
                .eq('pnr', searchPnr)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            console.log('[TRACK] Passager national trouvé:', passenger, 'Erreur:', passengerError?.message);
            if (passenger && !passengerError) {
                passengerInfo = {
                    passenger_name: passenger.full_name,
                    pnr: passenger.pnr,
                    flight_number: passenger.flight_number,
                    origin: passenger.departure,
                    destination: passenger.arrival
                };
                // ⚠️ VÉRIFIER D'ABORD LE BAGGAGE_COUNT DU PASSAGER
                const expectedBaggageCount = passenger.baggage_count || 0;
                console.log('[TRACK] Passager attendu:', expectedBaggageCount, 'bagage(s)');
                // Si le passager a 0 bagages attendus, ne rien chercher
                if (expectedBaggageCount === 0) {
                    console.log('[TRACK] ✅ Aucun bagage attendu pour ce passager');
                }
                else {
                    // Sinon, chercher les bagages liés à ce passager
                    const { data: nationalBaggages, error: nationalError } = await database_1.supabase
                        .from('baggages')
                        .select('id, tag_number, status, weight, current_location, last_scanned_at, origin, destination, notes')
                        .eq('passenger_id', passenger.id)
                        .order('created_at', { ascending: false });
                    console.log('[TRACK] Bagages par passenger_id:', nationalBaggages?.length || 0);
                    if (nationalBaggages && nationalBaggages.length > 0 && !nationalError) {
                        for (const bag of nationalBaggages) {
                            allBaggages.push({
                                bag_id: bag.tag_number,
                                status: bag.status,
                                weight: bag.weight,
                                current_location: bag.current_location,
                                last_scanned_at: bag.last_scanned_at,
                                baggage_type: 'national',
                                destination: bag.destination,
                                notes: bag.notes
                            });
                        }
                    }
                    // Si pas assez de bagages trouvés, chercher des bagages orphelins sur le vol
                    if (allBaggages.length < expectedBaggageCount && passenger.flight_number) {
                        const { data: orphanBaggages, error: orphanError } = await database_1.supabase
                            .from('baggages')
                            .select('id, tag_number, status, weight, current_location, last_scanned_at, origin, destination, notes')
                            .is('passenger_id', null)
                            .eq('flight_number', passenger.flight_number)
                            .order('created_at', { ascending: false });
                        console.log('[TRACK] Bagages orphelins même vol:', orphanBaggages?.length || 0);
                        if (orphanBaggages && orphanBaggages.length > 0 && !orphanError) {
                            // Ne prendre que le nombre manquant de bagages, pas tous
                            const missingBaggageCount = expectedBaggageCount - allBaggages.length;
                            const baggagesToTake = orphanBaggages.slice(0, missingBaggageCount);
                            console.log(`[TRACK] Prendre ${baggagesToTake.length} bagages orphelins sur ${orphanBaggages.length} disponibles`);
                            for (const bag of baggagesToTake) {
                                allBaggages.push({
                                    bag_id: bag.tag_number,
                                    status: bag.status,
                                    weight: bag.weight,
                                    current_location: bag.current_location,
                                    last_scanned_at: bag.last_scanned_at,
                                    baggage_type: 'national',
                                    origin: bag.origin,
                                    destination: bag.destination,
                                    notes: bag.notes,
                                    note: 'Bagage du vol (non lié individuellement)'
                                });
                            }
                        }
                    }
                } // Fin du if expectedBaggageCount === 0
            }
        }
        else if (normalizedTag) {
            // Rechercher par tag RFID - retourne un seul bagage
            // 1. D'abord chercher les bagages manuels (sans passenger_id)
            const { data: manualBaggage, error: manualError } = await database_1.supabase
                .from('baggages')
                .select(`
          id,
          tag_number,
          status,
          weight,
          current_location,
          last_scanned_at,
          origin,
          destination,
          notes,
          manually_authorized,
          flight_number
        `)
                .eq('tag_number', normalizedTag)
                .is('passenger_id', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (manualBaggage && !manualError) {
                // Bagage manuel trouvé - pas de passager associé
                passengerInfo = {
                    passenger_name: 'Bagage Manuel',
                    pnr: 'MANUAL',
                    flight_number: manualBaggage.flight_number || 'N/A',
                    origin: manualBaggage.origin,
                    destination: manualBaggage.destination
                };
                allBaggages.push({
                    bag_id: manualBaggage.tag_number,
                    status: manualBaggage.status,
                    weight: manualBaggage.weight,
                    current_location: manualBaggage.current_location,
                    last_scanned_at: manualBaggage.last_scanned_at,
                    baggage_type: 'national',
                    destination: manualBaggage.destination,
                    notes: manualBaggage.notes,
                    manually_authorized: manualBaggage.manually_authorized
                });
            }
            else {
                // 2. Si pas de bagage manuel, chercher les bagages liés à un passager
                const { data: nationalBaggage, error: nationalError } = await database_1.supabase
                    .from('baggages')
                    .select(`
            id,
            tag_number,
            status,
            weight,
            current_location,
            last_scanned_at,
            destination,
            notes,
            passengers!inner (
              full_name,
              pnr,
              flight_number,
              departure,
              arrival
            )
          `)
                    .ilike('tag_number', normalizedTag)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                if (nationalBaggage && !nationalError) {
                    const passenger = nationalBaggage.passengers;
                    passengerInfo = {
                        passenger_name: passenger.full_name,
                        pnr: passenger.pnr,
                        flight_number: passenger.flight_number,
                        origin: passenger.departure,
                        destination: passenger.arrival
                    };
                    allBaggages.push({
                        bag_id: nationalBaggage.tag_number,
                        status: nationalBaggage.status,
                        weight: nationalBaggage.weight,
                        current_location: nationalBaggage.current_location,
                        last_scanned_at: nationalBaggage.last_scanned_at,
                        baggage_type: 'national',
                        destination: nationalBaggage.destination,
                        notes: nationalBaggage.notes
                    });
                }
            }
        }
        // 2. Chercher aussi dans bagages internationaux (pour PNR, ajouter aux résultats)
        if (searchPnr) {
            const { data: internationalBaggages, error: intlError } = await database_1.supabase
                .from('international_baggages')
                .select('*')
                .ilike('pnr', searchPnr)
                .order('created_at', { ascending: false });
            console.log('[TRACK] Bagages internationaux trouvés:', internationalBaggages?.length, 'Erreur:', intlError?.message);
            if (internationalBaggages && internationalBaggages.length > 0 && !intlError) {
                if (!passengerInfo) {
                    passengerInfo = {
                        passenger_name: internationalBaggages[0].passenger_name || 'Passager international',
                        pnr: internationalBaggages[0].pnr,
                        flight_number: internationalBaggages[0].flight_number,
                        origin: null,
                        destination: null
                    };
                }
                for (const bag of internationalBaggages) {
                    allBaggages.push({
                        bag_id: bag.tag_number,
                        status: bag.status,
                        weight: bag.weight,
                        current_location: bag.airport_code,
                        last_scanned_at: bag.scanned_at,
                        baggage_type: 'international'
                    });
                }
            }
        }
        else if (normalizedTag && allBaggages.length === 0) {
            // Si recherche par tag et rien trouvé dans national
            const { data: internationalBaggage, error: intlError } = await database_1.supabase
                .from('international_baggages')
                .select('*')
                .ilike('tag_number', normalizedTag)
                .limit(1)
                .single();
            if (internationalBaggage && !intlError) {
                passengerInfo = {
                    passenger_name: internationalBaggage.passenger_name || 'Passager international',
                    pnr: internationalBaggage.pnr,
                    flight_number: internationalBaggage.flight_number,
                    origin: null,
                    destination: null
                };
                allBaggages.push({
                    bag_id: internationalBaggage.tag_number,
                    status: internationalBaggage.status,
                    weight: internationalBaggage.weight,
                    current_location: internationalBaggage.airport_code,
                    last_scanned_at: internationalBaggage.scanned_at,
                    baggage_type: 'international'
                });
            }
        }
        // 3. Chercher dans les rapports BIRS
        // IMPORTANT: Si un bagage est dans un rapport BIRS, ça signifie que le vol est arrivé
        // Donc le statut par défaut est "arrived" (le manifeste = preuve d'arrivée)
        if (searchPnr) {
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
          reconciled_at,
          international_baggage_id,
          created_at,
          birs_reports!inner (
            flight_number,
            origin,
            destination,
            uploaded_at
          )
        `)
                .ilike('pnr', searchPnr)
                .order('created_at', { ascending: false });
            console.log('[TRACK] BIRS items trouvés:', birsItems?.length, 'Erreur:', birsError?.message);
            if (birsItems && birsItems.length > 0 && !birsError) {
                for (const item of birsItems) {
                    const birsReport = item.birs_reports;
                    // Éviter les doublons: si ce bagage est déjà lié à un international_baggage, on skip
                    // car il sera déjà dans la liste via la recherche international_baggages
                    const alreadyInList = allBaggages.some(b => b.bag_id === item.bag_id);
                    if (alreadyInList)
                        continue;
                    // Le rapport BIRS = le vol est arrivé = bagage arrivé par défaut
                    // Si réconcilié = "delivered" (récupéré par le passager)
                    let status = 'arrived'; // Par défaut: arrivé (le manifeste existe = vol arrivé)
                    if (item.reconciled_at) {
                        status = 'delivered'; // Réconcilié = bagage remis au passager
                    }
                    if (!passengerInfo) {
                        passengerInfo = {
                            passenger_name: item.passenger_name || 'Passager international',
                            pnr: item.pnr,
                            flight_number: birsReport.flight_number,
                            origin: birsReport.origin,
                            destination: birsReport.destination
                        };
                    }
                    allBaggages.push({
                        bag_id: item.bag_id,
                        status: status,
                        weight: item.weight,
                        current_location: birsReport.destination,
                        last_scanned_at: birsReport.uploaded_at, // Date d'upload du rapport = date d'arrivée
                        baggage_type: 'birs',
                        origin: birsReport.origin,
                        destination: birsReport.destination
                    });
                }
            }
        }
        else if (normalizedTag && allBaggages.length === 0) {
            const { data: birsItem, error: birsError } = await database_1.supabase
                .from('birs_report_items')
                .select(`
          id,
          bag_id,
          weight,
          passenger_name,
          pnr,
          received,
          loaded,
          reconciled_at,
          created_at,
          birs_reports!inner (
            flight_number,
            origin,
            destination,
            uploaded_at
          )
        `)
                .ilike('bag_id', normalizedTag)
                .limit(1)
                .single();
            if (birsItem && !birsError) {
                const birsReport = birsItem.birs_reports;
                // Le rapport BIRS existe = bagage arrivé
                let status = 'arrived';
                if (birsItem.reconciled_at) {
                    status = 'delivered';
                }
                passengerInfo = {
                    passenger_name: birsItem.passenger_name || 'Passager international',
                    pnr: birsItem.pnr,
                    flight_number: birsReport.flight_number,
                    origin: birsReport.origin,
                    destination: birsReport.destination
                };
                allBaggages.push({
                    bag_id: birsItem.bag_id,
                    status: status,
                    weight: birsItem.weight,
                    current_location: birsReport.destination,
                    last_scanned_at: birsReport.uploaded_at,
                    baggage_type: 'birs',
                    origin: birsReport.origin,
                    destination: birsReport.destination
                });
            }
        }
        // 4. Rechercher dans BagJourney si aucun résultat local et recherche par tag
        if (allBaggages.length === 0 && normalizedTag) {
            console.log('[TRACK] Aucun bagage local trouvé, recherche dans BagJourney...');
            try {
                const bagJourneyService = (0, bagjourney_service_1.getBagJourneyService)();
                if (bagJourneyService.isConfigured()) {
                    const bagJourneyResponse = await bagJourneyService.getBagHistory({ tagNumber: normalizedTag });
                    if (bagJourneyResponse.success && bagJourneyResponse.data) {
                        console.log('[TRACK] Bagage trouvé dans BagJourney');
                        const bagData = bagJourneyResponse.data;
                        const currentEvent = bagData.events[bagData.events.length - 1];
                        // Créer les infos passager à partir des données BagJourney
                        passengerInfo = {
                            passenger_name: 'Passager BagJourney', // BagJourney ne fournit pas toujours le nom
                            pnr: 'BAGJOURNEY', // Identifiant spécial pour BagJourney
                            flight_number: currentEvent?.flightNumber || 'Unknown',
                            origin: bagData.events.find(e => e.code === 'CHECKED_IN')?.airportCode || 'Unknown',
                            destination: bagData.events.find(e => e.code === 'EXPECTED')?.airportCode || 'Unknown'
                        };
                        // Convertir le format BagJourney au format BFS local
                        allBaggages.push({
                            bag_id: bagData.tagNumber,
                            status: (0, bagjourney_status_util_1.mapBagJourneyStatusToBFS)(bagData.currentStatus.code),
                            current_location: bagData.currentStatus.location,
                            last_scanned_at: bagData.currentStatus.timestamp,
                            baggage_type: 'international', // BagJourney est principalement pour les vols internationaux
                            origin: passengerInfo.origin,
                            destination: passengerInfo.destination,
                            notes: `BagJourney: ${bagData.currentStatus.description}`
                        });
                    }
                    else {
                        console.log('[TRACK] Aucun bagage trouvé dans BagJourney:', bagJourneyResponse.error);
                    }
                }
                else {
                    console.log('[TRACK] Service BagJourney non configuré');
                }
            }
            catch (error) {
                console.error('[TRACK] Erreur lors de la recherche BagJourney:', error);
                // Ne pas échouer la requête si BagJourney échoue, continuer avec l'erreur 404
            }
        }
        // 5. Aucun bagage trouvé
        console.log('[TRACK] Total bagages trouvés:', allBaggages.length);
        if (allBaggages.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Aucun bagage trouvé avec ces informations. Vérifiez votre PNR ou numéro de bagage.'
            });
        }
        // Calculer le résumé des statuts
        const statusSummary = {
            total: allBaggages.length,
            arrived: allBaggages.filter(b => b.status === 'arrived' || b.status === 'delivered').length,
            in_transit: allBaggages.filter(b => b.status === 'in_transit' || b.status === 'loaded').length,
            checked: allBaggages.filter(b => b.status === 'checked' || b.status === 'scanned').length,
            rush: allBaggages.filter(b => b.status === 'rush').length,
            lost: allBaggages.filter(b => b.status === 'lost' || b.status === 'unmatched').length,
        };
        return res.json({
            success: true,
            data: {
                passenger_name: passengerInfo?.passenger_name || 'N/A',
                pnr: passengerInfo?.pnr || 'N/A',
                flight_number: passengerInfo?.flight_number || 'N/A',
                origin: passengerInfo?.origin,
                destination: passengerInfo?.destination,
                summary: statusSummary,
                baggages: allBaggages
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
