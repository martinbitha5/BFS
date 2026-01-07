-- ========================================
-- FIX: Lier les bagages orphelins aux passagers
-- Exécuter dans Supabase SQL Editor
-- ========================================

-- 1. Voir les bagages orphelins par vol
SELECT 
  b.flight_number,
  COUNT(*) as bagages_orphelins,
  COUNT(DISTINCT p.id) as passagers_sur_vol
FROM baggages b
LEFT JOIN passengers p ON p.flight_number = b.flight_number AND p.airport_code = b.airport_code
WHERE b.passenger_id IS NULL
GROUP BY b.flight_number
ORDER BY bagages_orphelins DESC;

-- 2. Fonction pour lier automatiquement les bagages orphelins
-- Cette fonction lie chaque bagage orphelin au premier passager du même vol qui a des bagages manquants
DO $$
DECLARE
  orphan_bag RECORD;
  target_passenger RECORD;
  bags_linked INT := 0;
BEGIN
  -- Parcourir tous les bagages orphelins
  FOR orphan_bag IN 
    SELECT b.id, b.tag_number, b.flight_number, b.airport_code
    FROM baggages b
    WHERE b.passenger_id IS NULL
    ORDER BY b.created_at
  LOOP
    -- Chercher un passager sur le même vol avec des bagages manquants
    SELECT p.id, p.pnr, p.full_name, p.baggage_count,
           (SELECT COUNT(*) FROM baggages WHERE passenger_id = p.id) as current_bags
    INTO target_passenger
    FROM passengers p
    WHERE p.flight_number = orphan_bag.flight_number
      AND p.airport_code = orphan_bag.airport_code
      AND p.baggage_count > (SELECT COUNT(*) FROM baggages WHERE passenger_id = p.id)
    ORDER BY p.created_at
    LIMIT 1;
    
    -- Si on trouve un passager, lier le bagage
    IF target_passenger.id IS NOT NULL THEN
      UPDATE baggages
      SET passenger_id = target_passenger.id
      WHERE id = orphan_bag.id;
      
      bags_linked := bags_linked + 1;
      RAISE NOTICE 'Bagage % lié au passager % (%)', orphan_bag.tag_number, target_passenger.full_name, target_passenger.pnr;
    END IF;
  END LOOP;
  
  RAISE NOTICE '=== % bagages liés aux passagers ===', bags_linked;
END $$;

-- 3. Vérifier le résultat
SELECT 
  'Avant fix' as etat,
  (SELECT COUNT(*) FROM baggages WHERE passenger_id IS NULL) as bagages_orphelins,
  (SELECT COUNT(*) FROM baggages WHERE passenger_id IS NOT NULL) as bagages_lies;

-- 4. Afficher les bagages qui restent orphelins (passagers non trouvés)
SELECT b.tag_number, b.flight_number, b.airport_code, b.status, b.created_at
FROM baggages b
WHERE b.passenger_id IS NULL
ORDER BY b.created_at DESC
LIMIT 20;
