-- ========================================
-- BFS - Script de nettoyage complet de la base de données
-- ⚠️  ATTENTION : Ce script supprime TOUTES les données SAUF l'utilisateur support@brsats.com
-- ⚠️  Cette opération est IRRÉVERSIBLE
-- ========================================
-- 
-- Ce script :
-- 1. Désactive temporairement les RLS (Row Level Security) pour permettre la suppression
-- 2. Supprime toutes les données des tables enfants (avec foreign keys)
-- 3. Supprime toutes les données des tables parentes
-- 4. Préserve uniquement l'utilisateur support@brsats.com
-- 5. Réactive les RLS
--
-- Tables nettoyées :
-- - audit_logs
-- - birs_report_items
-- - birs_reports
-- - international_baggages
-- - baggages
-- - boarding_status
-- - raw_scans
-- - passengers
-- - flight_schedule
-- - baggage_authorization_requests
-- - user_registration_requests
-- - airline_registration_requests
-- - airlines
-- - users (sauf support@brsats.com)
--
-- ⚠️  EXÉCUTER AVEC PRÉCAUTION - TOUTES LES DONNÉES SERONT PERDUES
-- ========================================

BEGIN;

-- ========================================
-- ÉTAPE 1 : Désactiver temporairement les RLS pour permettre la suppression
-- ========================================

ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE birs_report_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE birs_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE international_baggages DISABLE ROW LEVEL SECURITY;
ALTER TABLE baggages DISABLE ROW LEVEL SECURITY;
ALTER TABLE boarding_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE passengers DISABLE ROW LEVEL SECURITY;
ALTER TABLE airlines DISABLE ROW LEVEL SECURITY;
ALTER TABLE airline_registration_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_registration_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE baggage_authorization_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS pour raw_scans si la table existe
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'raw_scans') THEN
        ALTER TABLE raw_scans DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Désactiver RLS pour flight_schedule si la table existe
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'flight_schedule') THEN
        ALTER TABLE flight_schedule DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

SELECT '✅ RLS désactivées temporairement' AS status;

-- ========================================
-- ÉTAPE 2 : Supprimer les données des tables enfants (avec foreign keys)
-- ========================================

-- Supprimer les logs d'audit
DELETE FROM audit_logs;
SELECT '✅ audit_logs vidée' AS status;

-- Supprimer les items des rapports BIRS
DELETE FROM birs_report_items;
SELECT '✅ birs_report_items vidée' AS status;

-- Supprimer les rapports BIRS
DELETE FROM birs_reports;
SELECT '✅ birs_reports vidée' AS status;

-- Supprimer les bagages internationaux
DELETE FROM international_baggages;
SELECT '✅ international_baggages vidée' AS status;

-- Supprimer les bagages nationaux
DELETE FROM baggages;
SELECT '✅ baggages vidée' AS status;

-- Supprimer les statuts d'embarquement
DELETE FROM boarding_status;
SELECT '✅ boarding_status vidée' AS status;

-- Supprimer les scans bruts (si la table existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'raw_scans') THEN
        DELETE FROM raw_scans;
        RAISE NOTICE '✅ raw_scans vidée';
    END IF;
END $$;

-- Supprimer les passagers
DELETE FROM passengers;
SELECT '✅ passengers vidée' AS status;

-- Supprimer les exceptions BRS (si la table existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'brs_exceptions') THEN
        DELETE FROM brs_exceptions;
        RAISE NOTICE '✅ brs_exceptions vidée';
    END IF;
END $$;

-- Supprimer les étapes de workflow BRS (si la table existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'brs_workflow_steps') THEN
        DELETE FROM brs_workflow_steps;
        RAISE NOTICE '✅ brs_workflow_steps vidée';
    END IF;
END $$;

-- Supprimer les transferts BRS (si la table existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'brs_transfers') THEN
        DELETE FROM brs_transfers;
        RAISE NOTICE '✅ brs_transfers vidée';
    END IF;
END $$;

-- Supprimer les notifications BRS (si la table existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'brs_notifications') THEN
        DELETE FROM brs_notifications;
        RAISE NOTICE '✅ brs_notifications vidée';
    END IF;
END $$;

-- Supprimer les horaires de vol (si la table existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'flight_schedule') THEN
        DELETE FROM flight_schedule;
        RAISE NOTICE '✅ flight_schedule vidée';
    END IF;
END $$;

-- ========================================
-- ÉTAPE 3 : Supprimer les demandes d'inscription
-- ========================================

-- Supprimer les demandes d'inscription utilisateurs
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_registration_requests') THEN
        DELETE FROM user_registration_requests;
        RAISE NOTICE '✅ user_registration_requests vidée';
    END IF;
END $$;

-- Supprimer les demandes d'inscription compagnies aériennes
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'airline_registration_requests') THEN
        DELETE FROM airline_registration_requests;
        RAISE NOTICE '✅ airline_registration_requests vidée';
    END IF;
END $$;

-- Supprimer les demandes d'autorisation bagages
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'baggage_authorization_requests') THEN
        DELETE FROM baggage_authorization_requests;
        RAISE NOTICE '✅ baggage_authorization_requests vidée';
    END IF;
END $$;

-- ========================================
-- ÉTAPE 4 : Supprimer les compagnies aériennes
-- ========================================

DELETE FROM airlines;
SELECT '✅ airlines vidée' AS status;

-- ========================================
-- ÉTAPE 5 : Supprimer tous les utilisateurs SAUF support@brsats.com
-- ========================================

-- Supprimer tous les utilisateurs sauf support@brsats.com
DELETE FROM users 
WHERE email != 'support@brsats.com';

SELECT '✅ users vidée (sauf support@brsats.com)' AS status;

-- Vérifier que l'utilisateur support existe toujours
DO $$
DECLARE
    support_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO support_count FROM users WHERE email = 'support@brsats.com';
    
    IF support_count = 0 THEN
        RAISE WARNING '⚠️  ATTENTION: L''utilisateur support@brsats.com n''existe pas dans la base de données!';
        RAISE WARNING '⚠️  Vous devrez créer cet utilisateur manuellement après le nettoyage.';
    ELSE
        RAISE NOTICE '✅ Utilisateur support@brsats.com préservé';
    END IF;
END $$;

-- ========================================
-- ÉTAPE 6 : Réactiver les RLS
-- ========================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE birs_report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE birs_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE international_baggages ENABLE ROW LEVEL SECURITY;
ALTER TABLE baggages ENABLE ROW LEVEL SECURITY;
ALTER TABLE boarding_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE airline_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE baggage_authorization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Réactiver RLS pour raw_scans si la table existe
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'raw_scans') THEN
        ALTER TABLE raw_scans ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Réactiver RLS pour flight_schedule si la table existe
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'flight_schedule') THEN
        ALTER TABLE flight_schedule ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

SELECT '✅ RLS réactivées' AS status;

-- ========================================
-- VÉRIFICATION : Compter les enregistrements restants
-- ========================================

SELECT 
    'users' AS table_name,
    COUNT(*) AS remaining_records,
    STRING_AGG(email, ', ') AS preserved_users
FROM users
UNION ALL
SELECT 
    'airlines',
    COUNT(*),
    NULL
FROM airlines
UNION ALL
SELECT 
    'passengers',
    COUNT(*),
    NULL
FROM passengers
UNION ALL
SELECT 
    'baggages',
    COUNT(*),
    NULL
FROM baggages
UNION ALL
SELECT 
    'international_baggages',
    COUNT(*),
    NULL
FROM international_baggages
UNION ALL
SELECT 
    'boarding_status',
    COUNT(*),
    NULL
FROM boarding_status
UNION ALL
SELECT 
    'birs_reports',
    COUNT(*),
    NULL
FROM birs_reports
UNION ALL
SELECT 
    'birs_report_items',
    COUNT(*),
    NULL
FROM birs_report_items
UNION ALL
SELECT 
    'audit_logs',
    COUNT(*),
    NULL
FROM audit_logs;

-- Vérifier raw_scans si la table existe
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'raw_scans') THEN
        RAISE NOTICE 'raw_scans: % enregistrements', (SELECT COUNT(*) FROM raw_scans);
    END IF;
END $$;

-- Vérifier flight_schedule si la table existe
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'flight_schedule') THEN
        RAISE NOTICE 'flight_schedule: % enregistrements', (SELECT COUNT(*) FROM flight_schedule);
    END IF;
END $$;

-- ========================================
-- FIN DU SCRIPT
-- ========================================

COMMIT;

-- ========================================
-- ⚠️  IMPORTANT : Supprimer les utilisateurs de Supabase Auth
-- ========================================
-- 
-- Les utilisateurs dans la table `users` ont été supprimés (sauf support@brsats.com),
-- mais les comptes dans `auth.users` (Supabase Auth) doivent être supprimés séparément.
--
-- Pour supprimer tous les utilisateurs Auth SAUF support@brsats.com, vous pouvez :
-- 1. Utiliser l'API Supabase Admin dans votre application
-- 2. Utiliser le dashboard Supabase (Authentication > Users > Delete individuellement)
-- 3. Exécuter ce script via l'API Admin Supabase :
--
--   ```javascript
--   const { data: { users } } = await supabase.auth.admin.listUsers();
--   for (const user of users) {
--     if (user.email !== 'support@brsats.com') {
--       await supabase.auth.admin.deleteUser(user.id);
--     }
--   }
--   ```
--
-- ========================================

SELECT '✅ ✅ ✅ NETTOYAGE TERMINÉ ✅ ✅ ✅' AS status;
SELECT '✅ Utilisateur support@brsats.com préservé' AS preserved;
SELECT '⚠️  N''oubliez pas de supprimer les autres utilisateurs dans Supabase Auth (auth.users)' AS reminder;
