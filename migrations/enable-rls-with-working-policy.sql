-- ========================================
-- Réactiver RLS avec une politique qui fonctionne
-- ========================================

-- Maintenant qu'on a confirmé que le problème était RLS,
-- on va créer une politique qui fonctionne correctement

-- 1. Réactiver RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les anciennes politiques INSERT
DROP POLICY IF EXISTS "Support can create users" ON users;
DROP POLICY IF EXISTS "Users can create users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON users;

-- 3. Créer une politique qui permet l'insertion via service_role
-- La clé service_role devrait bypass RLS automatiquement,
-- mais on crée une politique permissive au cas où

CREATE POLICY "Support can create users"
ON users FOR INSERT
WITH CHECK (
  -- Permettre si c'est via service_role (l'API utilise cette clé)
  -- OU si l'utilisateur connecté est support
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR
  (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role = 'support' 
      AND is_approved = true
    )
  )
);

-- 4. Vérification
SELECT 
  '=== VÉRIFICATION RLS ===' AS section;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'users' 
      AND rowsecurity = true
    ) THEN '✅ RLS activé sur users'
    ELSE '❌ RLS désactivé'
  END AS rls_status;

SELECT 
  policyname,
  cmd,
  permissive,
  with_check
FROM pg_policies
WHERE tablename = 'users'
AND cmd = 'INSERT';

-- 5. Note importante
SELECT 
  '=== NOTE IMPORTANTE ===' AS section,
  'La politique permet les insertions via service_role key (utilisée par l''API)' AS note1,
  'ET aussi via les utilisateurs support authentifiés (pour le futur)' AS note2;
