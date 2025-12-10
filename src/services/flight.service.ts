/**
 * Service de gestion des vols disponibles
 * Les vols sont chargés depuis les passagers enregistrés
 * Le superviseur peut ajouter des vols via le dashboard (flight_schedule)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREQUENT_FLIGHTS, FrequentFlight } from '../constants/flight-schedule';
import { AvailableFlight } from '../types/flight.types';
import { databaseServiceInstance } from './';

const STORAGE_KEYS = {
  API_URL: '@bfs:api_url',
  API_KEY: '@bfs:api_key',
};

class FlightService {
  /**
   * Récupère tous les vols disponibles pour un aéroport
   * Source : 1) Vols programmés (dashboard), 2) Passagers enregistrés
   */
  async getAvailableFlights(airportCode: string, date?: string): Promise<AvailableFlight[]> {
    const today = date || new Date().toISOString().split('T')[0];
    const flights = new Map<string, AvailableFlight>();

    // 1. Charger les vols programmés depuis le dashboard (API)
    try {
      const scheduledFlights = await this.getScheduledFlights(airportCode, today);
      for (const flight of scheduledFlights) {
        flights.set(flight.flightNumber, flight);
      }
      console.log(`[FlightService] ${scheduledFlights.length} vols programmés chargés`);
    } catch (error) {
      console.error('[FlightService] Erreur lors de la récupération des vols programmés:', error);
    }

    // 2. Charger les vols depuis les passagers enregistrés (mise à jour compteurs)
    try {
      const passengersFlights = await this.getFlightsFromPassengers(airportCode, today);
      for (const flight of passengersFlights) {
        if (flights.has(flight.flightNumber)) {
          // Mettre à jour les compteurs du vol programmé
          const existingFlight = flights.get(flight.flightNumber)!;
          existingFlight.passengerCount = flight.passengerCount;
          existingFlight.baggageCount = flight.baggageCount;
        } else {
          // Vol non programmé mais avec passagers (cas exceptionnel)
          flights.set(flight.flightNumber, flight);
        }
      }
      console.log(`[FlightService] ${passengersFlights.length} vols avec passagers chargés`);
    } catch (error) {
      console.error('[FlightService] Erreur lors de la récupération des vols passagers:', error);
    }

    return Array.from(flights.values()).sort((a, b) => 
      a.flightNumber.localeCompare(b.flightNumber)
    );
  }

  /**
   * Récupère les vols programmés depuis le dashboard (API)
   */
  private async getScheduledFlights(
    airportCode: string,
    date: string
  ): Promise<AvailableFlight[]> {
    try {
      const apiUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_URL);
      const apiKey = await AsyncStorage.getItem(STORAGE_KEYS.API_KEY);

      console.log('[FlightService] 🔍 Config API:', {
        apiUrl: apiUrl || 'NON CONFIGURÉ',
        apiKey: apiKey ? 'SET' : 'NON SET',
        airport: airportCode,
        date
      });

      if (!apiUrl) {
        console.warn('[FlightService] ⚠️ API URL non configurée - Re-login requis !');
        return [];
      }

      const url = `${apiUrl}/api/v1/flights?airport=${airportCode}&date=${date}`;
      console.log('[FlightService] 📡 Appel API:', url);

      const response = await fetch(url, {
        headers: {
          'x-api-key': apiKey || '',
          'Content-Type': 'application/json',
        },
      });

      console.log('[FlightService] 📥 Réponse API:', response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 404) {
          console.log('[FlightService] ℹ️ Aucun vol programmé pour cette date');
          return [];
        }
        const errorText = await response.text();
        console.error('[FlightService] ❌ Erreur HTTP:', response.status, errorText);
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      const flights = result.data || [];

      console.log('[FlightService] ✅ Vols programmés reçus:', flights.length);
      console.log('[FlightService] 📋 Données:', JSON.stringify(flights, null, 2));

      return flights.map((f: any) => ({
        flightNumber: f.flightNumber,
        airline: f.airline,
        airlineCode: f.airlineCode,
        departure: f.departure,
        arrival: f.arrival,
        scheduledTime: f.scheduledTime,
        passengerCount: 0,
        baggageCount: 0,
        source: 'scheduled' as const,
      }));
    } catch (error) {
      console.error('[FlightService] ❌ Erreur API scheduled flights:', error);
      return [];
    }
  }

  /**
   * Récupère les vols depuis les passagers enregistrés
   */
  private async getFlightsFromPassengers(
    airportCode: string,
    date: string
  ): Promise<AvailableFlight[]> {
    const db = databaseServiceInstance.getDatabase();
    if (!db) {
      return [];
    }

    try {
      const flights = await db.getAllAsync<{
        flight_number: string;
        airline: string | null;
        airline_code: string | null;
        departure: string;
        arrival: string;
        passenger_count: number;
        baggage_count: number;
      }>(`
        SELECT 
          p.flight_number,
          p.airline,
          p.airline_code,
          p.departure,
          p.arrival,
          COUNT(DISTINCT p.id) as passenger_count,
          COUNT(b.id) as baggage_count
        FROM passengers p
        LEFT JOIN baggages b ON b.passenger_id = p.id
        WHERE DATE(p.checked_in_at) = DATE(?)
          AND (p.departure = ? OR p.arrival = ?)
        GROUP BY p.flight_number, p.airline, p.airline_code, p.departure, p.arrival
        ORDER BY MIN(p.checked_in_at) ASC
      `, [date, airportCode, airportCode]);

      return flights.map(f => ({
        flightNumber: f.flight_number,
        airline: f.airline || '',
        airlineCode: f.airline_code || '',
        departure: f.departure,
        arrival: f.arrival,
        passengerCount: f.passenger_count,
        baggageCount: f.baggage_count,
        source: 'passengers' as const,
      }));
    } catch (error) {
      console.error('[FlightService] Erreur SQL:', error);
      return [];
    }
  }

  /**
   * Valide un numéro de vol saisi manuellement
   */
  validateFlightNumber(flightNumber: string): boolean {
    // Format : 2-3 lettres + 1-4 chiffres
    // Exemples : ET80, ET840, 9U404, KQ555
    const pattern = /^[A-Z0-9]{2,3}\s?\d{1,4}$/i;
    return pattern.test(flightNumber.trim());
  }

  /**
   * Récupère les détails d'un vol (hybride)
   */
  async getFlightDetails(flightNumber: string): Promise<AvailableFlight | null> {
    const cleanFlightNumber = flightNumber.trim().toUpperCase().replace(/\s+/g, '');

    // 1. Chercher dans les vols fréquents
    const frequentFlight = FREQUENT_FLIGHTS.find(
      (f: FrequentFlight) => f.flightNumber.replace(/\s+/g, '') === cleanFlightNumber
    );

    if (frequentFlight) {
      return {
        ...frequentFlight,
        source: 'frequent',
      };
    }

    // 2. Chercher dans les passagers du jour
    const db = databaseServiceInstance.getDatabase();
    if (!db) {
      return null;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const flight = await db.getFirstAsync<{
        flight_number: string;
        airline: string | null;
        airline_code: string | null;
        departure: string;
        arrival: string;
        passenger_count: number;
      }>(`
        SELECT 
          p.flight_number,
          p.airline,
          p.airline_code,
          p.departure,
          p.arrival,
          COUNT(DISTINCT p.id) as passenger_count
        FROM passengers p
        WHERE DATE(p.checked_in_at) = DATE(?)
          AND p.flight_number = ?
        GROUP BY p.flight_number, p.airline, p.airline_code, p.departure, p.arrival
        LIMIT 1
      `, [today, cleanFlightNumber]);

      if (flight) {
        return {
          flightNumber: flight.flight_number,
          airline: flight.airline || '',
          airlineCode: flight.airline_code || '',
          departure: flight.departure,
          arrival: flight.arrival,
          passengerCount: flight.passenger_count,
          source: 'passengers',
        };
      }
    } catch (error) {
      console.error('[FlightService] Erreur lors de la récupération des détails du vol:', error);
    }

    return null;
  }
}

export const flightService = new FlightService();
