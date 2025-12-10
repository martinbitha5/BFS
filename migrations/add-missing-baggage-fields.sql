-- ========================================
-- Migration: Ajout des champs manquants dans la table baggages
-- Date: 2024-12-10
-- Description: Ajoute les champs weight, flight_number, airport_code, 
--              current_location, delivered_at, last_scanned_at, last_scanned_by
--              pour assurer la cohérence avec le schéma PostgreSQL
-- ========================================

-- Ajouter les champs manquants dans baggages
ALTER TABLE baggages ADD COLUMN IF NOT EXISTS weight NUMERIC;
ALTER TABLE baggages ADD COLUMN IF NOT EXISTS flight_number TEXT;
ALTER TABLE baggages ADD COLUMN IF NOT EXISTS airport_code TEXT;
ALTER TABLE baggages ADD COLUMN IF NOT EXISTS current_location TEXT;
ALTER TABLE baggages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE baggages ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE baggages ADD COLUMN IF NOT EXISTS last_scanned_by UUID REFERENCES users(id);

-- Créer les index pour les nouveaux champs
CREATE INDEX IF NOT EXISTS idx_baggages_airport_code ON baggages(airport_code);
CREATE INDEX IF NOT EXISTS idx_baggages_flight_number ON baggages(flight_number);
CREATE INDEX IF NOT EXISTS idx_baggages_last_scanned_at ON baggages(last_scanned_at);

-- Commentaires sur les nouveaux champs
COMMENT ON COLUMN baggages.weight IS 'Poids du bagage en kg';
COMMENT ON COLUMN baggages.flight_number IS 'Numéro de vol associé au bagage';
COMMENT ON COLUMN baggages.airport_code IS 'Code aéroport où le bagage a été enregistré';
COMMENT ON COLUMN baggages.current_location IS 'Localisation actuelle du bagage';
COMMENT ON COLUMN baggages.delivered_at IS 'Date et heure de livraison au passager';
COMMENT ON COLUMN baggages.last_scanned_at IS 'Date et heure du dernier scan';
COMMENT ON COLUMN baggages.last_scanned_by IS 'Agent ayant effectué le dernier scan';
