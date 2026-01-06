"use strict";
/**
 * Middleware de validation des scans
 * Vérifie que le vol est programmé avant d'accepter un scan
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBaggageScan = exports.validateBoardingPassScan = void 0;
exports.validateFlightForScan = validateFlightForScan;
const database_1 = require("../config/database");
/**
 * Valide qu'un vol est programmé avant d'accepter un scan
 */
async function validateFlightForScan(flightNumber, airportCode, scanDate = new Date()) {
    try {
        // Normaliser le numéro de vol (enlever espaces, mettre en majuscules)
        const normalizedFlight = flightNumber.trim().toUpperCase();
        // Utiliser la date locale au lieu de UTC pour éviter les problèmes de timezone
        const getLocalDateString = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const todayStr = getLocalDateString(scanDate);
        const tomorrow = new Date(scanDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = getLocalDateString(tomorrow);
        // Vérifier si le vol existe dans flight_schedule pour cet aéroport
        // Chercher les vols d'aujourd'hui et demain pour être flexible
        const { data: scheduledFlight, error } = await database_1.supabase
            .from('flight_schedule')
            .select('*')
            .eq('flight_number', normalizedFlight)
            .eq('airport_code', airportCode)
            .in('status', ['scheduled', 'boarding', 'departed'])
            .gte('scheduled_date', todayStr)
            .lte('scheduled_date', tomorrowStr)
            .order('scheduled_date', { ascending: true })
            .limit(1)
            .single();
        if (error || !scheduledFlight) {
            return {
                valid: false,
                reason: `Vol ${normalizedFlight} non programmé à l'aéroport ${airportCode} pour cette date`
            };
        }
        return {
            valid: true,
            flight: scheduledFlight
        };
    }
    catch (err) {
        console.error('[VALIDATION] Erreur validation vol:', err);
        return {
            valid: false,
            reason: 'Erreur lors de la validation du vol'
        };
    }
}
/**
 * Middleware pour valider un scan de boarding pass
 */
const validateBoardingPassScan = async (req, res, next) => {
    try {
        const { raw_data, airport_code } = req.body;
        if (!raw_data || !airport_code) {
            return res.status(400).json({
                success: false,
                error: 'raw_data et airport_code sont requis'
            });
        }
        // Parser le boarding pass pour extraire le numéro de vol
        // Format simple : chercher un pattern de vol (ex: ET0080, 9U404, etc.)
        const flightMatch = raw_data.match(/\b([A-Z]{2,3}\d{2,4})\b/);
        if (!flightMatch) {
            return res.status(400).json({
                success: false,
                error: 'Impossible d\'extraire le numéro de vol du scan'
            });
        }
        const flightNumber = flightMatch[1];
        const validation = await validateFlightForScan(flightNumber, airport_code);
        if (!validation.valid) {
            return res.status(403).json({
                success: false,
                error: validation.reason || 'Vol non programmé',
                rejected: true,
                flightNumber
            });
        }
        // Ajouter les infos validées à la requête
        req.validatedFlight = {
            flightNumber,
            isValid: true
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.validateBoardingPassScan = validateBoardingPassScan;
/**
 * Middleware pour valider un scan de bagage RFID
 */
const validateBaggageScan = async (req, res, next) => {
    try {
        const { raw_data, airport_code, passenger_id, flight_number } = req.body;
        if (!airport_code) {
            return res.status(400).json({
                success: false,
                error: 'airport_code est requis'
            });
        }
        // Si on a un flight_number, le valider
        if (flight_number) {
            const validation = await validateFlightForScan(flight_number, airport_code);
            if (!validation.valid) {
                return res.status(403).json({
                    success: false,
                    error: validation.reason || 'Vol non programmé',
                    rejected: true,
                    flightNumber: flight_number
                });
            }
            req.validatedFlight = {
                flightNumber: flight_number,
                isValid: true
            };
        }
        // Si on a un passenger_id, vérifier que le passager appartient à cet aéroport
        if (passenger_id) {
            const { data: passenger, error } = await database_1.supabase
                .from('passengers')
                .select('airport_code, flight_number')
                .eq('id', passenger_id)
                .single();
            if (error || !passenger) {
                return res.status(404).json({
                    success: false,
                    error: 'Passager non trouvé'
                });
            }
            if (passenger.airport_code !== airport_code) {
                return res.status(403).json({
                    success: false,
                    error: 'Ce passager n\'appartient pas à votre aéroport'
                });
            }
            // Valider le vol du passager
            if (passenger.flight_number) {
                const validation = await validateFlightForScan(passenger.flight_number, airport_code);
                if (!validation.valid) {
                    return res.status(403).json({
                        success: false,
                        error: `Le vol ${passenger.flight_number} du passager n'est pas programmé`,
                        rejected: true
                    });
                }
            }
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.validateBaggageScan = validateBaggageScan;
