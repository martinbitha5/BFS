import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';

const router = Router();

/**
 * GET /api/v1/baggage
 * Liste de tous les bagages avec filtres optionnels
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport, flight, status } = req.query;
    
    let query = supabase
      .from('baggages')
      .select('*, passengers(*)');

    if (airport) {
      query = query.eq('airport_code', airport);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (flight) {
      query = query.eq('flight_number', flight);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transformer les données pour le dashboard (snake_case -> camelCase)
    const transformedData = data?.map(baggage => {
      const passenger = Array.isArray(baggage.passengers) 
        ? baggage.passengers[0] 
        : baggage.passengers;
      
      return {
        id: baggage.id,
        tagNumber: baggage.tag_number,
        passengerId: baggage.passenger_id,
        weight: baggage.weight,
        status: baggage.status,
        flightNumber: baggage.flight_number,
        airportCode: baggage.airport_code,
        currentLocation: baggage.current_location,
        scannedAt: baggage.scanned_at,
        arrivedAt: baggage.arrived_at,
        deliveredAt: baggage.delivered_at,
        lastScannedAt: baggage.last_scanned_at,
        lastScannedBy: baggage.last_scanned_by,
        passenger: passenger ? {
          id: passenger.id,
          fullName: passenger.full_name,
          pnr: passenger.pnr,
          flightNumber: passenger.flight_number,
          departure: passenger.departure,
          arrival: passenger.arrival
        } : null
      };
    });

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
 * GET /api/v1/baggage/:tagNumber
 * Récupérer un bagage spécifique par son numéro de tag
 */
router.get('/:tagNumber', async (req, res, next) => {
  try {
    const { tagNumber } = req.params;

    const { data, error } = await supabase
      .from('baggages')
      .select('*, passengers(*)')
      .eq('tag_number', tagNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Baggage not found'
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
 * GET /api/v1/baggage/track/:tagNumber
 * Suivre un bagage - endpoint public pour les passagers
 */
router.get('/track/:tagNumber', async (req, res, next) => {
  try {
    const { tagNumber } = req.params;

    const { data: baggage, error } = await supabase
      .from('baggages')
      .select(`
        id,
        tag_number,
        weight,
        status,
        checked_at,
        arrived_at,
        current_location,
        flight_number,
        passengers (
          full_name,
          pnr,
          departure,
          arrival
        )
      `)
      .eq('tag_number', tagNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Baggage not found. Please check your tag number.'
        });
      }
      throw error;
    }

    const passenger = Array.isArray(baggage.passengers) ? baggage.passengers[0] : baggage.passengers;

    res.json({
      success: true,
      data: {
        tagNumber: baggage.tag_number,
        status: baggage.status,
        weight: baggage.weight,
        flightNumber: baggage.flight_number,
        checkedAt: baggage.checked_at,
        arrivedAt: baggage.arrived_at,
        currentLocation: baggage.current_location,
        passenger: passenger ? {
          name: passenger.full_name,
          pnr: passenger.pnr,
          route: `${passenger.departure} → ${passenger.arrival}`
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/baggage
 * Créer/enregistrer un nouveau bagage
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const baggageData = req.body;

    const { data, error } = await supabase
      .from('baggages')
      .insert(baggageData)
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
 * PUT /api/v1/baggage/:id
 * Mettre à jour un bagage (ex: marquer comme arrivé)
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('baggages')
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
 * POST /api/v1/baggage/scan
 * Scanner un bagage RFID
 */
router.post('/scan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tagNumber, location, scannedBy } = req.body;

    if (!tagNumber) {
      return res.status(400).json({
        success: false,
        error: 'tagNumber is required'
      });
    }

    // Mettre à jour le bagage avec la nouvelle localisation
    const { data, error } = await supabase
      .from('baggages')
      .update({
        current_location: location,
        last_scanned_at: new Date().toISOString(),
        last_scanned_by: scannedBy
      })
      .eq('tag_number', tagNumber)
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
 * POST /api/v1/baggage/sync
 * Synchronisation batch de bagages
 */
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { baggages } = req.body;

    if (!Array.isArray(baggages)) {
      return res.status(400).json({
        success: false,
        error: 'baggages must be an array'
      });
    }

    const { data, error } = await supabase
      .from('baggages')
      .upsert(baggages, { onConflict: 'id' })
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
