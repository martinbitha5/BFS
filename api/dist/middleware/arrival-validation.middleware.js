"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateArrivalScan = void 0;
const database_1 = require("../config/database");
/**
 * Middleware pour valider les scans à l'arrivée
 * Vérifie si le bagage est déjà lié à un passager et l'accepte automatiquement
 */
const validateArrivalScan = async (req, res, next) => {
    try {
        const { tag_number, airport_code } = req.body;
        if (!tag_number || !airport_code) {
            return res.status(400).json({
                success: false,
                error: 'tag_number et airport_code sont requis'
            });
        }
        // 1. Vérifier si le bagage existe et est déjà lié
        const { data: baggage, error: baggageError } = await database_1.supabase
            .from('baggages')
            .select(`
        *,
        passengers:passenger_id (
          id,
          pnr,
          full_name,
          baggage_count,
          flight_number
        )
      `)
            .eq('tag_number', tag_number)
            .single();
        if (baggageError) {
            console.error('[ARRIVAL] Erreur lors de la recherche du bagage:', baggageError);
            return next(baggageError);
        }
        // 2. Si le bagage existe et est lié à un passager
        if (baggage && baggage.passenger_id) {
            const passenger = baggage.passengers;
            // Vérifier le nombre de bagages déjà arrivés pour ce passager
            const { count: arrivedCount } = await database_1.supabase
                .from('baggages')
                .select('*', { count: 'exact' })
                .eq('passenger_id', baggage.passenger_id)
                .eq('status', 'arrived');
            // Si on n'a pas encore atteint le nombre total de bagages déclarés
            if (arrivedCount < passenger.baggage_count) {
                // Accepter automatiquement le scan
                req.body.validated = true;
                req.body.passenger_id = baggage.passenger_id;
                return next();
            }
        }
        // 3. Si on arrive ici, continuer avec la validation standard
        next();
    }
    catch (error) {
        console.error('[ARRIVAL] Erreur lors de la validation:', error);
        next(error);
    }
};
exports.validateArrivalScan = validateArrivalScan;
