-- Migration: Ajouter le champ gate dans boarding_status
-- Date: 2024-12-31
-- Description: Ajouter la colonne gate pour enregistrer la porte d'embarquement
-- Impact: Table boarding_status

-- ========================================
-- ÉTAPE 1: Ajouter la colonne gate
-- ========================================

ALTER TABLE boarding_status 
ADD COLUMN IF NOT EXISTS gate TEXT;

-- ========================================
-- VÉRIFICATION
-- ========================================

-- Afficher la structure de la table pour vérifier
-- \d boarding_status

-- ========================================
-- NOTES IMPORTANTES
-- ========================================

-- 1. La colonne est NULLABLE car les enregistrements existants n'ont pas de gate
-- 2. Cette migration est NON-DESTRUCTIVE
-- 3. Les nouvelles insertions peuvent inclure le champ gate

-- ========================================
-- ROLLBACK (en cas de problème)
-- ========================================

-- Pour annuler cette migration:
-- ALTER TABLE boarding_status DROP COLUMN IF EXISTS gate;
