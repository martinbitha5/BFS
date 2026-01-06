-- ========================================
-- Désactiver RLS sur birs_reports et birs_report_items
-- ========================================

-- Désactiver RLS pour permettre les uploads de rapports BIRS
ALTER TABLE birs_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE birs_report_items DISABLE ROW LEVEL SECURITY;

-- Vérification
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '❌ RLS activé'
    ELSE '✅ RLS désactivé'
  END AS rls_status
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('birs_reports', 'birs_report_items')
ORDER BY tablename;
