import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/database';

/**
 * Middleware pour valider les scans à l'arrivée
 * Vérifie si le bagage est déjà lié à un passager et l'accepte automatiquement
 */
export const validateArrivalScan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tag_number, airport_code } = req.body;

    if (!tag_number || !airport_code) {
      return res.status(400).json({
        success: false,
        error: 'tag_number et airport_code sont requis'
      });
    }

    // 1. Vérifier si le bagage existe et est déjà lié
    const { data: baggage, error: baggageError } = await supabase
      .from('baggages')
      .select(`
        *,
        passengers:passenger_id (
          id,
          pnr,
          full_name,
          baggage_count,
          flight_number,
          departure,
          arrival
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
      const passenger = Array.isArray(baggage.passengers) ? baggage.passengers[0] : baggage.passengers;
      
      // Vérifier que le scan est à la bonne destination (passenger.arrival = aéroport d'arrivée)
      // Si données inversées en BD (departure=destination), accepter quand airport_code = departure
      const destNormale = passenger?.arrival;
      const origNormale = passenger?.departure;
      const estADestination = destNormale === airport_code;
      const donneesInversees = origNormale === airport_code && origNormale !== destNormale;
      
      if (!estADestination && !donneesInversees && (destNormale || origNormale)) {
        return res.status(403).json({
          success: false,
          error: `Ce bagage doit arriver à ${destNormale || origNormale}, pas à ${airport_code}. REDIRIGER LE BAGAGE.`,
          expected_arrival: destNormale || origNormale,
        });
      }
      
      // Vérifier le nombre de bagages déjà arrivés pour ce passager
      const { count: arrivedCount } = await supabase
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
  } catch (error) {
    console.error('[ARRIVAL] Erreur lors de la validation:', error);
    next(error);
  }
};
