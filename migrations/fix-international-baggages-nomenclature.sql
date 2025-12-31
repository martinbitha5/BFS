-- Migration: Corriger la nomenclature de international_baggages
-- Date: 2024-12-31
-- Description: Renommer rfid_tag en tag_number pour cohérence avec l'API
-- Impact: Table international_baggages
-- CRITIQUE: Cette migration corrige une incohérence majeure qui empêche le tracking

-- ========================================
-- ÉTAPE 1: Renommer la colonne
-- ========================================

-- Vérifier si la colonne rfid_tag existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'international_baggages' 
        AND column_name = 'rfid_tag'
    ) THEN
        -- Renommer rfid_tag en tag_number
        ALTER TABLE international_baggages 
        RENAME COLUMN rfid_tag TO tag_number;
        
        RAISE NOTICE 'Colonne rfid_tag renommée en tag_number';
    ELSE
        RAISE NOTICE 'La colonne rfid_tag n''existe pas ou a déjà été renommée';
    END IF;
END $$;

-- ========================================
-- ÉTAPE 2: Mettre à jour l'index
-- ========================================

-- Supprimer l'ancien index s'il existe
DROP INDEX IF EXISTS idx_international_baggages_rfid_tag;

-- Créer le nouvel index
CREATE INDEX IF NOT EXISTS idx_international_baggages_tag_number 
ON international_baggages(tag_number);

-- ========================================
-- VÉRIFICATION
-- ========================================

-- Vérifier la structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'international_baggages' 
AND column_name IN ('tag_number', 'rfid_tag');

-- ========================================
-- NOTES
-- ========================================
-- Cette migration est IDEMPOTENTE (peut être exécutée plusieurs fois)
-- Elle corrige l'incohérence entre le schéma DB et l'API
