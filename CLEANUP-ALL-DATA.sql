-- ========================================
-- CLEANUP: Suppression de toutes les données sauf support@brsats.com
-- ========================================

-- 1. Récupérer l'ID du support user
-- SELECT id FROM users WHERE email = 'support@brsats.com';

-- 2. Supprimer toutes les demandes d'enregistrement d'airlines
DELETE FROM airline_registration_requests;

-- 3. Supprimer toutes les compagnies aériennes
DELETE FROM airlines;

-- 4. Supprimer les logs d'audit (sauf ceux du support)
DELETE FROM audit_logs 
WHERE user_id != (SELECT id FROM users WHERE email = 'support@brsats.com');

-- 5. Supprimer les demandes d'autorisation de bagages
DELETE FROM baggage_authorization_requests;

-- 6. Supprimer les scans bruts
DELETE FROM raw_scans;

-- 7. Supprimer les bagages
DELETE FROM baggages;

-- 8. Supprimer les passagers
DELETE FROM passengers;

-- 9. Supprimer tous les utilisateurs sauf support
DELETE FROM users 
WHERE email != 'support@brsats.com';

-- 10. Vérifier les résultats
SELECT 'Users:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Airlines', COUNT(*) FROM airlines
UNION ALL
SELECT 'Airline Registration Requests', COUNT(*) FROM airline_registration_requests
UNION ALL
SELECT 'Passengers', COUNT(*) FROM passengers
UNION ALL
SELECT 'Baggages', COUNT(*) FROM baggages
UNION ALL
SELECT 'Raw Scans', COUNT(*) FROM raw_scans
UNION ALL
SELECT 'Audit Logs', COUNT(*) FROM audit_logs
UNION ALL
SELECT 'Baggage Auth Requests', COUNT(*) FROM baggage_authorization_requests;

-- ========================================
-- Résultat attendu:
-- Users: 1 (support@brsats.com)
-- Airlines: 0
-- Airline Registration Requests: 0
-- Passengers: 0
-- Baggages: 0
-- Raw Scans: 0
-- Audit Logs: quelques lignes du support
-- Baggage Auth Requests: 0
-- ========================================
