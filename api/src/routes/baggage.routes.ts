import { Router, Request, Response, NextFunction } from 'express';
import { supabase, isMockMode } from '../config/database';
import { mockBaggages } from '../data/mockData';

const router = Router();

/**
 * GET /api/v1/baggage
 * Liste de tous les bagages avec filtres optionnels
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport, flight, status } = req.query;

    // Mode test avec données mockées
    if (isMockMode) {
      let filtered = [...mockBaggages];
      if (airport) filtered = filtered.filter(b => b.airport_code === airport);
      if (flight) filtered = filtered.filter(b => b.flight_number === flight);
      if (status) filtered = filtered.filter(b => b.status === status);
      
      return res.json({
        success: true,
        count: filtered.length,
        data: filtered
      });
    }
    
    let query = supabase
      .from('baggages')
      .select('*, passengers(*)');

    if (airport) {
      query = query.eq('airportCode', airport);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (flight) {
      query = query.eq('flightNumber', flight);
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
 * GET /api/v1/baggage/:tagNumber
 * Récupérer un bagage spécifique par son numéro de tag
 */
router.get('/:tagNumber', async (req, res, next) => {
  try {
    const { tagNumber } = req.params;

    const { data, error } = await supabase
      .from('baggages')
      .select('*, passengers(*)')
      .eq('tagNumber', tagNumber)
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
        tagNumber,
        weight,
        status,
        checkedAt,
        arrivedAt,
        currentLocation,
        flightNumber,
        passengers (
          fullName,
          pnr,
          departure,
          arrival
        )
      `)
      .eq('tagNumber', tagNumber)
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
        tagNumber: baggage.tagNumber,
        status: baggage.status,
        weight: baggage.weight,
        flightNumber: baggage.flightNumber,
        checkedAt: baggage.checkedAt,
        arrivedAt: baggage.arrivedAt,
        currentLocation: baggage.currentLocation,
        passenger: passenger ? {
          name: passenger.fullName,
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

    if (isMockMode) {
      return res.status(201).json({
        success: true,
        message: 'Baggage created (mock mode)',
        data: { id: `mock_${Date.now()}`, ...baggageData }
      });
    }

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

    if (isMockMode) {
      return res.json({
        success: true,
        message: 'Baggage updated (mock mode)',
        data: { id, ...updates }
      });
    }

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

    if (isMockMode) {
      return res.json({
        success: true,
        message: 'Baggage scanned (mock mode)',
        data: { tagNumber, location, scannedBy, scannedAt: new Date().toISOString() }
      });
    }

    // Mettre à jour le bagage avec la nouvelle localisation
    const { data, error } = await supabase
      .from('baggages')
      .update({
        currentLocation: location,
        lastScannedAt: new Date().toISOString(),
        lastScannedBy: scannedBy
      })
      .eq('tagNumber', tagNumber)
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

    if (isMockMode) {
      return res.json({
        success: true,
        message: `${baggages.length} baggages synced (mock mode)`,
        count: baggages.length
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
