-- ========================================
-- BFS - Baggage Found Solution
-- Migration: Ajout des colonnes processed et processing_error à raw_scans
-- Date: 2026-01-07
-- ========================================

-- Ajouter la colonne processed pour marquer les scans traités
ALTER TABLE raw_scans ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- Ajouter la colonne processing_error pour stocker les erreurs de traitement
ALTER TABLE raw_scans ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Index pour filtrer les scans non traités efficacement
CREATE INDEX IF NOT EXISTS idx_raw_scans_processed ON raw_scans(processed);

-- Commentaires
COMMENT ON COLUMN raw_scans.processed IS 'Indique si le scan a été traité par la synchronisation';
COMMENT ON COLUMN raw_scans.processing_error IS 'Message d''erreur si le traitement a échoué';
