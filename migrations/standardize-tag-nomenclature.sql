-- Migration: Standardiser la nomenclature des tags RFID
-- Date: 2024-12-31
-- Description: Renommer rfid_tag en tag_number dans international_baggages pour cohérence avec baggages
-- Impact: Table international_baggages uniquement

-- ========================================
-- ÉTAPE 1: Renommer la colonne rfid_tag en tag_number
-- ========================================

-- Note: PostgreSQL supporte ALTER COLUMN RENAME directement
ALTER TABLE international_baggages 
RENAME COLUMN rfid_tag TO tag_number;

-- ========================================
-- ÉTAPE 2: Mettre à jour les index
-- ========================================

-- Supprimer l'ancien index sur rfid_tag (s'il existe)
DROP INDEX IF EXISTS idx_international_baggages_rfid_tag;

-- Créer le nouvel index sur tag_number (probablement déjà créé automatiquement)
-- Mais on le crée explicitement pour être sûr
CREATE INDEX IF NOT EXISTS idx_international_baggages_tag_number 
ON international_baggages(tag_number);

-- ========================================
-- VÉRIFICATION
-- ========================================

-- Afficher la structure de la table pour vérifier
-- \d international_baggages

-- Compter les enregistrements pour vérifier que rien n'est perdu
-- SELECT COUNT(*) as total_records FROM international_baggages;

-- ========================================
-- NOTES IMPORTANTES
-- ========================================

-- 1. Cette migration est NON-DESTRUCTIVE - aucune donnée n'est perdue
-- 2. Les contraintes UNIQUE et NOT NULL sont préservées automatiquement
-- 3. Les index sont reconstruits automatiquement
-- 4. La migration est RÉVERSIBLE avec la commande inverse:
--    ALTER TABLE international_baggages RENAME COLUMN tag_number TO rfid_tag;

-- ========================================
-- ROLLBACK (en cas de problème)
-- ========================================

-- Pour annuler cette migration, exécuter:
-- ALTER TABLE international_baggages RENAME COLUMN tag_number TO rfid_tag;
-- DROP INDEX IF EXISTS idx_international_baggages_tag_number;
-- CREATE INDEX idx_international_baggages_rfid_tag ON international_baggages(rfid_tag);
