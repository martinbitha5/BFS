-- Ajouter une colonne pour stocker les erreurs de validation
-- Cela permet de tracer pourquoi un scan a été refusé

ALTER TABLE raw_scans 
ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Index pour rechercher les scans refusés
CREATE INDEX IF NOT EXISTS idx_raw_scans_processing_error 
ON raw_scans(processing_error) 
WHERE processing_error IS NOT NULL;

-- Commentaire
COMMENT ON COLUMN raw_scans.processing_error IS 
  'Raison du refus du scan (vol non programmé, etc.)';

-- Vérifier
SELECT 'Column processing_error added successfully' as status;
