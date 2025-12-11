-- ============================================
-- NETTOYAGE COMPLET DES DONNÉES BIRS
-- ============================================
-- ATTENTION: Cette opération est IRRÉVERSIBLE !
-- Sauvegardez vos données importantes avant d'exécuter

-- 1. Supprimer tous les rapports BIRS
DELETE FROM birs_reports;
DELETE FROM birs_report_items;

-- 2. Supprimer tous les bagages internationaux (optionnel)
-- Décommentez si vous voulez aussi nettoyer les bagages
-- DELETE FROM international_baggages;

-- 3. Réinitialiser les séquences (si vous utilisez des SERIAL)
-- ALTER SEQUENCE birs_reports_id_seq RESTART WITH 1;
-- ALTER SEQUENCE birs_report_items_id_seq RESTART WITH 1;

-- 4. Vérifier que tout est vide
SELECT 'birs_reports' as table_name, COUNT(*) as remaining_rows FROM birs_reports
UNION ALL
SELECT 'birs_report_items' as table_name, COUNT(*) as remaining_rows FROM birs_report_items;

-- Message de confirmation
SELECT '✅ Nettoyage terminé - Toutes les données BIRS ont été supprimées' as status;
