import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';
import { requireAirportCode } from '../middleware/airport-restriction.middleware';
import { validateBaggageScan } from '../middleware/scan-validation.middleware';

const router = Router();

/**
 * GET /api/v1/baggage
 * Liste de tous les bagages avec filtres optionnels
 * RESTRICTION: Filtre automatiquement par aéroport de l'utilisateur
 */
router.get('/', requireAirportCode, async (req: Request & { userAirportCode?: string; hasFullAccess?: boolean }, res: Response, next: NextFunction) => {
  try {
    const { flight, status, airport } = req.query;
    const airportCode = airport || req.userAirportCode;
    
    let query = supabase
      .from('baggages')
      .select('*, passengers(*)');
    
    if (airportCode) {
      query = query.eq('airport_code', airportCode);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (flight) {
      query = query.eq('flight_number', flight);
    }

    const { data, error } = await query;

    if (error) throw error;

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
        checkedAt: baggage.checked_at,
        arrivedAt: baggage.arrived_at,
        deliveredAt: baggage.delivered_at,
        lastScannedAt: baggage.last_scanned_at,
        lastScannedBy: baggage.last_scanned_by,
        passengers: passenger ? {
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
 * RESTRICTION: Vérifie la limite de bagages selon le boarding pass
 */
router.post('/', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const baggageData = req.body;
    const { passenger_id, tag_number, airport_code } = baggageData;

    // Si un passenger_id est fourni, vérifier la limite de bagages
    if (passenger_id) {
      // Récupérer le passager avec son baggage_count
      const { data: passenger, error: passengerError } = await supabase
        .from('passengers')
        .select('id, baggage_count, airport_code, flight_number')
        .eq('id', passenger_id)
        .single();

      if (passengerError || !passenger) {
        return res.status(404).json({
          success: false,
          error: 'Passager non trouvé'
        });
      }

      // Vérifier que le passager appartient à l'aéroport
      if (passenger.airport_code !== airport_code) {
        return res.status(403).json({
          success: false,
          error: 'Ce passager n\'appartient pas à votre aéroport'
        });
      }

      // Compter les bagages existants pour ce passager (non autorisés manuellement)
      const { data: existingBaggages, error: countError } = await supabase
        .from('baggages')
        .select('id')
        .eq('passenger_id', passenger_id)
        .eq('manually_authorized', false);

      if (countError && process.env.NODE_ENV !== 'production') {
        console.error('Error counting baggages:', countError);
      }

      const currentBaggageCount = existingBaggages?.length || 0;

      const declaredCount = passenger.baggage_count || 0;
      const existingCount = currentBaggageCount || 0;

      // Si le nombre de bagages existants + 1 dépasse le nombre déclaré, créer une demande d'autorisation
      if (existingCount >= declaredCount) {
        // Récupérer le tag RFID
        const tagNumber = tag_number || baggageData.tag_number;
        
        if (!tagNumber) {
          return res.status(400).json({
            success: false,
            error: 'Le tag RFID est requis pour créer une demande d\'autorisation'
          });
        }

        const { data: existingRequest } = await supabase
          .from('baggage_authorization_requests')
          .select('id, status')
          .eq('rfid_tag', tagNumber)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingRequest) {
          return res.status(403).json({
            success: false,
            error: 'Une demande d\'autorisation est déjà en attente pour ce bagage',
            requiresAuthorization: true,
            authorizationRequestId: existingRequest.id,
            declaredCount,
            currentCount: existingCount,
            requestedCount: existingCount + 1
          });
        }

        // Créer une demande d'autorisation
        const { data: authRequest, error: authError } = await supabase
          .from('baggage_authorization_requests')
          .insert({
            passenger_id: passenger_id,
            rfid_tag: tagNumber,
            requested_baggage_count: existingCount + 1,
            declared_baggage_count: declaredCount,
            current_baggage_count: existingCount,
            status: 'pending',
            airport_code: airport_code,
            flight_number: passenger.flight_number
          })
          .select()
          .single();

        if (authError) {
          if (process.env.NODE_ENV !== 'production') {
          console.error('Error creating authorization request:', authError);
          }
          return res.status(500).json({
            success: false,
            error: 'Erreur lors de la création de la demande d\'autorisation'
          });
        }

        return res.status(403).json({
          success: false,
          error: `Nombre de bagages dépassé. Le boarding pass indique ${declaredCount} bagage(s), mais ${existingCount + 1} bagage(s) sont demandés. Une demande d'autorisation a été créée et sera examinée par le support.`,
          requiresAuthorization: true,
          authorizationRequestId: authRequest.id,
          declaredCount,
          currentCount: existingCount,
          requestedCount: existingCount + 1
        });
      }
    }

    // Si pas de dépassement ou pas de passenger_id, créer le bagage normalement
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
 * RESTRICTION: Vérifie que le bagage appartient à l'aéroport et que le vol est programmé
 */
router.post('/scan', requireAirportCode, validateBaggageScan, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tagNumber, location, scannedBy, airport_code } = req.body;

    if (!tagNumber) {
      return res.status(400).json({
        success: false,
        error: 'tagNumber is required'
      });
    }

    // Récupérer le bagage pour vérifier l'aéroport
    const { data: baggage, error: baggageError } = await supabase
      .from('baggages')
      .select('airport_code, flight_number, passenger_id')
      .eq('tag_number', tagNumber)
      .single();

    if (baggageError || !baggage) {
      return res.status(404).json({
        success: false,
        error: 'Bagage non trouvé'
      });
    }

    // Vérifier que le bagage appartient à l'aéroport
    if (baggage.airport_code !== airport_code) {
      return res.status(403).json({
        success: false,
        error: 'Ce bagage n\'appartient pas à votre aéroport'
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
      .eq('airport_code', airport_code) // Double sécurité
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
