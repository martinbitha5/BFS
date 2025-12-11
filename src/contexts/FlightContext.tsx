/**
 * Context pour stocker le vol sélectionné par l'agent
 * Utilisé par les écrans Baggage, Boarding, Arrival
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { FlightContext as FlightContextType } from '../types/flight.types';

interface FlightContextValue {
  currentFlight: FlightContextType | null;
  setCurrentFlight: (flight: FlightContextType | null) => Promise<void>;
  clearCurrentFlight: () => Promise<void>;
  isFlightSelected: boolean;
}

const FlightContext = createContext<FlightContextValue | undefined>(undefined);

const STORAGE_KEY = '@bfs_current_flight';

export function FlightProvider({ children }: { children: React.ReactNode }) {
  const [currentFlight, setCurrentFlightState] = useState<FlightContextType | null>(null);

  // Charger le vol au démarrage
  useEffect(() => {
    loadCurrentFlight();
  }, []);

  const loadCurrentFlight = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const flight = JSON.parse(stored) as FlightContextType;
        
        // Vérifier si le vol est toujours valide (même jour)
        const selectedDate = new Date(flight.selectedAt).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        
        if (selectedDate === today) {
          setCurrentFlightState(flight);
        } else {
          // Vol expiré, effacer
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('[FlightContext] Erreur lors du chargement du vol:', error);
    }
  };

  const setCurrentFlight = async (flight: FlightContextType | null) => {
    try {
      if (flight) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(flight));
        setCurrentFlightState(flight);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setCurrentFlightState(null);
      }
    } catch (error) {
      console.error('[FlightContext] Erreur lors de la sauvegarde du vol:', error);
    }
  };

  const clearCurrentFlight = async () => {
    await setCurrentFlight(null);
  };

  return (
    <FlightContext.Provider
      value={{
        currentFlight,
        setCurrentFlight,
        clearCurrentFlight,
        isFlightSelected: currentFlight !== null,
      }}
    >
      {children}
    </FlightContext.Provider>
  );
}

export function useFlightContext() {
  const context = useContext(FlightContext);
  if (context === undefined) {
    throw new Error('useFlightContext must be used within a FlightProvider');
  }
  return context;
}
