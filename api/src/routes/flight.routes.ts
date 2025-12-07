import express from 'express';
import { supabase } from '../config/database';

const router = express.Router();

/**
 * GET /api/v1/flights
 * Liste de tous les vols
 */
router.get('/', async (req, res, next) => {
  try {
    const { airport } = req.query;

    let query = supabase
      .from('passengers')
      .select('flight_number, departure, arrival, checked_in_at, airport_code');

    if (airport) {
      query = query.eq('airport_code', airport);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Grouper par numéro de vol
    const flightsMap = new Map();
    data?.forEach(passenger => {
      if (!flightsMap.has(passenger.flight_number)) {
        flightsMap.set(passenger.flight_number, {
          flightNumber: passenger.flight_number,
          departure: passenger.departure,
          arrival: passenger.arrival,
          airportCode: passenger.airport_code,
          passengerCount: 0,
          firstCheckin: passenger.checked_in_at
        });
      }
      const flight = flightsMap.get(passenger.flight_number);
      flight.passengerCount++;
      if (passenger.checked_in_at < flight.firstCheckin) {
        flight.firstCheckin = passenger.checked_in_at;
      }
    });

    const flights = Array.from(flightsMap.values());

    res.json({
      success: true,
      count: flights.length,
      data: flights
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/flights/:flightNumber
 * Détails d'un vol spécifique
 */
router.get('/:flightNumber', async (req, res, next) => {
  try {
    const { flightNumber } = req.params;

    const { data: passengers, error: passError } = await supabase
      .from('passengers')
      .select('*, baggages(*), boarding_status(*)')
      .eq('flight_number', flightNumber);

    if (passError) throw passError;

    if (!passengers || passengers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Flight not found'
      });
    }

    const totalPassengers = passengers.length;
    const boardedPassengers = passengers.filter(p => 
      p.boarding_status && p.boarding_status.length > 0 && p.boarding_status[0].boarded
    ).length;
    const totalBaggages = passengers.reduce((sum, p) => sum + (p.baggages?.length || 0), 0);

    res.json({
      success: true,
      data: {
        flightNumber,
        departure: passengers[0].departure,
        arrival: passengers[0].arrival,
        airportCode: passengers[0].airport_code,
        totalPassengers,
        boardedPassengers,
        notBoardedPassengers: totalPassengers - boardedPassengers,
        totalBaggages,
        passengers
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
