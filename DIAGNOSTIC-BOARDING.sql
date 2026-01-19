-- ========================================
-- DIAGNOSTIC: Vérifier les tables et données
-- ========================================

-- 1️⃣ Vérifier la structure de la table passengers
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'passengers'
ORDER BY ordinal_position;

-- 2️⃣ Compter les passagers
SELECT COUNT(*) as total_passengers FROM passengers;

-- 3️⃣ Chercher le PNR spécifique
SELECT id, pnr, full_name, flight_number, airport_code, created_at
FROM passengers
WHERE pnr = 'OAIMUM'
LIMIT 10;

-- 4️⃣ Voir tous les PNRs pour l'aéroport FIH
SELECT id, pnr, full_name, flight_number, airport_code, created_at
FROM passengers
WHERE airport_code = 'FIH'
ORDER BY created_at DESC
LIMIT 20;

-- 5️⃣ Vérifier la table boarding_status
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'boarding_status'
ORDER BY ordinal_position;

-- 6️⃣ Compter les enregistrements boarding_status
SELECT COUNT(*) as total_boardings FROM boarding_status;

-- 7️⃣ Voir les derniers boardings
SELECT bs.id, bs.passenger_id, bs.boarded_at, p.pnr, p.full_name
FROM boarding_status bs
LEFT JOIN passengers p ON bs.passenger_id = p.id
ORDER BY bs.boarded_at DESC
LIMIT 10;

-- 8️⃣ Vérifier la table raw_scans
SELECT COUNT(*) as total_raw_scans FROM raw_scans;

-- 9️⃣ Voir les derniers raw_scans avec status_boarding=true
SELECT id, status_boarding, created_at
FROM raw_scans
WHERE status_boarding = true
ORDER BY created_at DESC
LIMIT 10;

-- 🔟 Comparer: raw_scans avec boarding_status
SELECT 
  COUNT(DISTINCT rs.id) as raw_scans_boarding,
  COUNT(DISTINCT bs.passenger_id) as boarding_status_count
FROM raw_scans rs
FULL OUTER JOIN boarding_status bs ON rs.id = bs.passenger_id
WHERE rs.status_boarding = true;
