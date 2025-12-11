import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';

const router = Router();

/**
 * GET /api/v1/passengers
 * Récupérer tous les passagers avec filtres optionnels
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport, flight, status } = req.query;
    
    let query = supabase
      .from('passengers')
      .select('*, baggages(*), boarding_status(*)');

    if (airport) {
      query = query.eq('airport_code', airport);
    }
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
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('passengers')
      .select('*, baggages(*), boarding_status(*)')
      .eq('id', id)
      .single();

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
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const passengerData = req.body;

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
