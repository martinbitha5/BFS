-- ========================================
-- Fix: Désactiver RLS sur flight_schedule
-- ========================================

-- Le problème est le même que pour users et birs_reports
-- Les politiques RLS avec récursion bloquent les insertions
-- Solution: Désactiver RLS, la sécurité est assurée par l'API

-- Désactiver RLS sur flight_schedule
ALTER TABLE flight_schedule DISABLE ROW LEVEL SECURITY;

-- Vérification
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '❌ RLS activé'
    ELSE '✅ RLS désactivé'
  END AS rls_status
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'flight_schedule';
