import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';

const router = Router();

/**
 * GET /api/v1/boarding
 * Récupérer tous les statuts d'embarquement
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport, flight } = req.query;

    let query = supabase
      .from('boarding_status')
      .select('*, passengers(*)');

    if (airport) {
      // Filtrer via les passagers
      query = query.eq('passengers.airport_code', airport);
    }
    if (flight) {
      query = query.eq('passengers.flight_number', flight);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      data: data || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/boarding
 * Créer un statut d'embarquement
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const boardingData = req.body;

    const { data, error } = await supabase
      .from('boarding_status')
      .insert(boardingData)
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
 * PUT /api/v1/boarding/:id
 * Mettre à jour un statut d'embarquement
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('boarding_status')
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
 * POST /api/v1/boarding/passenger/:passengerId
 * Marquer un passager comme embarqué
 */
router.post('/passenger/:passengerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { passengerId } = req.params;
    const { boardedBy, gate } = req.body;

    // Créer ou mettre à jour le statut d'embarquement
    const { data, error } = await supabase
      .from('boarding_status')
      .upsert({
        passenger_id: passengerId,
        boarded: true,
        boarded_at: new Date().toISOString(),
        boarded_by: boardedBy,
        gate: gate
      }, { onConflict: 'passenger_id' })
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
 * POST /api/v1/boarding/sync
 * Synchronisation batch des embarquements
 */
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boardings } = req.body;

    if (!Array.isArray(boardings)) {
      return res.status(400).json({
        success: false,
        error: 'boardings must be an array'
      });
    }

    const { data, error } = await supabase
      .from('boarding_status')
      .upsert(boardings, { onConflict: 'id' })
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
