-- ⚠️ Script de suppression SIMPLE pour Supabase SQL Editor
-- Copiez-collez ce code COMPLET dans le SQL Editor et cliquez "Run"

-- 1. Bagages internationaux
DELETE FROM international_baggages;

-- 2. Bagages normaux
DELETE FROM baggages;

-- 3. Passagers
DELETE FROM passengers;

-- 4. Raw scans
DELETE FROM raw_scans;

-- ✅ VÉRIFICATION - Tout doit être à 0
SELECT 
  'international_baggages' as table_name, 
  COUNT(*) as count 
FROM international_baggages
UNION ALL
SELECT 'baggages', COUNT(*) FROM baggages
UNION ALL
SELECT 'passengers', COUNT(*) FROM passengers
UNION ALL
SELECT 'raw_scans', COUNT(*) FROM raw_scans;
