-- ========================================
-- BFS - Script de nettoyage complet de la base de données
-- ⚠️  ATTENTION : Ce script supprime TOUTES les données de TOUTES les tables
-- ⚠️  Cette opération est IRRÉVERSIBLE
-- ========================================
-- 
-- Ce script supprime dans l'ordre :
-- 1. Toutes les données des tables enfants (avec foreign keys)
-- 2. Toutes les données des tables parentes
-- 3. Tous les utilisateurs (users et auth.users)
-- 4. Toutes les compagnies aériennes (airlines)
-- 5. Toutes les demandes d'inscription
--
-- ⚠️  EXÉCUTER AVEC PRÉCAUTION - TOUTES LES DONNÉES SERONT PERDUES
-- ========================================

BEGIN;

-- ========================================
-- ÉTAPE 1 : Supprimer les données des tables enfants (avec foreign keys)
-- ========================================

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

-- Supprimer les scans bruts
DELETE FROM raw_scans;
SELECT '✅ raw_scans vidée' AS status;

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
-- ÉTAPE 2 : Supprimer les demandes d'inscription
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
-- ÉTAPE 3 : Supprimer les compagnies aériennes
-- ========================================

DELETE FROM airlines;
SELECT '✅ airlines vidée' AS status;

-- ========================================
-- ÉTAPE 4 : Supprimer les utilisateurs (users)
-- ⚠️  Les utilisateurs dans auth.users seront supprimés manuellement ou via l'API Admin
-- ========================================

DELETE FROM users;
SELECT '✅ users vidée' AS status;

-- ========================================
-- ÉTAPE 5 : Réinitialiser les séquences (si nécessaire)
-- ========================================

-- Note: Les séquences UUID ne nécessitent pas de réinitialisation
-- Mais si vous avez des séquences numériques, vous pouvez les réinitialiser ici
-- Exemple: ALTER SEQUENCE IF EXISTS table_name_id_seq RESTART WITH 1;

-- ========================================
-- VÉRIFICATION : Compter les enregistrements restants
-- ========================================

SELECT 
    'users' AS table_name,
    COUNT(*) AS remaining_records
FROM users
UNION ALL
SELECT 
    'airlines',
    COUNT(*)
FROM airlines
UNION ALL
SELECT 
    'passengers',
    COUNT(*)
FROM passengers
UNION ALL
SELECT 
    'baggages',
    COUNT(*)
FROM baggages
UNION ALL
SELECT 
    'international_baggages',
    COUNT(*)
FROM international_baggages
UNION ALL
SELECT 
    'boarding_status',
    COUNT(*)
FROM boarding_status
UNION ALL
SELECT 
    'birs_reports',
    COUNT(*)
FROM birs_reports
UNION ALL
SELECT 
    'birs_report_items',
    COUNT(*)
FROM birs_report_items
UNION ALL
SELECT 
    'raw_scans',
    COUNT(*)
FROM raw_scans;

-- ========================================
-- FIN DU SCRIPT
-- ========================================

COMMIT;

-- ========================================
-- ⚠️  IMPORTANT : Supprimer les utilisateurs de Supabase Auth
-- ========================================
-- 
-- Les utilisateurs dans la table `users` ont été supprimés,
-- mais les comptes dans `auth.users` (Supabase Auth) doivent être supprimés séparément.
--
-- Pour supprimer tous les utilisateurs Auth, vous pouvez :
-- 1. Utiliser l'API Supabase Admin dans votre application
-- 2. Utiliser le dashboard Supabase (Authentication > Users > Delete)
-- 3. Exécuter ce script via l'API Admin Supabase :
--
--   ```javascript
--   const { data: { users } } = await supabase.auth.admin.listUsers();
--   for (const user of users) {
--     await supabase.auth.admin.deleteUser(user.id);
--   }
--   ```
--
-- ========================================

SELECT '✅ ✅ ✅ NETTOYAGE TERMINÉ ✅ ✅ ✅' AS status;
SELECT '⚠️  N''oubliez pas de supprimer les utilisateurs dans Supabase Auth (auth.users)' AS reminder;

