import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';
import { requireAirportCode } from '../middleware/airport-restriction.middleware';
import { autoSyncIfNeeded } from '../services/auto-sync.service';

const router = Router();


/**
 * GET /api/v1/stats/airport/:airport
 * Statistiques pour un aéroport spécifique
 * RESTRICTION: Vérifie que l'utilisateur a accès à cet aéroport
 */
router.get('/airport/:airport', requireAirportCode, async (req: Request & { hasFullAccess?: boolean; userAirportCode?: string }, res: Response, next: NextFunction) => {
  try {
    const { airport } = req.params;
    const hasFullAccess = (req as any).hasFullAccess;

    // Si l'aéroport demandé est ALL, ne pas filtrer par aéroport
    const today = new Date().toISOString().split('T')[0];
    const filterAirport = airport.toUpperCase() === 'ALL' && hasFullAccess;

    // ✅ AUTO-SYNC: Synchroniser automatiquement les raw_scans non traités
    autoSyncIfNeeded(airport.toUpperCase()).catch(err => 
      console.warn('[AUTO-SYNC] Erreur:', err)
    );

    // Récupérer les passagers D'AUJOURD'HUI SEULEMENT
    let passQuery = supabase.from('passengers').select('*')
      .gte('checked_in_at', `${today}T00:00:00`)
      .lt('checked_in_at', `${today}T23:59:59`);
    if (!filterAirport) {
      passQuery = passQuery.eq('airport_code', airport.toUpperCase());
    }
    const { data: passengers, error: passError } = await passQuery;

    if (passError) throw passError;

    // Récupérer les bagages D'AUJOURD'HUI SEULEMENT
    let bagQuery = supabase.from('baggages').select('*')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);
    if (!filterAirport) {
      bagQuery = bagQuery.eq('airport_code', airport.toUpperCase());
    }
    const { data: baggages, error: bagError } = await bagQuery;

    if (bagError) throw bagError;

    // Récupérer les statuts d'embarquement D'AUJOURD'HUI (via jointure avec passengers)
    let boardQuery = supabase.from('boarding_status').select('*, passengers!inner(airport_code, checked_in_at)')
      .gte('passengers.checked_in_at', `${today}T00:00:00`)
      .lt('passengers.checked_in_at', `${today}T23:59:59`);
    if (!filterAirport) {
      boardQuery = boardQuery.eq('passengers.airport_code', airport.toUpperCase());
    }
    const { data: boardingStatuses, error: boardError } = await boardQuery;

    if (boardError) throw boardError;

    // Récupérer les vols programmés aujourd'hui depuis flight_schedule
    let scheduledFlightsQuery = supabase
      .from('flight_schedule')
      .select('flight_number')
      .eq('scheduled_date', today)
      .in('status', ['scheduled', 'boarding', 'departed']);
    
    if (!filterAirport) {
      scheduledFlightsQuery = scheduledFlightsQuery.eq('airport_code', airport.toUpperCase());
    }
    
    const { data: scheduledFlights } = await scheduledFlightsQuery;
    
    // Calculer les statistiques (déjà filtrées par aujourd'hui)
    const totalPassengers = passengers?.length || 0;
    const totalBaggages = baggages?.length || 0;
    const boardedPassengers = boardingStatuses?.filter(bs => bs.boarded).length || 0;
    const arrivedBaggages = baggages?.filter(b => b.status === 'arrived').length || 0;
    // todayPassengers et todayBaggages sont maintenant égaux aux totaux car on filtre déjà par aujourd'hui
    const todayPassengers = totalPassengers;
    const todayBaggages = totalBaggages;
    
    // Combiner les vols des passagers ET les vols programmés
    const flightsFromPassengers = passengers?.map(p => p.flight_number) || [];
    const flightsFromSchedule = scheduledFlights?.map(f => f.flight_number) || [];
    const uniqueFlights = [...new Set([...flightsFromPassengers, ...flightsFromSchedule])];

    res.json({
      success: true,
      data: {
        airportCode: airport,
        totalPassengers,
        totalBaggages,
        boardedPassengers,
        notBoardedPassengers: totalPassengers - boardedPassengers,
        arrivedBaggages,
        inTransitBaggages: totalBaggages - arrivedBaggages,
        todayPassengers,
        todayBaggages,
        flightsCount: uniqueFlights.length,
        uniqueFlights,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/stats/recent/:airport
 * Données récentes parsées (passagers, bagages, activités)
 * Pour affichage détaillé dans le dashboard
 */
router.get('/recent/:airport', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const today = new Date().toISOString().split('T')[0];
    const filterByAirport = airport.toUpperCase() !== 'ALL';

    // 1. Passagers récents (tous, pas seulement aujourd'hui) avec infos parsées
    let passQuery = supabase
      .from('passengers')
      .select(`
        id, 
        pnr, 
        full_name, 
        flight_number, 
        departure, 
        arrival, 
        baggage_count,
        checked_in_at
      `)
      .order('checked_in_at', { ascending: false })
      .limit(limit);
    
    if (filterByAirport) {
      passQuery = passQuery.eq('airport_code', airport.toUpperCase());
    }
    
    const { data: recentPassengers, error: passError } = await passQuery;

    if (passError) throw passError;

    // 2. Bagages récents - inclure les infos passagers
    let bagQuery = supabase
      .from('baggages')
      .select(`
        id,
        tag_number,
        status,
        weight,
        checked_at,
        arrived_at,
        passenger_id,
        passengers!passenger_id (
          full_name,
          pnr,
          flight_number,
          departure,
          arrival
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (filterByAirport) {
      bagQuery = bagQuery.eq('airport_code', airport.toUpperCase());
    }
    
    const { data: recentBaggages, error: bagError } = await bagQuery;

    // Ignorer les erreurs de bagages pour ne pas bloquer la route
    if (bagError) {
      console.warn('Baggage query error:', bagError.message);
    }

    // 3. Activités récentes (audit log) - requête simplifiée
    let actQuery = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (filterByAirport) {
      actQuery = actQuery.eq('airport_code', airport.toUpperCase());
    }
    
    const { data: recentActivities, error: actError } = await actQuery;

    // Transformer les données pour l'affichage
    const formattedPassengers = recentPassengers?.map(p => ({
      id: p.id,
      pnr: p.pnr,
      fullName: p.full_name,
      flightNumber: p.flight_number,
      route: `${p.departure} → ${p.arrival}`,
      baggageCount: p.baggage_count || 0,
      checkedInAt: p.checked_in_at,
    })) || [];

    const formattedBaggages = recentBaggages?.map((b: any) => ({
      id: b.id,
      tagNumber: b.tag_number || b.id,
      status: b.status || 'unknown',
      weight: b.weight,
      checkedAt: b.checked_at,
      arrivedAt: b.arrived_at,
      passenger: b.passengers ? {
        fullName: b.passengers.full_name,
        pnr: b.passengers.pnr,
        flightNumber: b.passengers.flight_number,
        route: `${b.passengers.departure} → ${b.passengers.arrival}`
      } : null
    })) || [];

    const formattedActivities = recentActivities?.map(a => ({
      id: a.id,
      action: a.action,
      entityType: a.entity_type,
      details: a.details,
      createdAt: a.created_at,
      userId: a.user_id,
    })) || [];

    res.json({
      success: true,
      data: {
        recentPassengers: formattedPassengers,
        recentBaggages: formattedBaggages,
        recentActivities: formattedActivities,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/stats/flights/:airport
 * Vols du jour avec statistiques détaillées par vol
 */
router.get('/flights/:airport', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const filterByAirport = airport.toUpperCase() !== 'ALL';

    // Récupérer les vols programmés SEULEMENT POUR AUJOURD'HUI (pas demain)
    let flightQuery = supabase
      .from('flight_schedule')
      .select('*')
      .eq('scheduled_date', today)
      .in('status', ['scheduled', 'boarding', 'departed'])
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });
    
    if (filterByAirport) {
      flightQuery = flightQuery.eq('airport_code', airport.toUpperCase());
    }
    
    const { data: scheduledFlights, error: flightError } = await flightQuery;

    if (flightError) throw flightError;

    // Pour chaque vol, récupérer les stats de passagers et bagages
    const flightsWithStats = await Promise.all(
      (scheduledFlights || []).map(async (flight) => {
        // Normaliser le numéro de vol pour la comparaison
        // Ex: "ET64" -> pattern pour matcher "ET64", "ET0064", "ET064"
        const flightNum = flight.flight_number.trim().toUpperCase();
        const companyCode = flightNum.match(/^([A-Z]{2})/)?.[1] || '';
        const numericPart = flightNum.replace(/^[A-Z]{2}0*/, ''); // Enlever le code et les zéros
        
        // Pattern pour matcher avec ou sans zéros: ET64, ET064, ET0064
        const flightPattern = `${companyCode}%${numericPart}`;

        // Compter les passagers de ce vol POUR AUJOURD'HUI UNIQUEMENT
        let passCountQuery = supabase
          .from('passengers')
          .select('*', { count: 'exact', head: true })
          .ilike('flight_number', flightPattern)
          .gte('checked_in_at', `${today}T00:00:00`)
          .lt('checked_in_at', `${today}T23:59:59`);
        
        if (filterByAirport) {
          passCountQuery = passCountQuery.eq('airport_code', airport.toUpperCase());
        }
        
        const { count: passengerCount } = await passCountQuery;

        // Compter les passagers embarqués POUR AUJOURD'HUI
        // D'abord récupérer les IDs des passagers de ce vol enregistrés aujourd'hui
        let passengersQuery = supabase
          .from('passengers')
          .select('id')
          .ilike('flight_number', flightPattern)
          .gte('checked_in_at', `${today}T00:00:00`)
          .lt('checked_in_at', `${today}T23:59:59`);
        
        if (filterByAirport) {
          passengersQuery = passengersQuery.eq('airport_code', airport.toUpperCase());
        }
        
        const { data: flightPassengers } = await passengersQuery;
        const passengerIds = flightPassengers?.map(p => p.id) || [];
        
        let boardedCount = 0;
        if (passengerIds.length > 0) {
          const { count } = await supabase
            .from('boarding_status')
            .select('*', { count: 'exact', head: true })
            .eq('boarded', true)
            .in('passenger_id', passengerIds);
          boardedCount = count || 0;
        }

        // Compter les bagages de ce vol POUR AUJOURD'HUI UNIQUEMENT
        let bagCountQuery = supabase
          .from('baggages')
          .select('*', { count: 'exact', head: true })
          .ilike('flight_number', flightPattern)
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`);
        
        if (filterByAirport) {
          bagCountQuery = bagCountQuery.eq('airport_code', airport.toUpperCase());
        }
        
        const { count: baggageCount } = await bagCountQuery;

        return {
          id: flight.id,
          flightNumber: flight.flight_number,
          airline: flight.airline,
          airlineCode: flight.airline_code,
          departure: flight.departure,
          arrival: flight.arrival,
          scheduledTime: flight.scheduled_time,
          status: flight.status,
          flightType: flight.flight_type || 'departure',
          baggageRestriction: flight.baggage_restriction || 'block',
          stats: {
            totalPassengers: passengerCount || 0,
            boardedPassengers: boardedCount,
            totalBaggages: baggageCount || 0,
            boardingProgress: passengerCount ? Math.round((boardedCount / passengerCount) * 100) : 0,
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        flights: flightsWithStats,
        totalFlights: flightsWithStats.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/stats/global
 * Statistiques globales de tous les aéroports
 * RESTRICTION: Réservé aux superviseurs uniquement
 */
router.get('/global', requireAirportCode, async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: passengers, error: passError } = await supabase
      .from('passengers')
      .select('*');

    if (passError) throw passError;

    const { data: baggages, error: bagError } = await supabase
      .from('baggages')
      .select('*');

    if (bagError) throw bagError;

    const { data: boardingStatuses, error: boardError } = await supabase
      .from('boarding_status')
      .select('*');

    if (boardError) throw boardError;

    const totalPassengers = passengers?.length || 0;
    const totalBaggages = baggages?.length || 0;
    const boardedPassengers = boardingStatuses?.filter(bs => bs.boarded).length || 0;
    const arrivedBaggages = baggages?.filter(b => b.status === 'arrived').length || 0;
    const todayPassengers = passengers?.filter(p => p.checked_in_at?.startsWith(today)).length || 0;
    const todayBaggages = baggages?.filter(b => b.created_at?.startsWith(today)).length || 0;

    // Grouper par aéroport
    const airportStats = passengers?.reduce((acc: any, p) => {
      if (!acc[p.airportCode]) {
        acc[p.airportCode] = {
          passengers: 0,
          baggages: 0
        };
      }
      acc[p.airportCode].passengers++;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalPassengers,
        totalBaggages,
        boardedPassengers,
        notBoardedPassengers: totalPassengers - boardedPassengers,
        arrivedBaggages,
        inTransitBaggages: totalBaggages - arrivedBaggages,
        todayPassengers,
        todayBaggages,
        airportStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
