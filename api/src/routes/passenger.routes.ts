import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';
import { restrictToAirport, requireAirportCode } from '../middleware/airport-restriction.middleware';

const router = Router();

/**
 * GET /api/v1/passengers
 * Récupérer tous les passagers avec filtres optionnels
 * RESTRICTION: Filtre automatiquement par aéroport de l'utilisateur
 */
router.get('/', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport, flight, status } = req.query;
    
    // Le middleware garantit que airport existe et correspond à l'utilisateur
    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis'
      });
    }
    
    let query = supabase
      .from('passengers')
      .select('*, baggages(*), boarding_status(*)')
      .eq('airport_code', airport); // FORCER le filtre par aéroport
    if (flight) {
      query = query.eq('flight_number', flight);
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
router.get('/:id', requireAirportCode, async (req, res, next) => {
  try {
    const { id } = req.params;
    const airport = req.query.airport as string || req.body.airport_code as string;

    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis'
      });
    }

    const { data, error } = await supabase
      .from('passengers')
      .select('*, baggages(*), boarding_status(*)')
      .eq('id', id)
      .eq('airport_code', airport) // FORCER le filtre par aéroport
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Passenger not found or access denied'
        });
      }
      throw error;
    }

    // Double vérification de sécurité
    if (data && data.airport_code !== airport) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé : Ce passager n\'appartient pas à votre aéroport'
      });
    }

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Passenger not found'
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

    const { data, error } = await supabase
      .from('passengers')
      .upsert(passengers, { onConflict: 'id' })
      .select();

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      data
    });
  } catch (error) {
    next(error);
  }
});

export default router;
