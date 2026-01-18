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

/**
 * POST /api/v1/boarding/sync-hash
 * Synchroniser l'embarquement avec le hash du boarding pass
 * Au lieu d'envoyer le rawData (gros fichier), on envoie le hash SHA256
 * 
 * Body:
 * {
 *   scan_hash: "sha256_hash",
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
router.post('/sync-hash', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scan_hash, passenger_id, boarded_at, boarded_by, airport_code, pnr, full_name, flight_number } = req.body;

    // Validation basique
    if (!scan_hash || !passenger_id) {
      return res.status(400).json({
        success: false,
        error: 'scan_hash et passenger_id requis'
      });
    }

    // 1. Chercher le raw_scan par le hash
    const { data: rawScan, error: scanError } = await supabase
      .from('raw_scans')
      .select('*')
      .eq('scan_hash', scan_hash)
      .eq('airport_code', airport_code)
      .single();

    if (scanError && scanError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (c'est acceptable si le scan n'existe pas encore)
      throw scanError;
    }

    // 2. Mettre à jour ou créer le boarding_status
    let boardingData: any = {
      passenger_id,
      boarded: true,
      boarded_at: boarded_at || new Date().toISOString(),
      boarded_by: boarded_by || req.body.user_id,
      synced: true,
      created_at: new Date().toISOString(),
      scan_hash, // Stocker le hash pour traçabilité
    };

    const { data: boarding, error: boardingError } = await supabase
      .from('boarding_status')
      .upsert(boardingData, {
        onConflict: 'passenger_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (boardingError) throw boardingError;

    // 3. Mettre à jour le raw_scan avec le hash s'il existe
    if (rawScan) {
      await supabase
        .from('raw_scans')
        .update({
          status_boarding: true,
          boarding_at: boarded_at || new Date().toISOString(),
          boarding_by: boarded_by || req.body.user_id,
          synced: true,
        })
        .eq('id', rawScan.id);
    }

    // 4. Logger l'action d'audit
    try {
      await supabase
        .from('audit_logs')
        .insert({
          action: 'BOARDING_SYNC_HASH',
          entity_type: 'boarding_status',
          entity_id: boarding.id,
          description: `Embarquement synchronisé (hash) - PNR: ${pnr}, Vol: ${flight_number}, Nom: ${full_name}`,
          performed_by: boarded_by || req.body.user_id,
          airport_code,
          timestamp: new Date().toISOString(),
        });
    } catch (auditError) {
      console.warn('Audit log failed:', auditError);
      // Continue même si l'audit échoue
    }

    res.json({
      success: true,
      message: 'Embarquement synchronisé avec succès (hash)',
      data: boarding
    });
  } catch (error) {
    next(error);
  }
});

export default router;
