"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const airport_restriction_middleware_1 = require("../middleware/airport-restriction.middleware");
const scan_validation_middleware_1 = require("../middleware/scan-validation.middleware");
const auto_sync_service_1 = require("../services/auto-sync.service");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/baggage
 * Liste de tous les bagages avec filtres optionnels
 * RESTRICTION: Filtre automatiquement par aéroport de l'utilisateur
 *
 * Query params:
 * - airport: code aéroport (ou ALL pour tous)
 * - status: filtre par statut
 * - flight: filtre par numéro de vol
 * - date_from: date de début (format YYYY-MM-DD)
 * - date_to: date de fin (format YYYY-MM-DD)
 * - limit: nombre max de résultats (défaut: 1000)
 */
router.get('/', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const { flight, status, airport, date_from, date_to, limit } = req.query;
        const hasFullAccess = req.hasFullAccess;
        // Normaliser le paramètre airport (peut être string, array, ou undefined)
        let requestedAirport;
        if (typeof airport === 'string') {
            requestedAirport = airport.toUpperCase();
        }
        else if (Array.isArray(airport)) {
            requestedAirport = airport[0]?.toUpperCase();
        }
        // Si l'utilisateur a accès complet et demande ALL, on ne filtre pas par aéroport
        const filterByAirport = !(hasFullAccess && requestedAirport === 'ALL');
        const airportCode = filterByAirport ? (req.userAirportCode || requestedAirport) : undefined;
        // Auto-sync si un aéroport spécifique est demandé
        if (airportCode) {
            await (0, auto_sync_service_1.autoSyncIfNeeded)(airportCode);
        }
        // Récupérer les bagages directement avec les passagers associés
        // Cette approche est plus fiable que de passer par les passagers
        let baggageQuery = database_1.supabase
            .from('baggages')
            .select('*, passengers(id, full_name, pnr, flight_number, departure, arrival)')
            .order('created_at', { ascending: false });
        // Si on filtre par aéroport, ajouter le filtre
        if (filterByAirport && airportCode) {
            baggageQuery = baggageQuery.eq('airport_code', airportCode);
        }
        // Filtrer par statut si demandé
        if (status) {
            baggageQuery = baggageQuery.eq('status', status);
        }
        // Filtrer par vol si demandé
        if (flight) {
            baggageQuery = baggageQuery.eq('flight_number', flight);
        }
        // Filtrer par date de début (created_at >= date_from)
        if (date_from && typeof date_from === 'string') {
            // Ajouter le début de la journée
            const startDate = `${date_from}T00:00:00.000Z`;
            baggageQuery = baggageQuery.gte('created_at', startDate);
        }
        // Filtrer par date de fin (created_at <= date_to)
        if (date_to && typeof date_to === 'string') {
            // Ajouter la fin de la journée
            const endDate = `${date_to}T23:59:59.999Z`;
            baggageQuery = baggageQuery.lte('created_at', endDate);
        }
        // Limiter le nombre de résultats
        const maxResults = limit ? parseInt(limit, 10) : 1000;
        baggageQuery = baggageQuery.limit(maxResults);
        const { data: baggages, error: baggageError } = await baggageQuery;
        if (baggageError) {
            console.error('Erreur récupération bagages:', baggageError);
            throw baggageError;
        }
        // Formater les données pour le frontend
        const formattedBaggages = (baggages || []).map(bag => ({
            id: bag.id,
            tag_number: bag.tag_number,
            passenger_id: bag.passenger_id,
            weight: bag.weight,
            status: bag.status,
            flight_number: bag.flight_number,
            airport_code: bag.airport_code,
            current_location: bag.current_location,
            checked_at: bag.checked_at,
            arrived_at: bag.arrived_at,
            delivered_at: bag.delivered_at,
            created_at: bag.created_at,
            passengers: bag.passengers ? {
                full_name: bag.passengers.full_name,
                pnr: bag.passengers.pnr,
                flight_number: bag.passengers.flight_number,
                departure: bag.passengers.departure,
                arrival: bag.passengers.arrival
            } : null
        }));
        res.json({
            success: true,
            count: formattedBaggages.length,
            data: formattedBaggages
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/baggage/:tagNumber
 * Récupérer un bagage spécifique par son numéro de tag
 */
router.get('/:tagNumber', async (req, res, next) => {
    try {
        const { tagNumber } = req.params;
        const { data, error } = await database_1.supabase
            .from('baggages')
            .select('*, passengers(*)')
            .eq('tag_number', tagNumber)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Baggage not found'
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
 * GET /api/v1/baggage/track/:tagNumber
 * Suivre un bagage - endpoint public pour les passagers
 */
router.get('/track/:tagNumber', async (req, res, next) => {
    try {
        const { tagNumber } = req.params;
        const { data: baggage, error } = await database_1.supabase
            .from('baggages')
            .select(`
        id,
        tag_number,
        weight,
        status,
        checked_at,
        arrived_at,
        current_location,
        flight_number,
        passengers (
          full_name,
          pnr,
          departure,
          arrival
        )
      `)
            .eq('tag_number', tagNumber)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Baggage not found. Please check your tag number.'
                });
            }
            throw error;
        }
        const passenger = Array.isArray(baggage.passengers) ? baggage.passengers[0] : baggage.passengers;
        res.json({
            success: true,
            data: {
                tagNumber: baggage.tag_number,
                status: baggage.status,
                weight: baggage.weight,
                flightNumber: baggage.flight_number,
                checkedAt: baggage.checked_at,
                arrivedAt: baggage.arrived_at,
                currentLocation: baggage.current_location,
                passenger: passenger ? {
                    name: passenger.full_name,
                    pnr: passenger.pnr,
                    route: `${passenger.departure} → ${passenger.arrival}`
                } : null
            }
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/baggage
 * Créer/enregistrer un nouveau bagage
 * RESTRICTION: Vérifie la limite de bagages selon le boarding pass
 */
router.post('/', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const baggageData = req.body;
        const { passenger_id, tag_number, airport_code } = baggageData;
        // Si un passenger_id est fourni, vérifier la limite de bagages
        if (passenger_id) {
            // Récupérer le passager avec son baggage_count
            const { data: passenger, error: passengerError } = await database_1.supabase
                .from('passengers')
                .select('id, baggage_count, airport_code, flight_number')
                .eq('id', passenger_id)
                .single();
            if (passengerError || !passenger) {
                return res.status(404).json({
                    success: false,
                    error: 'Passager non trouvé'
                });
            }
            // Vérifier que le passager appartient à l'aéroport
            if (passenger.airport_code !== airport_code) {
                return res.status(403).json({
                    success: false,
                    error: 'Ce passager n\'appartient pas à votre aéroport'
                });
            }
            // Compter les bagages existants pour ce passager (non autorisés manuellement)
            const { data: existingBaggages, error: countError } = await database_1.supabase
                .from('baggages')
                .select('id')
                .eq('passenger_id', passenger_id)
                .eq('manually_authorized', false);
            if (countError && process.env.NODE_ENV !== 'production') {
                console.error('Error counting baggages:', countError);
            }
            const currentBaggageCount = existingBaggages?.length || 0;
            const declaredCount = passenger.baggage_count || 0;
            const existingCount = currentBaggageCount || 0;
            // Si le nombre de bagages existants + 1 dépasse le nombre déclaré, créer une demande d'autorisation
            if (existingCount >= declaredCount) {
                // Récupérer le tag RFID
                const tagNumber = tag_number || baggageData.tag_number;
                if (!tagNumber) {
                    return res.status(400).json({
                        success: false,
                        error: 'Le tag RFID est requis pour créer une demande d\'autorisation'
                    });
                }
                const { data: existingRequest } = await database_1.supabase
                    .from('baggage_authorization_requests')
                    .select('id, status')
                    .eq('rfid_tag', tagNumber)
                    .eq('status', 'pending')
                    .maybeSingle();
                if (existingRequest) {
                    return res.status(403).json({
                        success: false,
                        error: 'Une demande d\'autorisation est déjà en attente pour ce bagage',
                        requiresAuthorization: true,
                        authorizationRequestId: existingRequest.id,
                        declaredCount,
                        currentCount: existingCount,
                        requestedCount: existingCount + 1
                    });
                }
                // Créer une demande d'autorisation
                const { data: authRequest, error: authError } = await database_1.supabase
                    .from('baggage_authorization_requests')
                    .insert({
                    passenger_id: passenger_id,
                    rfid_tag: tagNumber,
                    requested_baggage_count: existingCount + 1,
                    declared_baggage_count: declaredCount,
                    current_baggage_count: existingCount,
                    status: 'pending',
                    airport_code: airport_code,
                    flight_number: passenger.flight_number
                })
                    .select()
                    .single();
                if (authError) {
                    if (process.env.NODE_ENV !== 'production') {
                        console.error('Error creating authorization request:', authError);
                    }
                    return res.status(500).json({
                        success: false,
                        error: 'Erreur lors de la création de la demande d\'autorisation'
                    });
                }
                return res.status(403).json({
                    success: false,
                    error: `Nombre de bagages dépassé. Le boarding pass indique ${declaredCount} bagage(s), mais ${existingCount + 1} bagage(s) sont demandés. Une demande d'autorisation a été créée et sera examinée par le support.`,
                    requiresAuthorization: true,
                    authorizationRequestId: authRequest.id,
                    declaredCount,
                    currentCount: existingCount,
                    requestedCount: existingCount + 1
                });
            }
        }
        // Si pas de passenger_id fourni, essayer de trouver le passager automatiquement
        if (!baggageData.passenger_id && baggageData.flight_number && baggageData.airport_code) {
            console.log('[BAGGAGE] Recherche automatique du passager pour vol:', baggageData.flight_number);
            // Chercher les passagers sur ce vol qui ont des bagages manquants
            const { data: passengersOnFlight } = await database_1.supabase
                .from('passengers')
                .select('id, pnr, full_name, baggage_count, flight_number')
                .eq('airport_code', baggageData.airport_code)
                .eq('flight_number', baggageData.flight_number);
            if (passengersOnFlight && passengersOnFlight.length > 0) {
                // Pour chaque passager, compter ses bagages actuels
                for (const pax of passengersOnFlight) {
                    const { count: linkedBaggages } = await database_1.supabase
                        .from('baggages')
                        .select('*', { count: 'exact', head: true })
                        .eq('passenger_id', pax.id);
                    const expectedBags = pax.baggage_count || 0;
                    const actualBags = linkedBaggages || 0;
                    // Si ce passager a des bagages manquants, lui lier ce bagage
                    if (actualBags < expectedBags) {
                        baggageData.passenger_id = pax.id;
                        console.log(`[BAGGAGE] ✅ Bagage lié automatiquement au passager ${pax.full_name} (${pax.pnr}) - ${actualBags}/${expectedBags} bagages`);
                        break;
                    }
                }
            }
            if (!baggageData.passenger_id) {
                console.log('[BAGGAGE] ⚠️ Aucun passager trouvé avec bagages manquants sur ce vol');
            }
        }
        // Créer le bagage (avec ou sans passenger_id)
        const { data, error } = await database_1.supabase
            .from('baggages')
            .insert(baggageData)
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({
            success: true,
            data,
            autoLinked: !!baggageData.passenger_id
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PUT /api/v1/baggage/:id
 * Mettre à jour un bagage (ex: marquer comme arrivé)
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { data, error } = await database_1.supabase
            .from('baggages')
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
 * POST /api/v1/baggage/scan
 * Scanner un bagage RFID
 * RESTRICTION: Vérifie que le bagage appartient à l'aéroport et que le vol est programmé
 */
router.post('/scan', airport_restriction_middleware_1.requireAirportCode, scan_validation_middleware_1.validateBaggageScan, async (req, res, next) => {
    try {
        const { tagNumber, location, scannedBy, airport_code } = req.body;
        if (!tagNumber) {
            return res.status(400).json({
                success: false,
                error: 'tagNumber is required'
            });
        }
        // Récupérer le bagage pour vérifier l'aéroport
        const { data: baggage, error: baggageError } = await database_1.supabase
            .from('baggages')
            .select('airport_code, flight_number, passenger_id')
            .eq('tag_number', tagNumber)
            .single();
        if (baggageError || !baggage) {
            return res.status(404).json({
                success: false,
                error: 'Bagage non trouvé'
            });
        }
        // Vérifier que le bagage appartient à l'aéroport
        if (baggage.airport_code !== airport_code) {
            return res.status(403).json({
                success: false,
                error: 'Ce bagage n\'appartient pas à votre aéroport'
            });
        }
        // Mettre à jour le bagage avec la nouvelle localisation
        const { data, error } = await database_1.supabase
            .from('baggages')
            .update({
            current_location: location,
            last_scanned_at: new Date().toISOString(),
            last_scanned_by: scannedBy
        })
            .eq('tag_number', tagNumber)
            .eq('airport_code', airport_code) // Double sécurité
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
 * POST /api/v1/baggage/sync
 * Synchronisation batch de bagages
 * Lie automatiquement le bagage au passager via baggage_base_number
 */
router.post('/sync', async (req, res, next) => {
    try {
        const { baggages } = req.body;
        if (!Array.isArray(baggages)) {
            return res.status(400).json({
                success: false,
                error: 'baggages must be an array'
            });
        }
        // Pour chaque bagage, rechercher le passager correspondant par tag_number ou PNR
        const baggagesWithPassenger = await Promise.all(baggages.map(async (baggage) => {
            // Supprimer l'ID local s'il n'est pas un UUID valide (format: baggage_xxx)
            // PostgreSQL attend un UUID, pas un ID local
            const { id, ...baggageWithoutLocalId } = baggage;
            const isValidUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            const cleanBaggage = isValidUUID ? baggage : baggageWithoutLocalId;
            // Si passenger_id déjà présent, ne pas chercher
            if (cleanBaggage.passenger_id) {
                return cleanBaggage;
            }
            // Si passenger_pnr est fourni, chercher le passager par PNR
            if (cleanBaggage.passenger_pnr && cleanBaggage.airport_code) {
                const { data: passengerByPnr, error: pnrError } = await database_1.supabase
                    .from('passengers')
                    .select('id')
                    .eq('pnr', cleanBaggage.passenger_pnr.toUpperCase())
                    .eq('airport_code', cleanBaggage.airport_code)
                    .maybeSingle();
                if (passengerByPnr) {
                    console.log(`[BAGGAGE SYNC] ✅ Passager trouvé par PNR ${cleanBaggage.passenger_pnr}: ${passengerByPnr.id}`);
                    return { ...cleanBaggage, passenger_id: passengerByPnr.id };
                }
                else {
                    console.log(`[BAGGAGE SYNC] ⚠️ Passager non trouvé pour PNR ${cleanBaggage.passenger_pnr}`);
                }
            }
            const tagNumber = cleanBaggage.tag_number;
            if (!tagNumber) {
                return cleanBaggage;
            }
            // Extraire la base du tag (10 premiers chiffres)
            const tagBase = tagNumber.substring(0, 10);
            // Rechercher un passager avec ce baggage_base_number
            const { data: passenger, error: baseError } = await database_1.supabase
                .from('passengers')
                .select('id')
                .eq('baggage_base_number', tagBase)
                .eq('airport_code', cleanBaggage.airport_code)
                .maybeSingle();
            if (passenger) {
                console.log(`[BAGGAGE SYNC] ✅ Passager trouvé pour tag ${tagNumber}: ${passenger.id}`);
                return { ...cleanBaggage, passenger_id: passenger.id };
            }
            // Fallback: rechercher par tag similaire (base + séquence)
            // Tag format: 4071303675 (base) -> passager avec baggage_base_number = 4071303675
            const { data: passengerByBase } = await database_1.supabase
                .from('passengers')
                .select('id, baggage_base_number')
                .eq('airport_code', cleanBaggage.airport_code)
                .not('baggage_base_number', 'is', null);
            if (passengerByBase) {
                // Chercher un passager dont le baggage_base_number correspond au début du tag
                const matchedPassenger = passengerByBase.find(p => {
                    if (!p.baggage_base_number)
                        return false;
                    // Le tag peut être la base exacte ou base + séquence
                    return tagNumber.startsWith(p.baggage_base_number) ||
                        p.baggage_base_number === tagBase;
                });
                if (matchedPassenger) {
                    console.log(`[BAGGAGE SYNC] ✅ Passager trouvé par base pour tag ${tagNumber}: ${matchedPassenger.id}`);
                    return { ...cleanBaggage, passenger_id: matchedPassenger.id };
                }
            }
            console.log(`[BAGGAGE SYNC] ⚠️ Aucun passager trouvé pour tag ${tagNumber}`);
            return cleanBaggage;
        }));
        const { data, error } = await database_1.supabase
            .from('baggages')
            .upsert(baggagesWithPassenger, { onConflict: 'tag_number' })
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
/**
 * PATCH /api/v1/baggage/:id/link
 * Lier un bagage à un passager
 */
router.patch('/:id/link', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { passenger_id } = req.body;
        if (!passenger_id) {
            return res.status(400).json({
                success: false,
                error: 'passenger_id est requis'
            });
        }
        // Vérifier que le passager existe
        const { data: passenger, error: passError } = await database_1.supabase
            .from('passengers')
            .select('id, full_name')
            .eq('id', passenger_id)
            .single();
        if (passError || !passenger) {
            return res.status(404).json({
                success: false,
                error: 'Passager non trouvé'
            });
        }
        // Mettre à jour le bagage
        const { data, error } = await database_1.supabase
            .from('baggages')
            .update({ passenger_id })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json({
            success: true,
            message: `Bagage lié à ${passenger.full_name}`,
            data
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/baggage/fix-unlinked
 * Lier automatiquement les bagages orphelins aux passagers
 */
router.post('/fix-unlinked', airport_restriction_middleware_1.requireAirportCode, async (req, res, next) => {
    try {
        const airportCode = req.userAirportCode;
        let fixed = 0;
        // Récupérer les bagages sans passenger_id
        const { data: unlinkedBaggages, error: bagError } = await database_1.supabase
            .from('baggages')
            .select('*')
            .is('passenger_id', null)
            .eq('airport_code', airportCode);
        if (bagError)
            throw bagError;
        if (!unlinkedBaggages || unlinkedBaggages.length === 0) {
            return res.json({
                success: true,
                message: 'Aucun bagage orphelin trouvé',
                fixed: 0
            });
        }
        // Pour chaque bagage non lié, chercher un passager correspondant
        for (const baggage of unlinkedBaggages) {
            // Chercher les passagers du même vol avec des bagages manquants
            const { data: passengers } = await database_1.supabase
                .from('passengers')
                .select('*, baggages(*)')
                .eq('flight_number', baggage.flight_number)
                .eq('airport_code', baggage.airport_code);
            if (!passengers)
                continue;
            // Trouver un passager qui a moins de bagages liés que son baggage_count
            for (const passenger of passengers) {
                const linkedBaggagesCount = passenger.baggages?.length || 0;
                const expectedBaggages = passenger.baggage_count || 0;
                if (linkedBaggagesCount < expectedBaggages) {
                    // Vérifier si les tags sont proches (même série)
                    const existingTags = passenger.baggages?.map((b) => b.tag_number) || [];
                    const isRelated = existingTags.some((tag) => {
                        const tagNum = parseInt(tag);
                        const currentTagNum = parseInt(baggage.tag_number);
                        return Math.abs(tagNum - currentTagNum) <= 10;
                    });
                    if (isRelated || linkedBaggagesCount === 0) {
                        // Lier le bagage au passager
                        const { error: updateError } = await database_1.supabase
                            .from('baggages')
                            .update({ passenger_id: passenger.id })
                            .eq('id', baggage.id);
                        if (!updateError) {
                            fixed++;
                            console.log(`[FIX] Bagage ${baggage.tag_number} lié à ${passenger.full_name}`);
                        }
                        break;
                    }
                }
            }
        }
        res.json({
            success: true,
            message: `${fixed} bagages corrigés`,
            fixed
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
