-- Script de nettoyage des passagers avec données corrompues
-- Problème: Le parser a généré des noms contenant PNR + codes aéroport (ex: "MASIKA KANEFU JEANNEEQDGSVI FIHFBMET")

-- 1. Voir les passagers corrompus (noms contenant FIHFBMET ou UNKNOWN)
SELECT id, full_name, pnr, flight_number, departure, arrival 
FROM passengers 
WHERE full_name LIKE '%FIHFBMET%' 
   OR full_name LIKE '%FIHFBM%'
   OR full_name LIKE '%FBM%'
   OR flight_number = 'UNKNOWN'
ORDER BY created_at DESC;

-- 2. Compter les passagers corrompus
SELECT 
  COUNT(*) as total_corrupted,
  COUNT(CASE WHEN full_name LIKE '%FIHFBMET%' THEN 1 END) as with_fihfbmet,
  COUNT(CASE WHEN flight_number = 'UNKNOWN' THEN 1 END) as unknown_flight
FROM passengers;

-- 3. OPTION A: Supprimer TOUS les passagers corrompus (recommandé si peu de données valides)
-- ATTENTION: Cela supprimera aussi les bagages et boarding_status liés
DELETE FROM boarding_status WHERE passenger_id IN (
  SELECT id FROM passengers 
  WHERE full_name LIKE '%FIHFBMET%' 
     OR full_name LIKE '%FIHFBM%'
     OR flight_number = 'UNKNOWN'
);

DELETE FROM baggages WHERE passenger_id IN (
  SELECT id FROM passengers 
  WHERE full_name LIKE '%FIHFBMET%' 
     OR full_name LIKE '%FIHFBM%'
     OR flight_number = 'UNKNOWN'
);

DELETE FROM passengers 
WHERE full_name LIKE '%FIHFBMET%' 
   OR full_name LIKE '%FIHFBM%'
   OR flight_number = 'UNKNOWN';

-- 4. OPTION B: Corriger les noms en supprimant la partie corrompue
-- UPDATE passengers 
-- SET full_name = REGEXP_REPLACE(full_name, '[A-Z]{6}\s*FIHFBM.*$', '')
-- WHERE full_name LIKE '%FIHFBM%';

-- UPDATE passengers 
-- SET flight_number = 'ET64'
-- WHERE flight_number = 'UNKNOWN' AND departure = 'FIH' AND arrival = 'FBM';

-- 5. Vérifier le résultat
SELECT COUNT(*) as remaining_passengers FROM passengers;
SELECT COUNT(*) as remaining_baggages FROM baggages;
