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
 * Normalise un numéro de vol pour permettre la correspondance flexible
 * ET64 = ET0064 = ET064 (en ignorant les zéros de remplissage)
 */
function normalizeFlightNumber(flight) {
    // Enlever espaces et mettre en majuscules
    let normalized = flight.trim().toUpperCase();
    // Extraire la partie lettre et la partie numéro
    const match = normalized.match(/^([A-Z]+)(\d+)$/);
    if (match) {
        const [, letters, digits] = match;
        // Enlever les zéros au début de la partie numérique
        const numericPart = digits.replace(/^0+/, '') || '0';
        return `${letters}${numericPart}`;
    }
    return normalized;
}
/**
 * Vérifie si deux numéros de vol correspondent (en ignorant les variations de zéro)
 */
function flightNumbersMatch(flight1, flight2) {
    return normalizeFlightNumber(flight1) === normalizeFlightNumber(flight2);
}
/**
 * Valide qu'un vol est programmé avant d'accepter un scan
 */
async function validateFlightForScan(flightNumber, airportCode, scanDate = new Date()) {
    try {
        const normalizedInput = normalizeFlightNumber(flightNumber);
        // Utiliser la date locale au lieu de UTC pour éviter les problèmes de timezone
        const getLocalDateString = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const todayStr = getLocalDateString(scanDate);
        console.log(`[VALIDATION-FLIGHT] Recherche vol: ${flightNumber} (normalisé: ${normalizedInput}) @ ${airportCode} pour ${todayStr}`);
        // Vérifier si le vol existe dans flight_schedule pour cet aéroport et cette date
        // Récupérer TOUS les vols pour cet aéroport cette date et filtrer côté code
        const { data: allFlights, error } = await database_1.supabase
            .from('flight_schedule')
            .select('*')
            .eq('airport_code', airportCode)
            .eq('scheduled_date', todayStr)
            .in('status', ['scheduled', 'boarding', 'departed']);
        if (error) {
            console.error('[VALIDATION-FLIGHT] Erreur Supabase:', error);
            return {
                valid: false,
                reason: `Erreur lors de la vérification du vol: ${error.message}`
            };
        }
        if (!allFlights || allFlights.length === 0) {
            console.log(`[VALIDATION-FLIGHT] ❌ Aucun vol trouvé pour ${airportCode} le ${todayStr}`);
            return {
                valid: false,
                reason: `Aucun vol n'est programmé pour l'aéroport ${airportCode} aujourd'hui`
            };
        }
        console.log(`[VALIDATION-FLIGHT] ${allFlights.length} vol(s) trouvé(s) pour ${airportCode}:`, allFlights.map(f => `${f.flight_number} (${f.status})`).join(', '));
        // Chercher une correspondance en comparant les numéros normalisés
        const matchingFlight = allFlights.find(flight => flightNumbersMatch(flight.flight_number, normalizedInput));
        if (matchingFlight) {
            console.log(`[VALIDATION-FLIGHT] ✅ Vol trouvé: ${matchingFlight.flight_number} (${matchingFlight.status})`);
            return {
                valid: true,
                flight: matchingFlight
            };
        }
        // Aucune correspondance trouvée
        console.log(`[VALIDATION-FLIGHT] ❌ Vol ${normalizedInput} non trouvé à ${airportCode}`);
        return {
            valid: false,
            reason: `Vol ${flightNumber} n'est pas programmé pour aujourd'hui à l'aéroport ${airportCode}`
        };
    }
    catch (err) {
        console.error('[VALIDATION-FLIGHT] Erreur validation vol:', err);
        return {
            valid: false,
            reason: `Erreur lors de la validation du vol: ${err.message}`
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
