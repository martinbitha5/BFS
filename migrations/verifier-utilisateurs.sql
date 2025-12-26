-- ========================================
-- Script de vérification des utilisateurs
-- ========================================

-- Vérifier les utilisateurs dans la table publique users
SELECT 
    'Table publique users' AS source,
    COUNT(*) AS nombre_utilisateurs
FROM users;

-- Vérifier les utilisateurs dans auth.users (nécessite des droits admin)
-- Note: Cette requête peut ne pas fonctionner selon vos permissions
SELECT 
    'Auth users (si accessible)' AS source,
    COUNT(*) AS nombre_utilisateurs
FROM auth.users;

-- Lister les utilisateurs de la table publique (si il y en a)
SELECT 
    id,
    email,
    full_name,
    role,
    airport_code,
    approved,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 20;

-- Vérifier toutes les tables pour voir s'il reste des données
SELECT 
    'users' AS table_name,
    COUNT(*) AS count
FROM users
UNION ALL
SELECT 'airlines', COUNT(*) FROM airlines
UNION ALL
SELECT 'passengers', COUNT(*) FROM passengers
UNION ALL
SELECT 'baggages', COUNT(*) FROM baggages
UNION ALL
SELECT 'international_baggages', COUNT(*) FROM international_baggages
UNION ALL
SELECT 'boarding_status', COUNT(*) FROM boarding_status
UNION ALL
SELECT 'birs_reports', COUNT(*) FROM birs_reports
UNION ALL
SELECT 'birs_report_items', COUNT(*) FROM birs_report_items
UNION ALL
SELECT 'raw_scans', COUNT(*) FROM raw_scans
ORDER BY table_name;

