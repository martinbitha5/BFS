import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';
import { requireAirportCode } from '../middleware/airport-restriction.middleware';
import { autoSyncIfNeeded } from '../services/auto-sync.service';

const router = Router();

/**
 * GET /api/v1/passengers
 * Récupérer tous les passagers avec filtres optionnels
 * RESTRICTION: Filtre automatiquement par aéroport de l'utilisateur
 */
router.get('/', requireAirportCode, async (req: Request & { userAirportCode?: string; hasFullAccess?: boolean }, res: Response, next: NextFunction) => {
  try {
    const { flight, pnr } = req.query;
    const airportCode = req.userAirportCode; // Peut être undefined si accès total
    
    // Auto-sync si la table est vide mais que des raw_scans existent
    if (airportCode) {
      await autoSyncIfNeeded(airportCode);
    }
    
    let query = supabase
      .from('passengers')
      .select('*, baggages(*), boarding_status(*)');
    
    // Filtrer par aéroport uniquement si l'utilisateur n'a pas accès total
    if (airportCode) {
      query = query.eq('airport_code', airportCode);
    }
    if (flight) {
      query = query.eq('flight_number', flight);
    }
    if (pnr) {
      query = query.eq('pnr', pnr.toString().toUpperCase());
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transformer les données pour le dashboard (snake_case -> camelCase)
    const transformedData = data?.map(passenger => ({
      id: passenger.id,
      fullName: passenger.full_name,
      pnr: passenger.pnr,
      flightNumber: passenger.flight_number,
      departure: passenger.departure,
      arrival: passenger.arrival,
      seatNumber: passenger.seat_number,
      baggageCount: passenger.baggage_count || 0,
      checkedInAt: passenger.checked_in_at,
      airportCode: passenger.airport_code,
      baggages: passenger.baggages || [],
      boarding_status: passenger.boarding_status || []
    }));

    res.json({
      success: true,
      count: transformedData?.length || 0,
      data: transformedData || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/passengers/:id
 * Récupérer un passager spécifique
 * RESTRICTION: Vérifie que le passager appartient à l'aéroport de l'utilisateur
 */
router.get('/:id', requireAirportCode, async (req: Request & { userAirportCode?: string; hasFullAccess?: boolean }, res, next) => {
  try {
    const { id } = req.params;
    const airportCode = req.userAirportCode; // Peut être undefined si accès total
    const hasFullAccess = (req as any).hasFullAccess;

    let query = supabase
      .from('passengers')
      .select('*, baggages(*), boarding_status(*)')
      .eq('id', id);

    // Filtrer par aéroport uniquement si l'utilisateur n'a pas accès total
    if (airportCode && !hasFullAccess) {
      query = query.eq('airport_code', airportCode);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Passenger not found or access denied'
        });
      }
      throw error;
    }

    // Vérification de sécurité si l'utilisateur n'a pas accès total
    if (!hasFullAccess && airportCode && data && data.airport_code !== airportCode) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé : Ce passager n\'appartient pas à votre aéroport'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/passengers/pnr/:pnr
 * Rechercher un passager par PNR
 */
router.get('/pnr/:pnr', async (req, res, next) => {
  try {
    const { pnr } = req.params;

    const { data, error } = await supabase
      .from('passengers')
      .select('*, baggages(*), boarding_status(*)')
      .eq('pnr', pnr)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Passenger not found with this PNR'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/passengers
 * Créer un nouveau passager (check-in)
 * RESTRICTION: Vérifie que le vol est programmé et que l'aéroport correspond
 */
router.post('/', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const passengerData = req.body;
    const airport = req.query.airport as string || passengerData.airport_code;

    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis'
      });
    }

    // VALIDATION: Vérifier que le vol est programmé
    if (passengerData.flight_number) {
      const { validateFlightForScan } = await import('../middleware/scan-validation.middleware');
      const validation = await validateFlightForScan(passengerData.flight_number, airport);

      if (!validation.valid) {
        return res.status(403).json({
          success: false,
          error: validation.reason || 'Vol non programmé',
          rejected: true,
          flightNumber: passengerData.flight_number
        });
      }
    }

    // FORCER l'aéroport dans les données
    passengerData.airport_code = airport;

    const { data, error } = await supabase
      .from('passengers')
      .insert(passengerData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/passengers/:id
 * Mettre à jour un passager
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('passengers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/passengers/sync
 * Synchronisation batch de passagers
 * Gère les doublons en cherchant d'abord par (pnr, airport_code) avant d'insérer
 */
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { passengers } = req.body;

    if (!Array.isArray(passengers)) {
      return res.status(400).json({
        success: false,
        error: 'passengers must be an array'
      });
    }

    const results: any[] = [];

    // Traiter chaque passager individuellement
    for (const passenger of passengers) {
      try {
        // Chercher d'abord si le passager existe
        const { data: existing, error: searchError } = await supabase
          .from('passengers')
          .select('id')
          .eq('pnr', passenger.pnr)
          .eq('airport_code', passenger.airport_code)
          .single();

        if (existing && !searchError) {
          // Passager existe, le mettre à jour
          const { data: updated, error: updateError } = await supabase
            .from('passengers')
            .update(passenger)
            .eq('id', existing.id)
            .select()
            .single();

          if (updateError) throw updateError;
          results.push(updated);
        } else {
          // Passager n'existe pas, l'insérer
          const { data: inserted, error: insertError } = await supabase
            .from('passengers')
            .insert([passenger])
            .select()
            .single();

          if (insertError) throw insertError;
          results.push(inserted);
        }
      } catch (passengerError) {
        console.error(`[Passengers/Sync] Erreur pour ${passenger.pnr}:`, passengerError);
        // Continuer avec le passager suivant, mais logger l'erreur
      }
    }

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

export default router;
