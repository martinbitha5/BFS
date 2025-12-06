import { Router, Request, Response, NextFunction } from 'express';
import { supabase, isMockMode } from '../config/database';
import { mockPassengers } from '../data/mockData';

const router = Router();

/**
 * GET /api/v1/passengers
 * Récupérer tous les passagers avec filtres optionnels
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport, flight, status } = req.query;

    // Mode test avec données mockées
    if (isMockMode) {
      let filtered = [...mockPassengers];
      if (airport) filtered = filtered.filter(p => p.airport_code === airport);
      if (flight) filtered = filtered.filter(p => p.flight_number === flight);
      
      return res.json({
        success: true,
        count: filtered.length,
        data: filtered
      });
    }
    
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

    if (isMockMode) {
      return res.status(201).json({
        success: true,
        message: 'Passenger created (mock mode)',
        data: { id: `mock_${Date.now()}`, ...passengerData }
      });
    }

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

    if (isMockMode) {
      return res.json({
        success: true,
        message: 'Passenger updated (mock mode)',
        data: { id, ...updates }
      });
    }

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

    if (isMockMode) {
      return res.json({
        success: true,
        message: `${passengers.length} passengers synced (mock mode)`,
        count: passengers.length
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
