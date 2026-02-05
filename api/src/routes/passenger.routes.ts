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
 * SUPPORT & LITIGE: Récupérer TOUS les passagers de TOUS les aéroports (pas de filtrage)
 * ⭐ MUST BE BEFORE /:id route to avoid UUID parsing conflict
 */
router.get('/all', requireAirportCode, async (req: Request & { userAirportCode?: string; userRole?: string }, res: Response, next: NextFunction) => {
  try {
    // Vérifier que c'est un support ou baggage_dispute (litige)
    const userRole = (req as any).userRole || req.headers['x-user-role'];
    if (userRole !== 'support' && userRole !== 'baggage_dispute') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Cette route est réservée au support et aux agents litiges.'
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
      baggageCount: passenger.baggage_count || 0,  // Nombre de bagages DÉCLARÉS
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
 * GET /api/v1/passengers/by-baggage-tag
 * Chercher un passager par son numero de tag bagage
 * Utilise pour lier les bagages aux passagers quand le passager n'est pas en cache local
 */
router.get('/by-baggage-tag', requireAirportCode, async (req: Request & { userAirportCode?: string }, res: Response, next: NextFunction) => {
  try {
    const { tag, airport } = req.query;
    const airportCode = airport?.toString() || req.userAirportCode;
    
    if (!tag) {
      return res.status(400).json({
        success: false,
        error: 'Le parametre tag est requis'
      });
    }
    
    const tagBase = tag.toString().replace(/\D/g, '').substring(0, 10);
    console.log(`[PASSENGER API] Recherche passager par tag: ${tagBase}, airport: ${airportCode}`);
    
    // Chercher un passager dont le baggage_base_number correspond
    let query = supabase
      .from('passengers')
      .select('*')
      .not('baggage_base_number', 'is', null);
    
    if (airportCode) {
      query = query.eq('airport_code', airportCode);
    }
    
    const { data: passengers, error } = await query;
    
    if (error) throw error;
    
    // Trouver le passager dont le tag correspond
    const tagBaseNum = parseInt(tagBase, 10);
    let foundPassenger = null;
    
    for (const passenger of passengers || []) {
      const passengerBaseNum = parseInt(passenger.baggage_base_number, 10);
      const baggageCount = passenger.baggage_count || 1;
      
      if (isNaN(passengerBaseNum)) continue;
      
      // Verifier si le tag scanne correspond a un des bagages attendus
      for (let i = 0; i < baggageCount; i++) {
        const expectedBaseNum = passengerBaseNum + i;
        if (tagBaseNum === expectedBaseNum) {
          foundPassenger = passenger;
          break;
        }
      }
      
      if (foundPassenger) break;
    }
    
    if (!foundPassenger) {
      return res.status(404).json({
        success: false,
        error: 'Aucun passager trouve pour ce tag'
      });
    }
    
    console.log(`[PASSENGER API] Passager trouve: ${foundPassenger.full_name} (PNR: ${foundPassenger.pnr})`);
    
    res.json({
      success: true,
      data: foundPassenger
    });
  } catch (error) {
    console.error('[PASSENGER API] Erreur recherche par tag:', error);
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
    const errors: any[] = [];

    // Traiter chaque passager individuellement
    for (const passenger of passengers) {
      try {
        // Nettoyer les données du passager - ne garder que les colonnes valides
        // Note: airline et airline_code n'existent pas dans la table passengers
        const cleanPassenger: any = {
          pnr: passenger.pnr,
          full_name: passenger.full_name,
          flight_number: passenger.flight_number,
          seat_number: passenger.seat_number,
          departure: passenger.departure,
          arrival: passenger.arrival,
          airport_code: passenger.airport_code,
          baggage_count: passenger.baggage_count || 0,
          baggage_base_number: passenger.baggage_base_number,
          checked_in_at: passenger.checked_in_at || new Date().toISOString()
        };

        // Chercher d'abord si le passager existe
        const { data: existing, error: searchError } = await supabase
          .from('passengers')
          .select('id')
          .eq('pnr', cleanPassenger.pnr)
          .eq('airport_code', cleanPassenger.airport_code)
          .single();

        if (existing && !searchError) {
          // Passager existe, le mettre à jour
          const { data: updated, error: updateError } = await supabase
            .from('passengers')
            .update(cleanPassenger)
            .eq('id', existing.id)
            .select()
            .single();

          if (updateError) {
            console.error(`[Passengers/Sync] Erreur UPDATE pour ${cleanPassenger.pnr}:`, updateError);
            errors.push({ pnr: cleanPassenger.pnr, error: updateError.message, action: 'update' });
          } else {
            results.push(updated);
            console.log(`[Passengers/Sync] ✅ Passager mis à jour: ${cleanPassenger.pnr}`);
          }
        } else {
          // Passager n'existe pas, l'insérer
          const { data: inserted, error: insertError } = await supabase
            .from('passengers')
            .insert([cleanPassenger])
            .select()
            .single();

          if (insertError) {
            console.error(`[Passengers/Sync] Erreur INSERT pour ${cleanPassenger.pnr}:`, insertError);
            errors.push({ pnr: cleanPassenger.pnr, error: insertError.message, action: 'insert' });
          } else {
            results.push(inserted);
            console.log(`[Passengers/Sync] ✅ Passager inséré: ${cleanPassenger.pnr}`);
          }
        }
      } catch (passengerError: any) {
        console.error(`[Passengers/Sync] Erreur inattendue pour ${passenger.pnr}:`, passengerError);
        errors.push({ pnr: passenger.pnr, error: passengerError.message || 'Erreur inconnue', action: 'unknown' });
      }
    }

    res.json({
      success: results.length > 0 || errors.length === 0,
      count: results.length,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/baggages/create
 * Créer un nouveau bagage pour un passager
 * Met à jour automatiquement baggage_count si nécessaire
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

    // Récupérer le passager avec ses bagages actuels
    const { data: passenger, error: passengerError } = await supabase
      .from('passengers')
      .select('id, baggage_count, baggages(id)')
      .eq('id', passengerId)
      .single();

    if (passengerError || !passenger) {
      return res.status(404).json({
        success: false,
        error: 'Passager non trouvé'
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

    // Mettre à jour baggage_count si nécessaire
    const currentBaggageCount = Array.isArray(passenger.baggages) ? passenger.baggages.length : 0;
    const newBaggageCount = currentBaggageCount + 1;
    const declaredCount = passenger.baggage_count || 0;

    if (newBaggageCount > declaredCount) {
      await supabase
        .from('passengers')
        .update({ baggage_count: newBaggageCount })
        .eq('id', passengerId);
    }

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
