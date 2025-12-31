-- ========================================
-- CLEANUP: Suppression de toutes les compagnies aériennes
-- ========================================

-- 1. Supprimer toutes les demandes d'enregistrement
DELETE FROM airline_registration_requests;

-- 2. Supprimer toutes les compagnies aériennes
DELETE FROM airlines;

-- 3. Réinitialiser les séquences (si applicable)
-- Note: Les UUIDs n'ont pas de séquences, mais on peut réinitialiser les auto-increment si nécessaire

-- 4. Vérifier que tout est supprimé
SELECT COUNT(*) as airlines_count FROM airlines;
SELECT COUNT(*) as registration_requests_count FROM airline_registration_requests;

-- ========================================
-- Résultat attendu: 0 lignes dans les deux tables
-- ========================================
