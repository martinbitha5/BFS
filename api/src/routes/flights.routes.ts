import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';

const router = Router();

// Helper: Transformer snake_case → camelCase
function toCamelCase(data: any) {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(toCamelCase);
  
  return {
    id: data.id,
    flightNumber: data.flight_number,
    airline: data.airline,
    airlineCode: data.airline_code,
    departure: data.departure,
    arrival: data.arrival,
    scheduledDate: data.scheduled_date,
    scheduledTime: data.scheduled_time,
    airportCode: data.airport_code,
    status: data.status,
    createdAt: data.created_at,
    createdBy: data.created_by,
    updatedAt: data.updated_at
  };
}

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
      data: toCamelCase(data || [])
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
      data: toCamelCase(data)
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
    
    // Transformer camelCase → snake_case
    const dbData = {
      flight_number: flightData.flightNumber,
      airline: flightData.airline,
      airline_code: flightData.airlineCode,
      departure: flightData.departure,
      arrival: flightData.arrival,
      scheduled_date: flightData.scheduledDate,
      scheduled_time: flightData.scheduledTime || null,
      airport_code: flightData.airportCode || 'FIH',
      status: flightData.status || 'scheduled',
      created_by: (req as any).user?.id || null
    };

    const { data, error } = await supabase
      .from('flight_schedule')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('Error:', error);
      throw error;
    }

    res.status(201).json({
      success: true,
      data: toCamelCase(data)
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
    
    // Transformer camelCase → snake_case
    const dbUpdates: any = {};
    if (updates.flightNumber) dbUpdates.flight_number = updates.flightNumber;
    if (updates.airline) dbUpdates.airline = updates.airline;
    if (updates.airlineCode) dbUpdates.airline_code = updates.airlineCode;
    if (updates.departure) dbUpdates.departure = updates.departure;
    if (updates.arrival) dbUpdates.arrival = updates.arrival;
    if (updates.scheduledDate) dbUpdates.scheduled_date = updates.scheduledDate;
    if (updates.scheduledTime !== undefined) dbUpdates.scheduled_time = updates.scheduledTime;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.airportCode) dbUpdates.airport_code = updates.airportCode;

    const { data, error } = await supabase
      .from('flight_schedule')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: toCamelCase(data)
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
      data: toCamelCase(data || [])
    });
  } catch (error) {
    next(error);
  }
});

export default router;
