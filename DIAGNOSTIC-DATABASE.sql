-- ========================================
-- BFS - DIAGNOSTIC COMPLET DE LA BASE DE DONNÉES
-- Exécuter dans Supabase SQL Editor
-- ========================================

-- ========================================
-- 1. COMPTAGE DE TOUTES LES TABLES
-- ========================================
SELECT '=== COMPTAGE DES TABLES ===' as section;

SELECT 'users' as table_name, COUNT(*) as total FROM users
UNION ALL SELECT 'passengers', COUNT(*) FROM passengers
UNION ALL SELECT 'baggages', COUNT(*) FROM baggages
UNION ALL SELECT 'international_baggages', COUNT(*) FROM international_baggages
UNION ALL SELECT 'boarding_status', COUNT(*) FROM boarding_status
UNION ALL SELECT 'airlines', COUNT(*) FROM airlines
UNION ALL SELECT 'airline_registration_requests', COUNT(*) FROM airline_registration_requests
UNION ALL SELECT 'user_registration_requests', COUNT(*) FROM user_registration_requests
UNION ALL SELECT 'baggage_authorization_requests', COUNT(*) FROM baggage_authorization_requests
UNION ALL SELECT 'birs_reports', COUNT(*) FROM birs_reports
UNION ALL SELECT 'birs_report_items', COUNT(*) FROM birs_report_items
ORDER BY table_name;

-- ========================================
-- 2. VÉRIFICATION DES RELATIONS FK - ORPHELINS
-- ========================================
SELECT '=== ORPHELINS (données sans relation) ===' as section;

-- Bagages sans passager (passenger_id NULL ou invalide)
SELECT 
  'baggages_sans_passager' as probleme,
  COUNT(*) as nombre,
  STRING_AGG(tag_number, ', ' ORDER BY tag_number) as exemples
FROM baggages b
WHERE b.passenger_id IS NULL 
   OR NOT EXISTS (SELECT 1 FROM passengers p WHERE p.id = b.passenger_id);

-- Bagages avec passenger_id qui n'existe pas
SELECT 
  'baggages_passenger_id_invalide' as probleme,
  COUNT(*) as nombre,
  STRING_AGG(b.tag_number, ', ' ORDER BY b.tag_number) as exemples
FROM baggages b
WHERE b.passenger_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM passengers p WHERE p.id = b.passenger_id);

-- Boarding_status sans passager valide
SELECT 
  'boarding_status_sans_passager' as probleme,
  COUNT(*) as nombre
FROM boarding_status bs
WHERE NOT EXISTS (SELECT 1 FROM passengers p WHERE p.id = bs.passenger_id);

-- BIRS report items sans rapport parent
SELECT 
  'birs_items_sans_rapport' as probleme,
  COUNT(*) as nombre
FROM birs_report_items bi
WHERE NOT EXISTS (SELECT 1 FROM birs_reports br WHERE br.id = bi.birs_report_id);

-- International baggages orphelins (birs_report_id invalide)
SELECT 
  'international_baggages_birs_id_invalide' as probleme,
  COUNT(*) as nombre
FROM international_baggages ib
WHERE ib.birs_report_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM birs_reports br WHERE br.id = ib.birs_report_id);

-- ========================================
-- 3. PASSAGERS AVEC LEURS BAGAGES
-- ========================================
SELECT '=== PASSAGERS ET NOMBRE DE BAGAGES ===' as section;

SELECT 
  p.pnr,
  p.full_name,
  p.flight_number,
  p.baggage_count as bagages_declares,
  COUNT(b.id) as bagages_reels_table_baggages,
  (SELECT COUNT(*) FROM birs_report_items bi WHERE bi.pnr = p.pnr) as bagages_dans_birs,
  (SELECT COUNT(*) FROM international_baggages ib WHERE ib.pnr = p.pnr) as bagages_internationaux
FROM passengers p
LEFT JOIN baggages b ON b.passenger_id = p.id
GROUP BY p.id, p.pnr, p.full_name, p.flight_number, p.baggage_count
ORDER BY p.created_at DESC
LIMIT 50;

-- ========================================
-- 4. RECHERCHE SPÉCIFIQUE PNR KBNXRU (celui qui pose problème)
-- ========================================
SELECT '=== RECHERCHE PNR KBNXRU ===' as section;

-- Dans passengers
SELECT 'DANS_TABLE_PASSENGERS' as source, id, pnr, full_name, flight_number, baggage_count
FROM passengers WHERE UPPER(pnr) = 'KBNXRU';

-- Dans baggages (via passenger)
SELECT 'DANS_TABLE_BAGGAGES' as source, b.id, b.tag_number, b.status, b.passenger_id, p.pnr
FROM baggages b
LEFT JOIN passengers p ON p.id = b.passenger_id
WHERE UPPER(p.pnr) = 'KBNXRU';

-- Dans international_baggages
SELECT 'DANS_TABLE_INTERNATIONAL_BAGGAGES' as source, id, tag_number, status, pnr, passenger_name
FROM international_baggages WHERE UPPER(pnr) = 'KBNXRU';

-- Dans birs_report_items
SELECT 'DANS_TABLE_BIRS_REPORT_ITEMS' as source, bi.id, bi.bag_id, bi.pnr, bi.passenger_name, br.flight_number
FROM birs_report_items bi
JOIN birs_reports br ON br.id = bi.birs_report_id
WHERE UPPER(bi.pnr) = 'KBNXRU';

-- ========================================
-- 5. RECHERCHE PNR YWICQI (celui qui fonctionne)
-- ========================================
SELECT '=== RECHERCHE PNR YWICQI ===' as section;

-- Dans passengers
SELECT 'DANS_TABLE_PASSENGERS' as source, id, pnr, full_name, flight_number, baggage_count
FROM passengers WHERE UPPER(pnr) = 'YWICQI';

-- Dans baggages (via passenger)
SELECT 'DANS_TABLE_BAGGAGES' as source, b.id, b.tag_number, b.status, b.passenger_id, p.pnr
FROM baggages b
LEFT JOIN passengers p ON p.id = b.passenger_id
WHERE UPPER(p.pnr) = 'YWICQI';

-- Dans international_baggages
SELECT 'DANS_TABLE_INTERNATIONAL_BAGGAGES' as source, id, tag_number, status, pnr, passenger_name
FROM international_baggages WHERE UPPER(pnr) = 'YWICQI';

-- Dans birs_report_items
SELECT 'DANS_TABLE_BIRS_REPORT_ITEMS' as source, bi.id, bi.bag_id, bi.pnr, bi.passenger_name, br.flight_number
FROM birs_report_items bi
JOIN birs_reports br ON br.id = bi.birs_report_id
WHERE UPPER(bi.pnr) = 'YWICQI';

-- ========================================
-- 6. COHÉRENCE DES DONNÉES
-- ========================================
SELECT '=== COHÉRENCE DES DONNÉES ===' as section;

-- Passagers avec baggage_count différent du nombre réel de bagages
SELECT 
  'passagers_baggage_count_incoherent' as probleme,
  p.pnr,
  p.full_name,
  p.baggage_count as declare,
  COUNT(b.id) as reel
FROM passengers p
LEFT JOIN baggages b ON b.passenger_id = p.id
GROUP BY p.id, p.pnr, p.full_name, p.baggage_count
HAVING p.baggage_count != COUNT(b.id)
LIMIT 20;

-- Bagages avec flight_number différent de celui du passager
SELECT 
  'baggages_flight_incoherent' as probleme,
  b.tag_number,
  b.flight_number as bag_flight,
  p.flight_number as passenger_flight
FROM baggages b
JOIN passengers p ON p.id = b.passenger_id
WHERE b.flight_number IS NOT NULL 
  AND p.flight_number IS NOT NULL 
  AND b.flight_number != p.flight_number
LIMIT 20;

-- ========================================
-- 7. STATISTIQUES PAR STATUT
-- ========================================
SELECT '=== STATISTIQUES PAR STATUT ===' as section;

-- Statuts des bagages nationaux
SELECT 'baggages_nationaux' as table_name, status, COUNT(*) as nombre
FROM baggages
GROUP BY status
ORDER BY nombre DESC;

-- Statuts des bagages internationaux
SELECT 'baggages_internationaux' as table_name, status, COUNT(*) as nombre
FROM international_baggages
GROUP BY status
ORDER BY nombre DESC;

-- ========================================
-- 8. DERNIÈRES DONNÉES CRÉÉES
-- ========================================
SELECT '=== 10 DERNIERS PASSAGERS ===' as section;

SELECT id, pnr, full_name, flight_number, departure, arrival, baggage_count, created_at
FROM passengers
ORDER BY created_at DESC
LIMIT 10;

SELECT '=== 10 DERNIERS BAGAGES ===' as section;

SELECT b.id, b.tag_number, b.status, b.flight_number, p.pnr as passenger_pnr, b.created_at
FROM baggages b
LEFT JOIN passengers p ON p.id = b.passenger_id
ORDER BY b.created_at DESC
LIMIT 10;

SELECT '=== 10 DERNIERS BIRS ITEMS ===' as section;

SELECT bi.id, bi.bag_id, bi.pnr, bi.passenger_name, br.flight_number, bi.created_at
FROM birs_report_items bi
JOIN birs_reports br ON br.id = bi.birs_report_id
ORDER BY bi.created_at DESC
LIMIT 10;

-- ========================================
-- 9. VÉRIFICATION DES COLONNES EXISTANTES
-- ========================================
SELECT '=== COLONNES DE LA TABLE PASSENGERS ===' as section;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'passengers'
ORDER BY ordinal_position;

SELECT '=== COLONNES DE LA TABLE BAGGAGES ===' as section;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'baggages'
ORDER BY ordinal_position;

SELECT '=== COLONNES DE LA TABLE INTERNATIONAL_BAGGAGES ===' as section;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'international_baggages'
ORDER BY ordinal_position;

SELECT '=== COLONNES DE LA TABLE BIRS_REPORT_ITEMS ===' as section;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'birs_report_items'
ORDER BY ordinal_position;

-- ========================================
-- 10. FOREIGN KEYS DÉFINIES
-- ========================================
SELECT '=== FOREIGN KEYS ===' as section;

SELECT
    tc.table_name as table_source,
    kcu.column_name as colonne_source,
    ccu.table_name AS table_cible,
    ccu.column_name AS colonne_cible
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- ========================================
-- FIN DU DIAGNOSTIC
-- ========================================
SELECT '=== DIAGNOSTIC TERMINÉ ===' as section;
