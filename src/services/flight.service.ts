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
   * Normalise un numéro de vol en supprimant les zéros non significatifs
   * ET0064 -> ET64, 9U0404 -> 9U404
   */
  normalizeFlightNumber(flightNumber: string): string {
    if (!flightNumber) return '';
    // Code compagnie = 2 caractères (lettre+lettre/chiffre OU chiffre+lettre)
    // Ex: ET, KQ, 9U, 5J - PAS 3 caractères
    const match = flightNumber.match(/^([A-Z][A-Z0-9]|[0-9][A-Z])\s*0*([1-9]\d*)$/i);
    if (match) {
      return `${match[1].toUpperCase()}${match[2]}`;
    }
    // Cas spécial: vol "0"
    const zeroMatch = flightNumber.match(/^([A-Z][A-Z0-9]|[0-9][A-Z])\s*(0+)$/i);
    if (zeroMatch) {
      return `${zeroMatch[1].toUpperCase()}0`;
    }
    return flightNumber.toUpperCase().replace(/\s+/g, '');
  }

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
        // Utiliser le numéro normalisé comme clé pour éviter les doublons
        const normalizedKey = this.normalizeFlightNumber(flight.flightNumber);
        flights.set(normalizedKey, { ...flight, flightNumber: normalizedKey });
      }
      console.log(`[FlightService] ${scheduledFlights.length} vols programmés chargés`);
    } catch (error) {
      console.error('[FlightService] Erreur lors de la récupération des vols programmés:', error);
    }

    // 2. Charger les vols depuis les passagers enregistrés (mise à jour compteurs)
    try {
      const passengersFlights = await this.getFlightsFromPassengers(airportCode, today);
      for (const flight of passengersFlights) {
        const normalizedKey = this.normalizeFlightNumber(flight.flightNumber);
        if (flights.has(normalizedKey)) {
          // Mettre à jour les compteurs du vol programmé
          const existingFlight = flights.get(normalizedKey)!;
          existingFlight.passengerCount = flight.passengerCount;
          existingFlight.baggageCount = flight.baggageCount;
        } else {
          // Vol non programmé mais avec passagers (cas exceptionnel)
          flights.set(normalizedKey, { ...flight, flightNumber: normalizedKey });
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

  /**
   * Vérifie si un vol est programmé pour aujourd'hui via l'API
   * @param flightNumber - Numéro de vol extrait du boarding pass
   * @param airportCode - Code aéroport de l'agent
   * @returns { isValid: boolean, flight?: AvailableFlight, reason?: string }
   */
  async validateFlightForToday(
    flightNumber: string,
    airportCode: string,
    departure?: string,
    arrival?: string
  ): Promise<{ isValid: boolean; flight?: AvailableFlight; reason?: string }> {
    try {
      const apiUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_URL);
      const apiKey = await AsyncStorage.getItem(STORAGE_KEYS.API_KEY);

      console.log('[FlightService] 🔍 Validation vol:', {
        flightNumber,
        airportCode,
        departure,
        arrival,
        apiUrl: apiUrl ? '✅ SET' : '❌ NOT SET',
        apiKey: apiKey ? '✅ SET' : '❌ NOT SET'
      });

      if (!apiUrl) {
        console.warn('[FlightService] ⚠️ API URL non configurée - validation locale uniquement');
        // Fallback: valider localement avec les vols du jour
        return this.validateFlightLocally(flightNumber, airportCode);
      }

      const url = `${apiUrl}/api/v1/flights/validate-boarding`;
      console.log('[FlightService] 📡 Appel API:', url);
      console.log('[FlightService] 📤 Envoi:', {
        flightNumber,
        airportCode,
        departure,
        arrival,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flightNumber,
          airportCode,
          departure,
          arrival,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FlightService] ❌ Erreur HTTP:', response.status, errorText);
        // En cas d'erreur API, fallback local
        return this.validateFlightLocally(flightNumber, airportCode);
      }

      const result = await response.json();
      console.log('[FlightService] 📥 Réponse validation:', {
        success: result.success,
        isValid: result.isValid,
        reason: result.reason,
        flight: result.flight ? `${result.flight.flightNumber} (${result.flight.departure}->${result.flight.arrival})` : null
      });

      if (result.isValid && result.flight) {
        console.log('[FlightService] ✅ Vol validé:', result.flight.flightNumber);
        return {
          isValid: true,
          flight: {
            flightNumber: result.flight.flightNumber,
            airline: result.flight.airline || '',
            airlineCode: result.flight.airlineCode || '',
            departure: result.flight.departure,
            arrival: result.flight.arrival,
            source: 'schedule',
          },
        };
      }

      console.log('[FlightService] ❌ Vol rejeté:', result.reason);
      return {
        isValid: false,
        reason: result.reason || `Le vol ${flightNumber} n'est pas programmé pour aujourd'hui.`,
      };
    } catch (error) {
      console.error('[FlightService] ❌ Erreur validation vol:', error);
      // En cas d'erreur, fallback local
      return this.validateFlightLocally(flightNumber, airportCode);
    }
  }

  /**
   * Validation locale des vols (fallback si API indisponible)
   */
  private async validateFlightLocally(
    flightNumber: string,
    airportCode: string
  ): Promise<{ isValid: boolean; flight?: AvailableFlight; reason?: string }> {
    console.log('[FlightService] 🔄 Validation locale du vol...');

    try {
      // Charger les vols disponibles du jour
      const availableFlights = await this.getAvailableFlights(airportCode);

      if (availableFlights.length === 0) {
        // Aucun vol programmé = BLOQUER le scan
        console.log('[FlightService] ❌ Aucun vol programmé - SCAN BLOQUÉ');
        return {
          isValid: false,
          reason: 'AUCUN VOL PROGRAMMÉ POUR AUJOURD\'HUI. Contactez le superviseur pour programmer les vols du jour.',
        };
      }

      // Chercher le vol correspondant
      const normalizedFlightNumber = flightNumber.trim().toUpperCase().replace(/\s+/g, '');
      const matchingFlight = availableFlights.find((flight) => {
        const dbFlightNumber = flight.flightNumber.trim().toUpperCase().replace(/\s+/g, '');
        return (
          dbFlightNumber === normalizedFlightNumber ||
          dbFlightNumber.replace(/0+(\d)/g, '$1') === normalizedFlightNumber.replace(/0+(\d)/g, '$1')
        );
      });

      if (matchingFlight) {
        return {
          isValid: true,
          flight: matchingFlight,
        };
      }

      return {
        isValid: false,
        reason: `Le vol ${flightNumber} n'est pas dans la liste des vols du jour.`,
      };
    } catch (error) {
      console.error('[FlightService] Erreur validation locale:', error);
      // En cas d'erreur, BLOQUER le scan pour sécurité
      return {
        isValid: false,
        reason: 'ERREUR DE VALIDATION. Impossible de vérifier les vols programmés. Contactez le support.',
      };
    }
  }

  /**
   * Vérifie si un vol est dans la liste des vols du jour (sans API)
   */
  isFlightScheduledLocally(flightNumber: string, scheduledFlights: AvailableFlight[]): boolean {
    if (scheduledFlights.length === 0) {
      return false; // Aucun vol programmé = BLOQUER
    }

    const normalizedFlightNumber = flightNumber.trim().toUpperCase().replace(/\s+/g, '');
    return scheduledFlights.some((flight) => {
      const dbFlightNumber = flight.flightNumber.trim().toUpperCase().replace(/\s+/g, '');
      return (
        dbFlightNumber === normalizedFlightNumber ||
        dbFlightNumber.replace(/0+(\d)/g, '$1') === normalizedFlightNumber.replace(/0+(\d)/g, '$1')
      );
    });
  }
}

export const flightService = new FlightService();
