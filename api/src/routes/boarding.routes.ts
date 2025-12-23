import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';
import { requireAirportCode } from '../middleware/airport-restriction.middleware';

const router = Router();

/**
 * GET /api/v1/boarding
 * Récupérer tous les statuts d'embarquement
 * RESTRICTION: Filtre automatiquement par aéroport de l'utilisateur
 */
router.get('/', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport, flight } = req.query;

    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis'
      });
    }

    // Récupérer les statuts d'embarquement via une jointure avec les passagers
    const { data: passengers, error: passengersError } = await supabase
      .from('passengers')
      .select('id, airport_code')
      .eq('airport_code', airport);

    if (passengersError) throw passengersError;

    const passengerIds = passengers?.map(p => p.id) || [];

    if (passengerIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    let query = supabase
      .from('boarding_status')
      .select('*, passengers(*)')
      .in('passenger_id', passengerIds);
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
 * RESTRICTION: Vérifie que le passager appartient à l'aéroport et que le vol est programmé
 */
router.post('/passenger/:passengerId', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { passengerId } = req.params;
    const { boardedBy, gate, airport_code } = req.body;
    const airport = req.query.airport as string || airport_code;

    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis'
      });
    }

    // Vérifier que le passager appartient à l'aéroport
    const { data: passenger, error: passengerError } = await supabase
      .from('passengers')
      .select('airport_code, flight_number')
      .eq('id', passengerId)
      .single();

    if (passengerError || !passenger) {
      return res.status(404).json({
        success: false,
        error: 'Passager non trouvé'
      });
    }

    if (passenger.airport_code !== airport) {
      return res.status(403).json({
        success: false,
        error: 'Ce passager n\'appartient pas à votre aéroport'
      });
    }

    // VALIDATION: Vérifier que le vol est programmé
    if (passenger.flight_number) {
      const { validateFlightForScan } = await import('../middleware/scan-validation.middleware');
      const validation = await validateFlightForScan(passenger.flight_number, airport);

      if (!validation.valid) {
        return res.status(403).json({
          success: false,
          error: validation.reason || 'Vol non programmé',
          rejected: true,
          flightNumber: passenger.flight_number
        });
      }
    }

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
