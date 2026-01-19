import { NextFunction, Request, Response, Router } from 'express';
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
 * Accepte soit un passenger_id UUID, soit un PNR (6 car alphanumériques)
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { passenger_id, boarded_at, boarded_by, flight_number, seat_number } = req.body;

    if (!passenger_id) {
      return res.status(400).json({
        success: false,
        error: 'passenger_id requis'
      });
    }

    // Vérifier si c'est un PNR (6 caractères alphanumériques) ou un UUID
    const isPnr = /^[A-Z0-9]{6,7}$/.test(passenger_id);

    if (isPnr) {
      // C'est un PNR, chercher le passager par PNR
      console.log('[BOARDING API] 🔍 Cherche passager par PNR:', passenger_id);
      
      const { data: passenger, error: passengerError } = await supabase
        .from('passengers')
        .select('id')
        .eq('pnr', passenger_id)
        .single();

      if (passengerError || !passenger) {
        return res.status(404).json({
          success: false,
          error: `Passager non trouvé avec PNR: ${passenger_id}`
        });
      }

      passenger_id = passenger.id; // Utiliser le vrai ID
      console.log('[BOARDING API] ✅ Passager trouvé:', passenger_id);
    }

    const boardingData: any = {
      passenger_id,
      boarded_at: boarded_at || new Date().toISOString(),
    };

    if (boarded_by) {
      boardingData.boarded_by = boarded_by;
    }

    if (flight_number) {
      boardingData.flight_number = flight_number;
    }

    if (seat_number) {
      boardingData.seat_number = seat_number;
    }

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
    const boardingData: any = {
      passenger_id: passengerId,
      boarded_at: new Date().toISOString(),
    };
    
    if (boardedBy) {
      boardingData.boarded_by = boardedBy;
    }
    
    const { data, error } = await supabase
      .from('boarding_status')
      .upsert(boardingData, { onConflict: 'passenger_id' })
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

    // Nettoyer les données - seulement les champs valides
    const cleanedBoardings = boardings.map((b: any) => ({
      passenger_id: b.passenger_id,
      boarded_at: b.boarded_at || new Date().toISOString(),
      ...(b.boarded_by && { boarded_by: b.boarded_by }),
    })).filter((b: any) => b.passenger_id); // Filtrer les sans passenger_id

    if (cleanedBoardings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid boardings to sync'
      });
    }

    const { data, error } = await supabase
      .from('boarding_status')
      .upsert(cleanedBoardings, { onConflict: 'passenger_id' })
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

/**
 * POST /api/v1/boarding/sync-hash
 * Synchroniser l'embarquement avec le checksum du boarding pass
 * Au lieu d'envoyer le rawData (gros fichier), on envoie un checksum simple
 * 
 * Body:
 * {
 *   scan_checksum: "450_1705600123_42f7e8c9",
 *   boarding_id: "YCECFQ_RAZIOU_KQ0555",
 *   passenger_id: "passenger_uuid",
 *   status: "boarded",
 *   boarded_at: "ISO_DATE",
 *   boarded_by: "user_id",
 *   timestamp: "ISO_DATE",
 *   airport_code: "FIH",
 *   pnr: "YCECFQ",
 *   full_name: "RAZIOU MOUSTAPHA",
 *   flight_number: "KQ0555"
 * }
 */
router.post('/sync-hash', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { passenger_id, boarded_at, boarded_by } = req.body;

    console.log('[Boarding] sync-hash received:', { passenger_id, boarded_at, boarded_by });

    // Validation basique
    if (!passenger_id) {
      return res.status(400).json({
        success: false,
        error: 'passenger_id requis'
      });
    }

    // IMPORTANT: Vérifier que le passager existe AVANT de créer le boarding_status
    // Sinon la foreign key constraint échoue
    const { data: passenger, error: passengerError } = await supabase
      .from('passengers')
      .select('id')
      .eq('id', passenger_id)
      .single();

    if (passengerError || !passenger) {
      console.warn('[Boarding] Passenger not found:', passenger_id);
      return res.status(404).json({
        success: false,
        error: 'Passager non trouvé - sync les passagers d\'abord'
      });
    }

    // Construire les données MINIMALES
    const boardingData: any = {
      passenger_id,
    };

    // Ajouter optionnellement les autres champs SEULEMENT s'ils existent
    if (boarded_at) {
      boardingData.boarded_at = boarded_at;
    }

    if (boarded_by) {
      boardingData.boarded_by = boarded_by;
    }

    console.log('[Boarding] upserting with data:', boardingData);

    const { data: boarding, error: boardingError } = await supabase
      .from('boarding_status')
      .upsert(boardingData, {
        onConflict: 'passenger_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (boardingError) {
      console.error('[Boarding] Supabase error:', boardingError);
      throw boardingError;
    }

    console.log('[Boarding] Success:', boarding);

    res.json({
      success: true,
      message: 'Embarquement synchronisé avec succès',
      data: boarding
    });
  } catch (error) {
    console.error('[Boarding] Error:', error);
    next(error);
  }
});

export default router;
