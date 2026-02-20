-- ========================================
-- Migration: Ajout des colonnes destination et notes à la table baggages
-- Date: 2025-02-20
-- Description: Ajoute les colonnes destination et notes pour supporter
--              la création d'étiquettes manuelles par les superviseurs
-- ========================================

-- Ajouter la colonne destination
ALTER TABLE baggages ADD COLUMN IF NOT EXISTS destination TEXT;

-- Ajouter la colonne notes
ALTER TABLE baggages ADD COLUMN IF NOT EXISTS notes TEXT;

-- Commentaires sur les nouvelles colonnes
COMMENT ON COLUMN baggages.destination IS 'Code aéroport de destination (pour les étiquettes manuelles)';
COMMENT ON COLUMN baggages.notes IS 'Notes et description du bagage (pour les étiquettes manuelles)';

-- Créer des index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_baggages_destination ON baggages(destination);
CREATE INDEX IF NOT EXISTS idx_baggages_notes ON baggages(notes);