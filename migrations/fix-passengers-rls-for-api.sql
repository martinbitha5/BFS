-- ========================================
-- Migration: Autoriser les insertions via service_role pour passengers
-- ========================================
-- 
-- Problème: L'API utilise service_role key mais la politique RLS
-- vérifie auth.uid() qui n'existe pas dans ce contexte.
--
-- Solution: Ajouter une politique qui permet les insertions via service_role
--

-- 1. S'assurer que RLS est activé
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques INSERT si elles existent
DROP POLICY IF EXISTS "Users can create passengers" ON passengers;
DROP POLICY IF EXISTS "API can create passengers" ON passengers;
DROP POLICY IF EXISTS "Service role can manage passengers" ON passengers;

-- 3. Créer une politique INSERT permissive pour le service_role
-- Le service_role est utilisé par l'API backend pour les opérations de sync
CREATE POLICY "Service role can manage passengers"
ON passengers FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Recréer la politique pour les utilisateurs authentifiés (checkin/supervisor)
CREATE POLICY "Users can create passengers"
ON passengers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = passengers.airport_code
    AND u.role IN ('checkin', 'supervisor')
  )
);

-- 5. Vérification
SELECT '=== POLITIQUES RLS SUR PASSENGERS ===' AS section;

SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'passengers'
ORDER BY cmd, policyname;

-- 6. Vérifier le statut RLS
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS activé'
    ELSE '❌ RLS désactivé'
  END AS rls_status
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'passengers';
