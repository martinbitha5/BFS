-- ========================================
-- Migration: Ajout du champ passenger_pnr dans la table baggages
-- Date: 2026-01-08
-- Description: Ajoute le champ passenger_pnr pour permettre la liaison
--              avec les passagers via leur PNR dans l'API
-- ========================================

-- Ajouter la colonne passenger_pnr
ALTER TABLE baggages ADD COLUMN IF NOT EXISTS passenger_pnr TEXT;

-- Créer un index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_baggages_passenger_pnr ON baggages(passenger_pnr);

-- Mettre à jour les valeurs existantes
UPDATE baggages b
SET passenger_pnr = (
  SELECT pnr 
  FROM passengers p 
  WHERE p.id = b.passenger_id
)
WHERE b.passenger_pnr IS NULL;

-- Commentaire sur le nouveau champ
COMMENT ON COLUMN baggages.passenger_pnr IS 'PNR du passager associé au bagage';
