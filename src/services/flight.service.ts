/**
 * Service de gestion des vols disponibles
 * Les vols sont chargés depuis les passagers enregistrés
 * Le superviseur peut ajouter des vols via le dashboard (flight_schedule)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREQUENT_FLIGHTS, FrequentFlight } from '../constants/flight-schedule';
import { AvailableFlight } from '../types/flight.types';
import { databaseService } from './database.service';

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
  async getAvailableFlights(airportCode: string, date?: string, airlineCode?: string): Promise<AvailableFlight[]> {
    const today = date || new Date().toISOString().split('T')[0];
    const flights = new Map<string, AvailableFlight>();

    const [scheduledFlights, passengersFlights] = await Promise.all([
      this.getScheduledFlights(airportCode, today, airlineCode),
      this.getFlightsFromPassengers(airportCode, today, airlineCode),
    ]);

    for (const flight of scheduledFlights) {
      const normalizedKey = this.normalizeFlightNumber(flight.flightNumber);
      flights.set(normalizedKey, { ...flight, flightNumber: normalizedKey });
    }

    for (const flight of passengersFlights) {
      const normalizedKey = this.normalizeFlightNumber(flight.flightNumber);
      if (flights.has(normalizedKey)) {
        const existingFlight = flights.get(normalizedKey)!;
        existingFlight.passengerCount = flight.passengerCount;
        existingFlight.baggageCount = flight.baggageCount;
      } else {
        flights.set(normalizedKey, { ...flight, flightNumber: normalizedKey });
      }
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
    date: string,
    airlineCode?: string
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

      let url = `${apiUrl}/api/v1/flights?airport=${airportCode}&date=${date}`;
      if (airlineCode) url += `&airline_code=${airlineCode}`;
      const headers: Record<string, string> = {
        'x-api-key': apiKey || '',
        'Content-Type': 'application/json',
      };
      if (airlineCode) headers['x-airline-code'] = airlineCode;
      const response = await fetch(url, { headers });

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
   * PRIORITÉ: API Supabase (pour les données cloud en production)
   * FALLBACK: SQLite local (en offline ou si API unavailable)
   */
  private async getFlightsFromPassengers(
    airportCode: string,
    date: string,
    airlineCode?: string
  ): Promise<AvailableFlight[]> {
    // ✅ ÉTAPE 1: Essayer d'abord via l'API (Supabase)
    try {
      const apiUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_URL);
      const apiKey = await AsyncStorage.getItem(STORAGE_KEYS.API_KEY);

      if (apiUrl && apiKey) {
        console.log('[FlightService] 📡 Chargement des passagers depuis API...');
        
        let url = `${apiUrl}/api/v1/passengers?airport=${airportCode}&date=${date}`;
        if (airlineCode) url += `&airline_code=${airlineCode}`;
        const headers: Record<string, string> = {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        };
        if (airlineCode) headers['x-airline-code'] = airlineCode;
        const response = await fetch(url, { headers });

        if (response.ok) {
          const result = await response.json();
          const passengers = result.data || [];

          console.log(`[FlightService] ✅ ${passengers.length} passagers chargés depuis l'API`);

          // Grouper par vol et compter les passagers et bagages
          const flightsMap = new Map<string, AvailableFlight>();

          for (const passenger of passengers) {
            const key = passenger.flightNumber || 'UNKNOWN';
            
            if (!flightsMap.has(key)) {
              flightsMap.set(key, {
                flightNumber: passenger.flightNumber,
                airline: passenger.airline || '',
                airlineCode: passenger.airline_code || '',
                departure: passenger.departure,
                arrival: passenger.arrival,
                passengerCount: 0,
                baggageCount: 0,
                source: 'passengers' as const,
              });
            }

            const flight = flightsMap.get(key)!;
            flight.passengerCount = (flight.passengerCount ?? 0) + 1;
            flight.baggageCount = (flight.baggageCount ?? 0) + (passenger.baggageCount || 0);
          }

          const flights = Array.from(flightsMap.values());
          console.log(`[FlightService] 📊 ${flights.length} vols avec passagers chargés depuis l'API`);
          return flights;
        } else {
          console.warn('[FlightService] ⚠️ API retourne une erreur, fallback sur SQLite...');
        }
      } else {
        console.log('[FlightService] ℹ️ API non configurée, fallback sur SQLite...');
      }
    } catch (error) {
      console.warn('[FlightService] ⚠️ Erreur API (fallback sur SQLite):', error instanceof Error ? error.message : error);
    }

    // ✅ ÉTAPE 2: Fallback sur SQLite local (si API unavailable ou offline)
    const db = databaseService.getDatabase();
    if (!db) {
      console.warn('[FlightService] ⚠️ SQLite non disponible - aucun passager à charger');
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

      console.log(`[FlightService] ✅ ${flights.length} vols chargés depuis SQLite (fallback)`);

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
    const db = databaseService.getDatabase();
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
      // ✅ Charger les variables depuis AsyncStorage (initialisées au démarrage)
      const apiUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_URL);
      const apiKey = await AsyncStorage.getItem(STORAGE_KEYS.API_KEY);

      console.log('[FlightService] 🔍 Validation vol:', {
        flightNumber: flightNumber.toUpperCase(),
        airportCode,
        departure,
        arrival,
        apiUrl: apiUrl ? '✅ SET' : '❌ NOT SET',
        apiKey: apiKey ? '✅ SET' : '❌ NOT SET'
      });

      // ⚠️ PRIORITÉ: Essayer l'API si disponible
      if (apiUrl && apiKey) {
        try {
          const url = `${apiUrl}/api/v1/flights/validate-boarding`;
          console.log('[FlightService] 📡 Appel API:', url);

          // Créer un AbortController pour le timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              flightNumber: flightNumber.toUpperCase(),
              airportCode,
              departure,
              arrival,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          console.log('[FlightService] 📥 Réponse API:', response.status, response.statusText);

          if (response.ok) {
            const result = await response.json();
            console.log('[FlightService] 📥 Réponse complète:', {
              success: result.success,
              isValid: result.isValid,
              reason: result.reason,
              flight: result.flight ? `${result.flight.flightNumber}` : null
            });

            if (result.isValid && result.flight) {
              console.log('[FlightService] ✅ Vol validé via API:', result.flight.flightNumber);
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
            } else {
              // L'API dit que le vol n'est pas valide → fallback local
              console.log('[FlightService] ⚠️ API rejette le vol, essai validation locale...');
              return this.validateFlightLocally(flightNumber, airportCode);
            }
          } else {
            // Erreur HTTP → fallback local
            const errorText = await response.text();
            console.warn('[FlightService] ⚠️ Erreur HTTP API:', response.status, errorText);
            console.log('[FlightService] 🔄 Fallback à validation locale...');
            return this.validateFlightLocally(flightNumber, airportCode);
          }
        } catch (apiError) {
          console.warn('[FlightService] ⚠️ Erreur appel API:', apiError instanceof Error ? apiError.message : apiError);
          console.log('[FlightService] 🔄 Fallback à validation locale...');
          return this.validateFlightLocally(flightNumber, airportCode);
        }
      } else {
        console.log('[FlightService] ⚠️ API non configurée (API_URL ou API_KEY absent)');
        console.log('[FlightService] 🔄 Fallback à validation locale...');
        return this.validateFlightLocally(flightNumber, airportCode);
      }
    } catch (error) {
      console.error('[FlightService] ❌ Erreur validation vol:', error);
      console.log('[FlightService] 🔄 Fallback à validation locale...');
      // En cas d'erreur, fallback local
      return this.validateFlightLocally(flightNumber, airportCode);
    }
  }

  /**
   * Validation locale des vols (fallback si API indisponible)
   * ⚠️ En production, si AUCUN vol n'est programmé, on retourne une erreur claire
   */
  private async validateFlightLocally(
    flightNumber: string,
    airportCode: string
  ): Promise<{ isValid: boolean; flight?: AvailableFlight; reason?: string }> {
    console.log('[FlightService] 🔄 Validation locale du vol...');
    console.log('[FlightService] 📋 Paramètres:', { flightNumber: flightNumber.toUpperCase(), airportCode });

    try {
      // Charger les vols disponibles du jour
      const availableFlights = await this.getAvailableFlights(airportCode);

      console.log('[FlightService] 📊 Vols disponibles en base locale:', availableFlights.length);
      if (availableFlights.length > 0) {
        console.log('[FlightService]    Vols:', availableFlights.map(f => f.flightNumber).join(', '));
      }

      if (availableFlights.length === 0) {
        // ⚠️ AUCUN vol programmé = ERREUR DE CONFIGURATION (le superviseur doit programmer les vols)
        const errorMsg = 'AUCUN VOL PROGRAMMÉ AUJOURD\'HUI. ❌ Le superviseur doit ajouter les vols du jour dans le dashboard.';
        console.error('[FlightService] ❌', errorMsg);
        return {
          isValid: false,
          reason: errorMsg,
        };
      }

      // Chercher le vol correspondant
      const normalizedFlightNumber = flightNumber.trim().toUpperCase().replace(/\s+/g, '');
      console.log('[FlightService] 🔍 Recherche du vol:', normalizedFlightNumber);

      const matchingFlight = availableFlights.find((flight) => {
        const dbFlightNumber = flight.flightNumber.trim().toUpperCase().replace(/\s+/g, '');
        
        // Match exact
        if (dbFlightNumber === normalizedFlightNumber) {
          console.log('[FlightService]    ✅ Match exact trouvé:', dbFlightNumber);
          return true;
        }

        // Match avec normalisation des zéros (ET0064 = ET64)
        const normalizedDb = dbFlightNumber.replace(/0+(\d)/g, '$1');
        const normalizedInput = normalizedFlightNumber.replace(/0+(\d)/g, '$1');
        if (normalizedDb === normalizedInput) {
          console.log('[FlightService]    ✅ Match avec normalisation zéros:', dbFlightNumber, '=', normalizedFlightNumber);
          return true;
        }

        return false;
      });

      if (matchingFlight) {
        console.log('[FlightService] ✅ Vol trouvé en validation locale:', matchingFlight.flightNumber);
        return {
          isValid: true,
          flight: matchingFlight,
        };
      }

      // Vol non trouvé
      const notFoundMsg = `Le vol ${flightNumber.toUpperCase()} n'est pas dans la liste des vols du jour. Vols disponibles: ${availableFlights.map(f => f.flightNumber).join(', ')}`;
      console.warn('[FlightService] ⚠️', notFoundMsg);
      return {
        isValid: false,
        reason: notFoundMsg,
      };
    } catch (error) {
      console.error('[FlightService] ❌ Erreur validation locale:', error instanceof Error ? error.message : error);
      // En cas d'erreur base de données, BLOQUER pour sécurité
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
