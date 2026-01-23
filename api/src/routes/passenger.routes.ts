import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';
import { requireAirportCode } from '../middleware/airport-restriction.middleware';
import { autoSyncIfNeeded } from '../services/auto-sync.service';

const router = Router();

/**
 * GET /api/v1/passengers
 * Récupérer tous les passagers avec filtres optionnels
 * RESTRICTION: Filtre automatiquement par aéroport de l'utilisateur
 * Paramètres: flight, pnr, date (format YYYY-MM-DD)
 */
router.get('/', requireAirportCode, async (req: Request & { userAirportCode?: string; hasFullAccess?: boolean }, res: Response, next: NextFunction) => {
  try {
    const { flight, pnr, date } = req.query;
    const airportCode = req.userAirportCode; // Peut être undefined si accès total
    
    // Auto-sync si la table est vide mais que des raw_scans existent
    if (airportCode) {
      await autoSyncIfNeeded(airportCode);
    }
    
    let query = supabase
      .from('passengers')
      .select('*, baggages(*), boarding_status(*)');
    
    // Filtrer par aéroport uniquement si l'utilisateur n'a pas accès total
    if (airportCode) {
      query = query.eq('airport_code', airportCode);
    }
    if (flight) {
      query = query.eq('flight_number', flight);
    }
    if (pnr) {
      query = query.eq('pnr', pnr.toString().toUpperCase());
    }
    // ✅ Filtrer par date si fournie
    if (date) {
      query = query.gte('checked_in_at', `${date}T00:00:00`)
              .lt('checked_in_at', `${date}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transformer les données pour le dashboard (snake_case -> camelCase)
    const transformedData = data?.map(passenger => ({
      id: passenger.id,
      fullName: passenger.full_name,
      pnr: passenger.pnr,
      flightNumber: passenger.flight_number,
      airline: passenger.airline || '',
      airline_code: passenger.airline_code || '',
      departure: passenger.departure,
      arrival: passenger.arrival,
      seatNumber: passenger.seat_number,
      baggageCount: passenger.baggage_count || 0,
      checkedInAt: passenger.checked_in_at,
      airportCode: passenger.airport_code,
      baggages: Array.isArray(passenger.baggages) ? passenger.baggages : [],
      // ⭐ IMPORTANT: Toujours retourner boarding_status comme un array
      // Même s'il y a une seule relation (UNIQUE constraint), on le met dans un array
      boarding_status: passenger.boarding_status ? [passenger.boarding_status] : []
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
 * GET /api/v1/passengers/all
 * SUPPORT ONLY: Récupérer TOUS les passagers de TOUS les aéroports (pas de filtrage)
 * ⭐ MUST BE BEFORE /:id route to avoid UUID parsing conflict
 */
router.get('/all', requireAirportCode, async (req: Request & { userAirportCode?: string; userRole?: string }, res: Response, next: NextFunction) => {
  try {
    // Vérifier que c'est un support
    const userRole = (req as any).userRole || req.headers['x-user-role'];
    if (userRole !== 'support') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Cette route est réservée au support.'
      });
    }

    let query = supabase
      .from('passengers')
      .select('*, baggages(*), boarding_status(*)');

    // PAS DE FILTRAGE PAR AÉROPORT - récupérer tous
    const { data, error } = await query;

    if (error) throw error;

    // Transformer les données
    const transformedData = data?.map(passenger => ({
      id: passenger.id,
      fullName: passenger.full_name,
      pnr: passenger.pnr,
      flightNumber: passenger.flight_number,
      airline: passenger.airline || '',
      airline_code: passenger.airline_code || '',
      departure: passenger.departure,
      arrival: passenger.arrival,
      seatNumber: passenger.seat_number,
      baggageCount: passenger.baggages?.length || 0,
      checkedInAt: passenger.checked_in_at,
      airportCode: passenger.airport_code,
      baggages: passenger.baggages || [],
      boarding_status: Array.isArray(passenger.boarding_status) ? passenger.boarding_status : [passenger.boarding_status].filter(Boolean)
    })) || [];

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/passengers/:id
 * Récupérer un passager spécifique
 * RESTRICTION: Vérifie que le passager appartient à l'aéroport de l'utilisateur
 */
router.get('/:id', requireAirportCode, async (req: Request & { userAirportCode?: string; hasFullAccess?: boolean }, res, next) => {
  try {
    const { id } = req.params;
    const airportCode = req.userAirportCode; // Peut être undefined si accès total
    const hasFullAccess = (req as any).hasFullAccess;

    let query = supabase
      .from('passengers')
      .select('*, baggages(*), boarding_status(*)')
      .eq('id', id);

    // Filtrer par aéroport uniquement si l'utilisateur n'a pas accès total
    if (airportCode && !hasFullAccess) {
      query = query.eq('airport_code', airportCode);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Passenger not found or access denied'
        });
      }
      throw error;
    }

    // Vérification de sécurité si l'utilisateur n'a pas accès total
    if (!hasFullAccess && airportCode && data && data.airport_code !== airportCode) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé : Ce passager n\'appartient pas à votre aéroport'
      });
    }

    // Transformer les données pour cohérence avec l'endpoint GET /
    const transformedPassenger = {
      id: data.id,
      fullName: data.full_name,
      pnr: data.pnr,
      flightNumber: data.flight_number,
      departure: data.departure,
      arrival: data.arrival,
      seatNumber: data.seat_number,
      baggageCount: data.baggage_count || 0,
      checkedInAt: data.checked_in_at,
      airportCode: data.airport_code,
      baggages: Array.isArray(data.baggages) ? data.baggages : [],
      // ⭐ IMPORTANT: Toujours retourner boarding_status comme un array
      boarding_status: data.boarding_status ? [data.boarding_status] : []
    };

    res.json({
      success: true,
      data: transformedPassenger
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
 * RESTRICTION: Vérifie que le vol est programmé et que l'aéroport correspond
 */
router.post('/', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const passengerData = req.body;
    const airport = req.query.airport as string || passengerData.airport_code;

    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis'
      });
    }

    // VALIDATION: Vérifier que le vol est programmé
    if (passengerData.flight_number) {
      const { validateFlightForScan } = await import('../middleware/scan-validation.middleware');
      const validation = await validateFlightForScan(passengerData.flight_number, airport);

      if (!validation.valid) {
        return res.status(403).json({
          success: false,
          error: validation.reason || 'Vol non programmé',
          rejected: true,
          flightNumber: passengerData.flight_number
        });
      }
    }

    // FORCER l'aéroport dans les données
    passengerData.airport_code = airport;

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
 * Gère les doublons en cherchant d'abord par (pnr, airport_code) avant d'insérer
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

    const results: any[] = [];

    // Traiter chaque passager individuellement
    for (const passenger of passengers) {
      try {
        // Chercher d'abord si le passager existe
        const { data: existing, error: searchError } = await supabase
          .from('passengers')
          .select('id')
          .eq('pnr', passenger.pnr)
          .eq('airport_code', passenger.airport_code)
          .single();

        if (existing && !searchError) {
          // Passager existe, le mettre à jour
          const { data: updated, error: updateError } = await supabase
            .from('passengers')
            .update(passenger)
            .eq('id', existing.id)
            .select()
            .single();

          if (updateError) throw updateError;
          results.push(updated);
        } else {
          // Passager n'existe pas, l'insérer
          const { data: inserted, error: insertError } = await supabase
            .from('passengers')
            .insert([passenger])
            .select()
            .single();

          if (insertError) throw insertError;
          results.push(inserted);
        }
      } catch (passengerError) {
        console.error(`[Passengers/Sync] Erreur pour ${passenger.pnr}:`, passengerError);
        // Continuer avec le passager suivant, mais logger l'erreur
      }
    }

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/baggages/create
 * Créer un nouveau bagage pour un passager
 */
router.post('/baggages/create', requireAirportCode, async (req: Request & { userAirportCode?: string }, res: Response, next: NextFunction) => {
  try {
    const { passengerId, tag_number, weight, status } = req.body;

    if (!passengerId || !tag_number) {
      return res.status(400).json({
        success: false,
        error: 'passengerId et tag_number sont requis'
      });
    }

    // Insérer le bagage
    const { data, error } = await supabase
      .from('baggages')
      .insert({
        passenger_id: passengerId,
        tag_number,
        weight: weight || null,
        status: status || 'checked_in',
        checked_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        id: data.id,
        tag_number: data.tag_number,
        status: data.status,
        weight: data.weight
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/baggages/:id
 * Supprimer un bagage
 */
router.delete('/baggages/:id', requireAirportCode, async (req: Request & { userAirportCode?: string }, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('baggages')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Bagage supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/baggages/:id
 * Mettre à jour un bagage
 */
router.put('/baggages/:id', requireAirportCode, async (req: Request & { userAirportCode?: string }, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { tag_number, weight, status } = req.body;

    const updateData: any = {};
    if (tag_number) updateData.tag_number = tag_number;
    if (weight !== undefined) updateData.weight = weight;
    if (status) updateData.status = status;

    const { data, error } = await supabase
      .from('baggages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        id: data.id,
        tag_number: data.tag_number,
        status: data.status,
        weight: data.weight
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
