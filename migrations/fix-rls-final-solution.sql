-- ========================================
-- Solution finale: Politique RLS simplifiée
-- ========================================

-- Le problème persiste car même avec SECURITY DEFINER, il y a des restrictions
-- Solution: Créer une politique plus permissive pour les utilisateurs authentifiés avec rôle support

-- 1. D'abord, vérifier que le compte support existe et est correct
DO $$
DECLARE
  support_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO support_count
  FROM users
  WHERE email = 'support@brsats.com'
  AND role = 'support'
  AND is_approved = true;
  
  IF support_count = 0 THEN
    RAISE EXCEPTION 'Compte support introuvable ou non approuvé dans users';
  ELSE
    RAISE NOTICE 'Compte support trouvé et approuvé';
  END IF;
END $$;

-- 2. Supprimer toutes les anciennes politiques INSERT sur users
DROP POLICY IF EXISTS "Support can create users" ON users;
DROP POLICY IF EXISTS "Users can create users" ON users;
DROP POLICY IF EXISTS "Allow support to create users" ON users;

-- 3. Créer une politique INSERT très simple qui vérifie juste le JWT
-- On utilise jwt_claim pour extraire directement du token
CREATE POLICY "Support can create users"
ON users FOR INSERT
TO authenticated
WITH CHECK (
  -- Vérifier que l'utilisateur connecté a le rôle support dans la base
  -- On utilise une sous-requête simple
  (SELECT role FROM users WHERE id = auth.uid()) = 'support'
  AND
  (SELECT is_approved FROM users WHERE id = auth.uid()) = true
);

-- 4. Alternative: Si la solution ci-dessus ne fonctionne toujours pas,
-- créer une politique qui permet à TOUS les utilisateurs authentifiés d'insérer
-- (temporairement pour tester)
-- DROP POLICY IF EXISTS "Support can create users" ON users;
-- CREATE POLICY "Support can create users"
-- ON users FOR INSERT
-- TO authenticated
-- WITH CHECK (true);

-- 5. Vérification
SELECT 
  '=== POLITIQUES RLS SUR USERS ===' AS section;

SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- 6. Vérifier que le compte support peut être trouvé
SELECT 
  '=== COMPTE SUPPORT ===' AS section;

SELECT 
  id,
  email,
  role,
  is_approved,
  airport_code
FROM users
WHERE email = 'support@brsats.com';
