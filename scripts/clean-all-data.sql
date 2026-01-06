-- ============================================
-- Script pour nettoyer TOUTES les données scannées et ajoutées
-- ATTENTION: Ceci supprime TOUTES les données de test
-- ============================================

-- 1. Supprimer tous les raw scans
DELETE FROM raw_scans;

-- 2. Supprimer tous les statuts d'embarquement
DELETE FROM boarding_status;

-- 3. Supprimer tous les bagages
DELETE FROM baggages;

-- 4. Supprimer tous les passagers
DELETE FROM passengers;

-- 5. Supprimer tous les vols programmés
DELETE FROM flight_schedule;

-- 6. Supprimer tous les rapports BIRS et leurs items
DELETE FROM birs_report_items;
DELETE FROM birs_reports;

-- 7. Réinitialiser les séquences (optionnel, pour repartir à 1)
-- ALTER SEQUENCE raw_scans_id_seq RESTART WITH 1;
-- ALTER SEQUENCE boarding_status_id_seq RESTART WITH 1;
-- ALTER SEQUENCE baggages_id_seq RESTART WITH 1;
-- ALTER SEQUENCE passengers_id_seq RESTART WITH 1;
-- ALTER SEQUENCE flight_schedule_id_seq RESTART WITH 1;
-- ALTER SEQUENCE birs_reports_id_seq RESTART WITH 1;
-- ALTER SEQUENCE birs_report_items_id_seq RESTART WITH 1;

-- Vérification: Compter les enregistrements restants
SELECT 
  'raw_scans' as table_name, COUNT(*) as count FROM raw_scans
UNION ALL
SELECT 'boarding_status', COUNT(*) FROM boarding_status
UNION ALL
SELECT 'baggages', COUNT(*) FROM baggages
UNION ALL
SELECT 'passengers', COUNT(*) FROM passengers
UNION ALL
SELECT 'flight_schedule', COUNT(*) FROM flight_schedule
UNION ALL
SELECT 'birs_reports', COUNT(*) FROM birs_reports
UNION ALL
SELECT 'birs_report_items', COUNT(*) FROM birs_report_items;
