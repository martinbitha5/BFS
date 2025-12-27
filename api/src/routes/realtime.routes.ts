import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';
import { requireAirportCode } from '../middleware/airport-restriction.middleware';
import { realtimeService, SSE_EVENTS } from '../services/realtime.service';

const router = Router();

// Génère un ID unique simple sans dépendance externe
function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * GET /api/v1/realtime/subscribe/:airport
 * SSE endpoint pour recevoir les mises à jour en temps réel
 * Note: L'authentification est faite via query params car EventSource ne supporte pas les headers
 */
router.get('/subscribe/:airport', (req: Request, res: Response) => {
  const { airport } = req.params;
  const { token, api_key } = req.query;
  const clientId = generateClientId();

  // Authentification simplifiée pour SSE (via query params)
  // En production, vous pouvez ajouter une vérification JWT ici
  if (!token && !api_key) {
    console.warn(`SSE: Connexion sans authentification pour ${airport}`);
    // Continuer quand même - l'authentification peut être optionnelle
  }

  // Configuration des headers SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Pour nginx
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Envoyer un événement de connexion initial
  const initData = {
    clientId,
    airportCode: airport.toUpperCase(),
    connectedAt: new Date().toISOString(),
    message: 'Connexion SSE établie - Mises à jour en temps réel activées',
  };
  res.write(`event: connected\ndata: ${JSON.stringify(initData)}\n\n`);

  // Enregistrer le client
  realtimeService.addClient(clientId, res, airport);

  // Envoyer les stats initiales immédiatement
  fetchAndSendStats(airport.toUpperCase(), res);

  // Gérer la déconnexion
  req.on('close', () => {
    realtimeService.removeClient(clientId);
  });
});

/**
 * GET /api/v1/realtime/stats
 * Retourne les stats du service SSE
 */
router.get('/stats', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: realtimeService.getStats(),
  });
});

/**
 * POST /api/v1/realtime/trigger/:airport
 * Déclenche une mise à jour manuelle pour un aéroport
 * (utile pour le bouton "Actualiser" du dashboard)
 */
router.post('/trigger/:airport', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport } = req.params;
    const airportCode = airport.toUpperCase();

    // Récupérer les stats
    const statsData = await getAirportStats(airportCode);
    
    // Broadcaster à tous les clients
    realtimeService.broadcast(airportCode, SSE_EVENTS.STATS_UPDATE, statsData);

    res.json({
      success: true,
      message: `Mise à jour diffusée à ${realtimeService.getClientCount()} client(s)`,
      data: statsData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Fonction helper pour récupérer et envoyer les stats
 */
async function fetchAndSendStats(airportCode: string, res: Response): Promise<void> {
  try {
    const statsData = await getAirportStats(airportCode);
    res.write(`event: ${SSE_EVENTS.STATS_UPDATE}\ndata: ${JSON.stringify(statsData)}\n\n`);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des stats:', error);
  }
}

/**
 * Fonction pour récupérer les statistiques d'un aéroport
 */
async function getAirportStats(airportCode: string): Promise<any> {
  const today = new Date().toISOString().split('T')[0];
  const filterAirport = airportCode !== 'ALL';

  // Requêtes parallèles pour optimiser les performances
  const [passengersResult, baggagesResult, boardingResult, rawScansResult, flightsResult] = await Promise.all([
    // Passagers
    filterAirport
      ? supabase.from('passengers').select('*').eq('airport_code', airportCode)
      : supabase.from('passengers').select('*'),
    
    // Bagages
    filterAirport
      ? supabase.from('baggages').select('*').eq('airport_code', airportCode)
      : supabase.from('baggages').select('*'),
    
    // Boarding statuses
    filterAirport
      ? supabase.from('boarding_status').select('*, passengers!inner(airport_code)').eq('passengers.airport_code', airportCode)
      : supabase.from('boarding_status').select('*'),
    
    // Raw scans stats
    filterAirport
      ? supabase.from('raw_scans').select('scan_type, status').eq('airport_code', airportCode)
      : supabase.from('raw_scans').select('scan_type, status'),
    
    // Vols du jour
    filterAirport
      ? supabase.from('flight_schedule').select('*').eq('scheduled_date', today).eq('airport_code', airportCode)
      : supabase.from('flight_schedule').select('*').eq('scheduled_date', today),
  ]);

  const passengers = passengersResult.data || [];
  const baggages = baggagesResult.data || [];
  const boardingStatuses = boardingResult.data || [];
  const rawScans = rawScansResult.data || [];
  const flights = flightsResult.data || [];

  // Calculer les statistiques
  const totalPassengers = passengers.length;
  const totalBaggages = baggages.length;
  const boardedPassengers = boardingStatuses.filter(bs => bs.boarded).length;
  const arrivedBaggages = baggages.filter(b => b.status === 'arrived').length;
  const todayPassengers = passengers.filter(p => p.checked_in_at?.startsWith(today)).length;
  const todayBaggages = baggages.filter(b => b.created_at?.startsWith(today)).length;
  const uniqueFlights = [...new Set(passengers.map(p => p.flight_number).filter(Boolean))];

  // Raw scans stats
  const rawScansStats = {
    total: rawScans.length,
    by_type: {
      boarding_pass: rawScans.filter(s => s.scan_type === 'boarding_pass').length,
      baggage_tag: rawScans.filter(s => s.scan_type === 'baggage_tag').length,
    },
    by_status: {
      checkin: rawScans.filter(s => s.status === 'checkin').length,
      baggage: rawScans.filter(s => s.status === 'baggage').length,
      boarding: rawScans.filter(s => s.status === 'boarding').length,
      arrival: rawScans.filter(s => s.status === 'arrival').length,
    },
  };

  return {
    airportCode,
    stats: {
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
    },
    rawScansStats,
    flightsCount: flights.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Export de la fonction pour être utilisée par d'autres routes
 * (ex: lors de l'ajout d'un passager, bagage, etc.)
 */
export async function notifyStatsUpdate(airportCode: string): Promise<void> {
  try {
    const statsData = await getAirportStats(airportCode);
    realtimeService.broadcast(airportCode, SSE_EVENTS.STATS_UPDATE, statsData);
  } catch (error) {
    console.error('Erreur lors de la notification SSE:', error);
  }
}

/**
 * Notifier d'un nouveau passager
 */
export function notifyNewPassenger(airportCode: string, passenger: any): void {
  realtimeService.broadcast(airportCode, SSE_EVENTS.NEW_PASSENGER, {
    passenger,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notifier d'un nouveau bagage
 */
export function notifyNewBaggage(airportCode: string, baggage: any): void {
  realtimeService.broadcast(airportCode, SSE_EVENTS.NEW_BAGGAGE, {
    baggage,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notifier d'un scan brut
 */
export function notifyRawScan(airportCode: string, scan: any): void {
  realtimeService.broadcast(airportCode, SSE_EVENTS.RAW_SCAN, {
    scan,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notifier d'une mise à jour d'embarquement
 */
export function notifyBoardingUpdate(airportCode: string, update: any): void {
  realtimeService.broadcast(airportCode, SSE_EVENTS.BOARDING_UPDATE, {
    ...update,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notifier de la fin d'une synchronisation
 */
export function notifySyncComplete(airportCode: string, syncStats: any): void {
  realtimeService.broadcast(airportCode, SSE_EVENTS.SYNC_COMPLETE, {
    syncStats,
    timestamp: new Date().toISOString(),
  });
}

export default router;

