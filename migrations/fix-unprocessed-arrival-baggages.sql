-- ========================================
-- Migration: Correction des bagages non marqués comme arrivés
-- Date: 2026-01-08
-- Description: Corrige les bagages qui devraient être marqués comme arrivés
-- ========================================

-- 1. Mettre à jour les bagages qui devraient être marqués comme arrivés
UPDATE baggages b
SET 
    status = 'arrived',
    arrived_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE EXISTS (
    SELECT 1 
    FROM passengers p
    WHERE p.id = b.passenger_id
    AND p.baggage_count = (
        SELECT COUNT(*)
        FROM baggages b2
        WHERE b2.passenger_id = p.id
    )
)
AND b.status != 'arrived';

-- 2. Ajouter un index pour optimiser les recherches de bagages par tag et statut
CREATE INDEX IF NOT EXISTS idx_baggages_tag_status ON baggages(tag_number, status);

-- 3. Ajouter une contrainte pour éviter les incohérences futures
ALTER TABLE baggages
ADD CONSTRAINT check_arrived_status
CHECK (
    (status = 'arrived' AND arrived_at IS NOT NULL) OR
    (status != 'arrived')
);
