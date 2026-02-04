import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';
import { requireAirportCode } from '../middleware/airport-restriction.middleware';

const router = Router();

// GET /api/v1/rush/baggages - Liste des bagages RUSH
// GET /api/v1/rush/recent - Obtenir les derniers bagages RUSH
router.get('/recent', requireAirportCode, async (req: Request & { hasFullAccess?: boolean }, res: Response, next: NextFunction) => {
  try {
    const { airport } = req.query;
    const hasFullAccess = (req as any).hasFullAccess;
    const limit = 20; // Limiter aux 20 derniers bagages

    // Si l'utilisateur a un accès complet et demande ALL, ne pas filtrer par aéroport
    const filterByAirport = !(hasFullAccess && String(airport).toUpperCase() === 'ALL');
    const airportCode = filterByAirport ? airport : undefined;

    const rushBaggages: any[] = [];

    // Récupérer les bagages nationaux en RUSH
    const { data: nationalBags, error: nationalError } = await supabase
      .from('baggages')
      .select(`
        *,
        passengers (full_name, pnr, flight_number, departure, arrival)
      `)
      .eq('status', 'rush')
      .order('last_scanned_at', { ascending: false })
      .limit(limit);

    if (nationalError) throw nationalError;

    if (nationalBags) {
      // Filtrer par aéroport seulement si nécessaire
      const filtered = filterByAirport && airportCode
        ? nationalBags.filter((b: any) => {
            const pax = Array.isArray(b.passengers) ? b.passengers[0] : b.passengers;
            return b.current_location === airportCode || 
                   b.airport_code === airportCode ||
                   pax?.departure === airportCode || 
                   pax?.arrival === airportCode;
          })
        : nationalBags;

      rushBaggages.push(...filtered.map((b: any) => {
        const pax = Array.isArray(b.passengers) ? b.passengers[0] : b.passengers;
        return {
          id: b.id,
          tag_number: b.tag_number,
          flight_number: b.flight_number || pax?.flight_number,
          status: b.status,
          origin_airport: pax?.departure || b.airport_code,
          destination_airport: pax?.arrival || b.current_location,
          created_at: b.created_at,
          last_scanned_at: b.last_scanned_at,
          passengers: pax ? {
            full_name: pax.full_name,
            pnr: pax.pnr
          } : null,
          baggageType: 'national'
        };
      }));
    }

    // Récupérer les bagages internationaux en RUSH
    let query = supabase
      .from('international_baggages')
      .select('*')
      .eq('status', 'rush')
      .order('last_scanned_at', { ascending: false })
      .limit(limit);

    // Filtrer par aéroport seulement si nécessaire
    if (filterByAirport && airportCode) {
      query = query.or(`current_location.eq.${airportCode},airport_code.eq.${airportCode}`);
    }

    const { data: internationalBags, error: internationalError } = await query;

    if (internationalError) throw internationalError;

    if (internationalBags) {
      rushBaggages.push(...internationalBags.map(b => ({
        id: b.id,
        tag_number: b.tag_number,
        flight_number: b.flight_number,
        status: b.status,
        origin_airport: b.origin_airport || b.airport_code,
        destination_airport: b.destination_airport || b.current_location,
        created_at: b.created_at,
        last_scanned_at: b.last_scanned_at,
        passengers: b.passenger_name ? {
          full_name: b.passenger_name,
          pnr: b.pnr
        } : null,
        baggageType: 'international'
      })));
    }

    // Trier par date de création et limiter au nombre total voulu
    const sortedBaggages = rushBaggages
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, limit);

    res.json({
      success: true,
      count: sortedBaggages.length,
      data: sortedBaggages
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/rush/baggages - Liste des bagages RUSH
router.get('/baggages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport, type } = req.query; // type: 'national' | 'international' | 'all'

    const rushBaggages: any[] = [];

    // Bagages nationaux en RUSH
    if (!type || type === 'national') {
      const { data: nationalBags, error: nationalError } = await supabase
        .from('baggages')
        .select(`
          *,
          passengers (
            full_name,
            pnr,
            flight_number,
            departure,
            arrival
          )
        `)
        .eq('status', 'rush');

      if (nationalError) throw nationalError;

      if (nationalBags) {
        const filtered = airport 
          ? nationalBags.filter((b: any) => {
              // passengers peut être un tableau ou un objet
              const pax = Array.isArray(b.passengers) ? b.passengers[0] : b.passengers;
              // Inclure si: passager a departure/arrival = airport OU bagage a airport_code = airport
              return pax?.departure === airport || pax?.arrival === airport || b.airport_code === airport;
            })
          : nationalBags;

        rushBaggages.push(...filtered.map((b: any) => {
          // Normaliser passengers pour toujours être un objet
          const pax = Array.isArray(b.passengers) ? b.passengers[0] : b.passengers;
          return {
            ...b,
            passengers: pax,
            baggageType: 'national'
          };
        }));
      }
    }

    // Bagages internationaux en RUSH
    if (!type || type === 'international') {
      let query = supabase
        .from('international_baggages')
        .select('*')
        .eq('status', 'rush');

      if (airport) {
        query = query.eq('airport_code', airport);
      }

      const { data: internationalBags, error: internationalError } = await query;

      if (internationalError) throw internationalError;

      if (internationalBags) {
        rushBaggages.push(...internationalBags.map(b => ({
          ...b,
          baggageType: 'international'
        })));
      }
    }

    res.json({
      success: true,
      count: rushBaggages.length,
      data: rushBaggages
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/rush/declare - Déclarer un bagage en RUSH
router.post('/declare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      baggageId,
      tagNumber, // Nouveau: Support pour scan direct du tag
      baggageType, 
      reason, 
      nextFlightNumber, 
      remarks,
      userId,
      airportCode // Nouveau: Code aéroport pour le suivi
    } = req.body;

    // Vérifier les paramètres requis
    if ((!baggageId && !tagNumber) || !reason) {
      return res.status(400).json({
        success: false,
        error: 'baggageId/tagNumber et reason sont requis'
      });
    }

    let actualBaggageId = baggageId;
    let actualBaggageType = baggageType;

    // Si on a un tagNumber mais pas de baggageId, chercher le bagage
    if (!baggageId && tagNumber) {
      // Chercher d'abord dans les bagages nationaux
      const { data: nationalBag } = await supabase
        .from('baggages')
        .select('id')
        .eq('tag_number', tagNumber)
        .single();

      if (nationalBag) {
        actualBaggageId = nationalBag.id;
        actualBaggageType = 'national';
      } else {
        // Chercher dans les bagages internationaux
        const { data: internationalBag } = await supabase
          .from('international_baggages')
          .select('id')
          .eq('tag_number', tagNumber)
          .single();

        if (internationalBag) {
          actualBaggageId = internationalBag.id;
          actualBaggageType = 'international';
        } else {
          return res.status(404).json({
            success: false,
            error: `Bagage avec étiquette ${tagNumber} non trouvé. Le bagage doit d'abord être enregistré (checkin/embarquement).`
          });
        }
      }
    }

    // Mettre à jour le bagage selon son type
    const now = new Date().toISOString();
    if (actualBaggageType === 'national') {
      const { error } = await supabase
        .from('baggages')
        .update({ 
          status: 'rush', 
          updated_at: now,
          last_scanned_at: now,
          last_scanned_by: userId,
          current_location: airportCode
        })
        .eq('id', actualBaggageId);

      if (error) throw error;

      // Créer une entrée dans l'historique
      await supabase.from('baggage_history').insert({
        baggage_id: actualBaggageId,
        status: 'rush',
        location: airportCode,
        scanned_by: userId,
        remarks: `RUSH déclaré - ${reason}${nextFlightNumber ? ` - Prochain vol: ${nextFlightNumber}` : ''}`
      });
    } else if (actualBaggageType === 'international') {
      const remarkText = `RUSH: ${reason}${nextFlightNumber ? ` - Vol suivant: ${nextFlightNumber}` : ''}${remarks ? ` - ${remarks}` : ''}`;
      
      const { error } = await supabase
        .from('international_baggages')
        .update({ 
          status: 'rush', 
          remarks: remarkText,
          updated_at: now,
          last_scanned_at: now,
          last_scanned_by: userId,
          current_location: airportCode,
          next_flight: nextFlightNumber
        })
        .eq('id', actualBaggageId);

      if (error) throw error;

      // Créer une entrée dans l'historique
      await supabase.from('international_baggage_history').insert({
        baggage_id: actualBaggageId,
        status: 'rush',
        location: airportCode,
        scanned_by: userId,
        remarks: remarkText
      });
    }

    res.json({
      success: true,
      message: 'Bagage marqué comme RUSH avec succès'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/rush/statistics/:airport - Statistiques RUSH
router.get('/statistics/:airport', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport } = req.params;

    // Compter les bagages nationaux RUSH
    const { data: nationalBags, error: nationalError } = await supabase
      .from('baggages')
      .select(`
        *,
        passengers (departure, arrival)
      `)
      .eq('status', 'rush');

    if (nationalError) throw nationalError;

    const nationalCount = nationalBags?.filter((b: any) => {
      // passengers peut être un tableau ou un objet
      const pax = Array.isArray(b.passengers) ? b.passengers[0] : b.passengers;
      // Inclure si: passager a departure/arrival = airport OU bagage a airport_code = airport
      return pax?.departure === airport || pax?.arrival === airport || b.airport_code === airport;
    }).length || 0;

    // Compter les bagages internationaux RUSH
    const { data: internationalBags, error: internationalError } = await supabase
      .from('international_baggages')
      .select('*')
      .eq('airport_code', airport)
      .eq('status', 'rush');

    if (internationalError) throw internationalError;

    const internationalCount = internationalBags?.length || 0;

    // Compter ceux d'aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const todayCount = [
      ...(nationalBags?.filter((b: any) => {
        const pax = Array.isArray(b.passengers) ? b.passengers[0] : b.passengers;
        const matchesAirport = pax?.departure === airport || pax?.arrival === airport || b.airport_code === airport;
        return matchesAirport && b.updated_at >= todayISO;
      }) || []),
      ...(internationalBags?.filter((b: any) => b.updated_at >= todayISO) || [])
    ].length;

    res.json({
      success: true,
      data: {
        airportCode: airport,
        totalRush: nationalCount + internationalCount,
        nationalRush: nationalCount,
        internationalRush: internationalCount,
        rushToday: todayCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
