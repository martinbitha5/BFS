-- Script pour vider TOUTE la base de données BFS
-- ⚠️ ATTENTION: Ceci supprimera TOUTES les données !
-- À exécuter dans le SQL Editor de Supabase

-- 1. Supprimer tous les bagages internationaux
DELETE FROM international_baggages;

-- 2. Supprimer tous les bagages normaux
DELETE FROM baggages;

-- 3. Supprimer tous les passagers
DELETE FROM passengers;

-- 4. Supprimer tous les raw scans
DELETE FROM raw_scans;

-- 5. Supprimer toutes les sync queues
DELETE FROM sync_queue;

-- 6. Supprimer tous les audit logs (optionnel)
DELETE FROM audit_logs;

-- 7. Réinitialiser les compteurs si nécessaire
-- (Optionnel, seulement si vous voulez réinitialiser les séquences)

-- Vérifier que tout est vide
SELECT 'international_baggages' as table_name, COUNT(*) as count FROM international_baggages
UNION ALL
SELECT 'baggages', COUNT(*) FROM baggages
UNION ALL
SELECT 'passengers', COUNT(*) FROM passengers
UNION ALL
SELECT 'raw_scans', COUNT(*) FROM raw_scans
UNION ALL
SELECT 'sync_queue', COUNT(*) FROM sync_queue
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs;
