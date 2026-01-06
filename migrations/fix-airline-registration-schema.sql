-- ========================================
-- Migration: Correction du schéma airline_registration_requests
-- Date: 2026-01-06
-- Description: Ajoute la colonne approved_at manquante
-- ========================================

-- Ajouter la colonne approved_at si elle n'existe pas
ALTER TABLE airline_registration_requests 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Créer un index pour les recherches par date d'approbation
CREATE INDEX IF NOT EXISTS idx_airline_reg_requests_approved_at 
ON airline_registration_requests(approved_at);

-- Commentaire
COMMENT ON COLUMN airline_registration_requests.approved_at IS 'Date et heure d''approbation de la demande';

-- Vérification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'airline_registration_requests'
AND column_name = 'approved_at';

SELECT '✅ Colonne approved_at ajoutée à airline_registration_requests' AS status;
