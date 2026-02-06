-- Migration: Ajouter le support des vols multi-escales
-- Description: Permet à un vol d'avoir plusieurs destinations (escales)
-- Exemple: Vol ET66 FIH → MJM → FBM (passagers peuvent descendre à MJM ou FBM)

-- 1. Ajouter la colonne 'stops' pour les escales intermédiaires
-- 'arrival' reste la destination finale
-- 'stops' contient les escales intermédiaires (avant la destination finale)
ALTER TABLE flight_schedule 
ADD COLUMN IF NOT EXISTS stops TEXT[] DEFAULT '{}';

-- 2. Ajouter un commentaire explicatif
COMMENT ON COLUMN flight_schedule.stops IS 'Escales intermédiaires avant la destination finale. Exemple: Pour FIH→MJM→FBM, departure=FIH, stops=[MJM], arrival=FBM';

-- 3. Créer un index pour optimiser les recherches par escale
CREATE INDEX IF NOT EXISTS idx_flight_schedule_stops ON flight_schedule USING GIN (stops);

-- 4. Fonction helper pour vérifier si un aéroport est une destination du vol (escale ou finale)
CREATE OR REPLACE FUNCTION flight_serves_destination(
  p_flight_id UUID,
  p_destination TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_flight RECORD;
BEGIN
  SELECT arrival, stops INTO v_flight
  FROM flight_schedule
  WHERE id = p_flight_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier si c'est la destination finale
  IF v_flight.arrival = p_destination THEN
    RETURN TRUE;
  END IF;
  
  -- Vérifier si c'est une escale
  IF p_destination = ANY(v_flight.stops) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 5. Fonction pour obtenir toutes les destinations d'un vol (escales + finale)
CREATE OR REPLACE FUNCTION get_flight_destinations(
  p_flight_id UUID
) RETURNS TEXT[] AS $$
DECLARE
  v_flight RECORD;
  v_destinations TEXT[];
BEGIN
  SELECT arrival, stops INTO v_flight
  FROM flight_schedule
  WHERE id = p_flight_id;
  
  IF NOT FOUND THEN
    RETURN '{}';
  END IF;
  
  -- Combiner les escales et la destination finale
  v_destinations := COALESCE(v_flight.stops, '{}') || v_flight.arrival;
  
  RETURN v_destinations;
END;
$$ LANGUAGE plpgsql;

-- Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration terminée: Support des vols multi-escales ajouté';
  RAISE NOTICE 'Nouvelle colonne: stops (TEXT[])';
  RAISE NOTICE 'Nouvelles fonctions: flight_serves_destination(), get_flight_destinations()';
END $$;
