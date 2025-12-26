import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';
import { requireAirportCode } from '../middleware/airport-restriction.middleware';

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

    // Récupérer tous les passagers
    let passQuery = supabase.from('passengers').select('*');
    if (!filterAirport) {
      passQuery = passQuery.eq('airport_code', airport.toUpperCase());
    }
    const { data: passengers, error: passError } = await passQuery;

    if (passError) throw passError;

    // Récupérer tous les bagages
    let bagQuery = supabase.from('baggages').select('*');
    if (!filterAirport) {
      bagQuery = bagQuery.eq('airport_code', airport.toUpperCase());
    }
    const { data: baggages, error: bagError } = await bagQuery;

    if (bagError) throw bagError;

    // Récupérer les statuts d'embarquement (via jointure avec passengers)
    let boardQuery = supabase.from('boarding_status').select('*, passengers!inner(airport_code)');
    if (!filterAirport) {
      boardQuery = boardQuery.eq('passengers.airport_code', airport.toUpperCase());
    }
    const { data: boardingStatuses, error: boardError } = await boardQuery;

    if (boardError) throw boardError;

    // Calculer les statistiques
    const totalPassengers = passengers?.length || 0;
    const totalBaggages = baggages?.length || 0;
    const boardedPassengers = boardingStatuses?.filter(bs => bs.boarded).length || 0;
    const arrivedBaggages = baggages?.filter(b => b.status === 'arrived').length || 0;
    const todayPassengers = passengers?.filter(p => p.checkedInAt?.startsWith(today)).length || 0;
    const todayBaggages = baggages?.filter(b => b.checkedAt?.startsWith(today)).length || 0;
    const uniqueFlights = [...new Set(passengers?.map(p => p.flightNumber) || [])];

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
    const todayPassengers = passengers?.filter(p => p.checkedInAt?.startsWith(today)).length || 0;
    const todayBaggages = baggages?.filter(b => b.checkedAt?.startsWith(today)).length || 0;

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
