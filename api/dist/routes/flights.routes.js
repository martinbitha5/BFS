"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
// Helper: Transformer snake_case → camelCase
function toCamelCase(data) {
    if (!data)
        return data;
    if (Array.isArray(data))
        return data.map(toCamelCase);
    return {
        id: data.id,
        flightNumber: data.flight_number,
        airline: data.airline,
        airlineCode: data.airline_code,
        departure: data.departure,
        arrival: data.arrival,
        scheduledDate: data.scheduled_date,
        scheduledTime: data.scheduled_time,
        airportCode: data.airport_code,
        status: data.status,
        flightType: data.flight_type || 'departure',
        baggageRestriction: data.baggage_restriction || 'block',
        restrictionNote: data.restriction_note || null,
        createdAt: data.created_at,
        createdBy: data.created_by,
        updatedAt: data.updated_at
    };
}
/**
 * GET /api/v1/flights
 * Liste de tous les vols avec filtres optionnels
 */
router.get('/', async (req, res, next) => {
    try {
        const { airport, date, status } = req.query;
        console.log(`[Flights API] GET /flights - airport=${airport}, date=${date}, status=${status}`);
        let query = database_1.supabase
            .from('flight_schedule')
            .select('*')
            .order('scheduled_date', { ascending: true })
            .order('scheduled_time', { ascending: true });
        if (airport) {
            query = query.eq('airport_code', airport);
        }
        if (date) {
            query = query.eq('scheduled_date', date);
        }
        if (status) {
            query = query.eq('status', status);
        }
        const { data, error } = await query;
        if (error) {
            console.error('[Flights API] Erreur Supabase:', error);
            throw error;
        }
        console.log(`[Flights API] ${data?.length || 0} vols trouvés`);
        if (data && data.length > 0) {
            data.forEach(f => {
                console.log(`[Flights API]   - ${f.flight_number}: scheduled_date=${f.scheduled_date}, airport_code=${f.airport_code}`);
            });
        }
        res.json({
            success: true,
            count: data?.length || 0,
            data: toCamelCase(data || [])
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/flights/:id
 * Récupérer un vol spécifique
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await database_1.supabase
            .from('flight_schedule')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Flight not found'
                });
            }
            throw error;
        }
        res.json({
            success: true,
            data: toCamelCase(data)
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/flights
 * Créer un nouveau vol
 */
router.post('/', async (req, res, next) => {
    try {
        const flightData = req.body;
        // Transformer camelCase → snake_case
        const dbData = {
            flight_number: flightData.flightNumber,
            airline: flightData.airline,
            airline_code: flightData.airlineCode,
            departure: flightData.departure,
            arrival: flightData.arrival,
            scheduled_date: flightData.scheduledDate,
            scheduled_time: flightData.scheduledTime || null,
            airport_code: flightData.airportCode || 'FIH',
            status: flightData.status || 'scheduled',
            flight_type: flightData.flightType || 'departure',
            baggage_restriction: flightData.baggageRestriction || 'block',
            restriction_note: flightData.restrictionNote || null,
            created_by: req.user?.id || null
        };
        const { data, error } = await database_1.supabase
            .from('flight_schedule')
            .insert(dbData)
            .select()
            .single();
        if (error) {
            console.error('Error:', error);
            throw error;
        }
        res.status(201).json({
            success: true,
            data: toCamelCase(data)
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PUT /api/v1/flights/:id
 * Mettre à jour un vol
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // Transformer camelCase → snake_case
        const dbUpdates = {};
        if (updates.flightNumber)
            dbUpdates.flight_number = updates.flightNumber;
        if (updates.airline)
            dbUpdates.airline = updates.airline;
        if (updates.airlineCode)
            dbUpdates.airline_code = updates.airlineCode;
        if (updates.departure)
            dbUpdates.departure = updates.departure;
        if (updates.arrival)
            dbUpdates.arrival = updates.arrival;
        if (updates.scheduledDate)
            dbUpdates.scheduled_date = updates.scheduledDate;
        if (updates.scheduledTime !== undefined)
            dbUpdates.scheduled_time = updates.scheduledTime;
        if (updates.status)
            dbUpdates.status = updates.status;
        if (updates.airportCode)
            dbUpdates.airport_code = updates.airportCode;
        if (updates.flightType)
            dbUpdates.flight_type = updates.flightType;
        if (updates.baggageRestriction)
            dbUpdates.baggage_restriction = updates.baggageRestriction;
        if (updates.restrictionNote !== undefined)
            dbUpdates.restriction_note = updates.restrictionNote;
        const { data, error } = await database_1.supabase
            .from('flight_schedule')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json({
            success: true,
            data: toCamelCase(data)
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * DELETE /api/v1/flights/:id
 * Supprimer un vol
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = await database_1.supabase
            .from('flight_schedule')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        res.json({
            success: true,
            message: 'Flight deleted successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/flights/available/:airportCode
 * Récupère les vols disponibles pour un aéroport (aujourd'hui)
 * Utilisé par l'app mobile
 */
router.get('/available/:airportCode', async (req, res, next) => {
    try {
        const { airportCode } = req.params;
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await database_1.supabase
            .from('flight_schedule')
            .select('*')
            .eq('airport_code', airportCode)
            .eq('scheduled_date', today)
            .in('status', ['scheduled', 'boarding'])
            .order('scheduled_time', { ascending: true });
        if (error)
            throw error;
        res.json({
            success: true,
            count: data?.length || 0,
            data: toCamelCase(data || [])
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/flights/check/:flightNumber
 * Vérifie si un vol est programmé pour aujourd'hui
 * Utilisé par l'app mobile pour valider les boarding pass avant scan
 *
 * @param flightNumber - Numéro de vol (ex: ET80, 9U404)
 * @query airport - Code aéroport (optionnel, filtre supplémentaire)
 * @returns { isScheduled: boolean, flight: Flight | null }
 */
router.get('/check/:flightNumber', async (req, res, next) => {
    try {
        const { flightNumber } = req.params;
        const { airport } = req.query;
        const today = new Date().toISOString().split('T')[0];
        // Normaliser le numéro de vol (enlever espaces, majuscules)
        const normalizedFlightNumber = flightNumber.trim().toUpperCase().replace(/\s+/g, '');
        console.log(`[FlightCheck] Vérification vol: ${normalizedFlightNumber} pour ${today}`);
        // Rechercher le vol programmé pour aujourd'hui
        let query = database_1.supabase
            .from('flight_schedule')
            .select('*')
            .eq('scheduled_date', today)
            .in('status', ['scheduled', 'boarding', 'departed']);
        // Filtrer par aéroport si fourni
        if (airport) {
            query = query.eq('airport_code', airport);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        // Chercher une correspondance (avec ou sans espaces/zéros)
        const matchingFlight = data?.find(flight => {
            const dbFlightNumber = flight.flight_number.trim().toUpperCase().replace(/\s+/g, '');
            // Correspondance exacte ou avec zéros optionnels (ET80 = ET0080, 9U404 = 9U0404)
            return dbFlightNumber === normalizedFlightNumber ||
                dbFlightNumber.replace(/0+(\d)/g, '$1') === normalizedFlightNumber.replace(/0+(\d)/g, '$1');
        });
        if (matchingFlight) {
            console.log(`[FlightCheck] ✅ Vol trouvé: ${matchingFlight.flight_number}`);
            res.json({
                success: true,
                isScheduled: true,
                flight: toCamelCase(matchingFlight)
            });
        }
        else {
            console.log(`[FlightCheck] ❌ Vol non programmé: ${normalizedFlightNumber}`);
            res.json({
                success: true,
                isScheduled: false,
                flight: null,
                message: `Le vol ${flightNumber} n'est pas programmé pour aujourd'hui (${today})`
            });
        }
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/flights/validate-boarding
 * Valide un boarding pass en vérifiant si le vol est programmé aujourd'hui
 *
 * Gère les variantes de numéros de vol: ET64, ET064, ET0064
 *
 * @body { flightNumber: string, airportCode: string }
 * @returns { isValid: boolean, flight?: Flight, reason?: string }
 */
router.post('/validate-boarding', async (req, res, next) => {
    try {
        const { flightNumber, airportCode, departure, arrival } = req.body;
        if (!flightNumber) {
            return res.status(400).json({
                success: false,
                isValid: false,
                reason: 'Numéro de vol requis'
            });
        }
        // Fonction pour normaliser un numéro de vol
        function normalizeFlightNumber(flight) {
            const match = flight.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
            if (match) {
                const [, letters, digits] = match;
                const numericPart = digits.replace(/^0+/, '') || '0';
                return `${letters}${numericPart}`;
            }
            return flight.trim().toUpperCase();
        }
        // Fonction pour comparer deux numéros de vol
        function flightNumbersMatch(flight1, flight2) {
            return normalizeFlightNumber(flight1) === normalizeFlightNumber(flight2);
        }
        const today = new Date().toISOString().split('T')[0];
        const normalizedInput = normalizeFlightNumber(flightNumber);
        console.log(`[ValidateBoarding] 🔍 Validation: ${flightNumber} (norm: ${normalizedInput}) @ ${airportCode}`);
        // Rechercher le vol programmé
        let query = database_1.supabase
            .from('flight_schedule')
            .select('*')
            .eq('scheduled_date', today)
            .in('status', ['scheduled', 'boarding', 'departed']);
        // Filtrer par aéroport si fourni
        if (airportCode) {
            query = query.or(`departure.eq.${airportCode},arrival.eq.${airportCode}`);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        if (!data || data.length === 0) {
            console.log(`[ValidateBoarding] ❌ Aucun vol trouvé pour le ${today}`);
            return res.json({
                success: true,
                isValid: false,
                reason: `Aucun vol programmé pour le ${today}`
            });
        }
        console.log(`[ValidateBoarding] 📊 ${data.length} vol(s) trouvé(s):`, data.map(f => `${f.flight_number} (${f.departure}->${f.arrival})`).join(', '));
        // Chercher correspondance flexible
        const matchingFlight = data.find(flight => flightNumbersMatch(flight.flight_number, normalizedInput));
        if (matchingFlight) {
            // Vérifier aussi que l'aéroport correspond si spécifié
            if (airportCode && (matchingFlight.departure === airportCode || matchingFlight.arrival === airportCode)) {
                console.log(`[ValidateBoarding] ✅ Vol valide: ${matchingFlight.flight_number} (${matchingFlight.status})`);
                res.json({
                    success: true,
                    isValid: true,
                    flight: toCamelCase(matchingFlight)
                });
            }
            else if (!airportCode) {
                // Pas de filtrage d'aéroport
                console.log(`[ValidateBoarding] ✅ Vol valide: ${matchingFlight.flight_number}`);
                res.json({
                    success: true,
                    isValid: true,
                    flight: toCamelCase(matchingFlight)
                });
            }
            else {
                // Aéroport ne correspond pas
                console.log(`[ValidateBoarding] ⚠️ Vol trouvé mais aéroport ne correspond pas: ${matchingFlight.flight_number} (${matchingFlight.departure}->${matchingFlight.arrival}) vs demandé: ${airportCode}`);
                return res.json({
                    success: true,
                    isValid: false,
                    reason: `Le vol ${flightNumber} existe mais ne passe pas par ${airportCode} (route: ${matchingFlight.departure} → ${matchingFlight.arrival})`
                });
            }
        }
        else {
            console.log(`[ValidateBoarding] ❌ Vol ${normalizedInput} non trouvé à ${airportCode}`);
            res.json({
                success: true,
                isValid: false,
                reason: `Le vol ${flightNumber} n'est pas programmé pour aujourd'hui. Veuillez vérifier le numéro de vol ou contacter un superviseur.`
            });
        }
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/flights/diagnostic/:airportCode
 * Endpoint de diagnostic pour vérifier les vols programmés
 * Retourne TOUS les vols pour cet aéroport aujourd'hui (indépendamment du statut)
 *
 * Utilisé pour déboguer les problèmes de validation
 */
router.get('/diagnostic/:airportCode', async (req, res, next) => {
    try {
        const { airportCode } = req.params;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        // Récupérer TOUS les vols pour cet aéroport (peu importe le statut)
        const { data: allFlights, error } = await database_1.supabase
            .from('flight_schedule')
            .select('*')
            .eq('airport_code', airportCode)
            .order('scheduled_date', { ascending: false })
            .order('scheduled_time', { ascending: true });
        if (error)
            throw error;
        // Filtrer ceux d'aujourd'hui
        const todayFlights = allFlights?.filter(f => f.scheduled_date === todayStr) || [];
        // Filtrer ceux programmés (scheduled/boarding)
        const activeFlights = todayFlights.filter(f => ['scheduled', 'boarding', 'departed'].includes(f.status));
        res.json({
            success: true,
            diagnostic: {
                airport: airportCode,
                today: todayStr,
                currentTime: today.toISOString(),
                stats: {
                    totalFlightsForAirport: allFlights?.length || 0,
                    flightsToday: todayFlights.length,
                    activeFlightsToday: activeFlights.length
                },
                todayFlights: todayFlights.map(f => ({
                    id: f.id,
                    flightNumber: f.flight_number,
                    airline: f.airline,
                    departure: f.departure,
                    arrival: f.arrival,
                    scheduledDate: f.scheduled_date,
                    scheduledTime: f.scheduled_time,
                    status: f.status,
                    airportCode: f.airport_code
                }))
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
