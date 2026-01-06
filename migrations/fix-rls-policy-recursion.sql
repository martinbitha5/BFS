-- ========================================
-- Correction: Politique RLS sans récursion
-- ========================================

-- Le problème: La politique RLS fait un SELECT sur users pour vérifier auth.uid()
-- Cela crée une récursion car pour faire le SELECT, il faut vérifier les politiques RLS de SELECT
-- Solution: Utiliser une approche différente

-- 1. Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Support can create users" ON users;

-- 2. Créer une nouvelle politique qui ne fait PAS de SELECT sur users
-- On vérifie directement si l'utilisateur connecté a le rôle support
-- en utilisant les métadonnées JWT ou une fonction

-- Option A: Politique permissive pour le support (utilise service_role implicitement)
CREATE POLICY "Support can create users"
ON users FOR INSERT
TO authenticated
WITH CHECK (
  -- Vérifier que l'utilisateur qui insère est bien support
  -- On ne peut pas faire de SELECT sur users ici car ça crée une récursion
  -- Solution: utiliser une fonction qui bypass RLS
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'support' AND is_approved = true
  )
);

-- 3. Si la solution ci-dessus ne fonctionne pas à cause de la récursion,
-- utiliser une fonction SECURITY DEFINER qui bypass RLS

CREATE OR REPLACE FUNCTION is_support_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id 
    AND role = 'support' 
    AND is_approved = true
  );
END;
$$;

-- Supprimer et recréer la politique avec la fonction
DROP POLICY IF EXISTS "Support can create users" ON users;

CREATE POLICY "Support can create users"
ON users FOR INSERT
TO authenticated
WITH CHECK (
  is_support_user(auth.uid())
);

-- 4. Vérification
SELECT 
  '=== VÉRIFICATION POLITIQUE RLS ===' AS section;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
AND policyname = 'Support can create users';

-- 5. Test de la fonction
SELECT 
  '=== TEST FONCTION is_support_user ===' AS section;

SELECT 
  id,
  email,
  role,
  is_support_user(id) AS can_create_users
FROM users
WHERE email = 'support@brsats.com';
