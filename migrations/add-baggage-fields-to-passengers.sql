-- ========================================
-- Migration: Ajout des champs bagages dans la table passengers
-- Date: 2024-12-10
-- Description: Ajoute les champs baggage_count et baggage_base_number
--              pour assurer la cohérence avec le schéma SQLite
-- ========================================

-- Ajouter les champs manquants dans passengers
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS baggage_count INTEGER DEFAULT 0;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS baggage_base_number TEXT;

-- Créer un index pour le champ baggage_base_number
CREATE INDEX IF NOT EXISTS idx_passengers_baggage_base_number ON passengers(baggage_base_number);

-- Commentaires sur les nouveaux champs
COMMENT ON COLUMN passengers.baggage_count IS 'Nombre de bagages enregistrés pour ce passager';
COMMENT ON COLUMN passengers.baggage_base_number IS 'Numéro de base pour les tags RFID attendus (Air Congo)';

-- Mettre à jour le compteur de bagages pour les passagers existants
UPDATE passengers p
SET baggage_count = (
  SELECT COUNT(*) 
  FROM baggages b 
  WHERE b.passenger_id = p.id
)
WHERE baggage_count = 0;
