-- ========================================
-- Migration: Correction complète de airline_registration_requests
-- Date: 2026-01-06
-- Description: Ajoute les colonnes approved_at ET approved_by manquantes
-- ========================================

-- Ajouter la colonne approved_at si elle n'existe pas
ALTER TABLE airline_registration_requests 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Ajouter la colonne approved_by si elle n'existe pas
ALTER TABLE airline_registration_requests 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

-- Créer les index pour les recherches
CREATE INDEX IF NOT EXISTS idx_airline_reg_requests_approved_at 
ON airline_registration_requests(approved_at);

CREATE INDEX IF NOT EXISTS idx_airline_reg_requests_approved_by 
ON airline_registration_requests(approved_by);

-- Commentaires
COMMENT ON COLUMN airline_registration_requests.approved_at IS 'Date et heure d''approbation de la demande';
COMMENT ON COLUMN airline_registration_requests.approved_by IS 'ID de l''utilisateur support qui a approuvé la demande';

-- Vérification
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'airline_registration_requests'
AND column_name IN ('approved_at', 'approved_by')
ORDER BY column_name;

SELECT '✅ Colonnes approved_at et approved_by ajoutées à airline_registration_requests' AS status;
