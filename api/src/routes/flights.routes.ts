import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';

const router = Router();

/**
 * GET /api/v1/flights
 * Liste de tous les vols avec filtres optionnels
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport, date, status } = req.query;
    
    let query = supabase
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
 * GET /api/v1/flights/:id
 * Récupérer un vol spécifique
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
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
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/flights
 * Créer un nouveau vol
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flightData = req.body;

    const { data, error } = await supabase
      .from('flight_schedule')
      .insert(flightData)
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
 * PUT /api/v1/flights/:id
 * Mettre à jour un vol
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('flight_schedule')
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
 * DELETE /api/v1/flights/:id
 * Supprimer un vol
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('flight_schedule')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Flight deleted successfully'
    });
  } catch (error) {
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

    const { data, error } = await supabase
      .from('flight_schedule')
      .select('*')
      .eq('airport_code', airportCode)
      .eq('scheduled_date', today)
      .in('status', ['scheduled', 'boarding'])
      .order('scheduled_time', { ascending: true });

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

export default router;
