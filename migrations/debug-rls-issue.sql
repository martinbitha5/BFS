-- ========================================
-- Debug: Vérifier pourquoi la politique RLS bloque
-- ========================================

-- 1. Afficher le compte support dans users
SELECT 
  '=== COMPTE SUPPORT DANS USERS ===' AS section,
  id,
  email,
  full_name,
  role,
  is_approved,
  airport_code
FROM users
WHERE email = 'support@brsats.com';

-- 2. Afficher le compte support dans auth.users
SELECT 
  '=== COMPTE SUPPORT DANS AUTH.USERS ===' AS section,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'support@brsats.com';

-- 3. Vérifier si les IDs correspondent
SELECT 
  '=== VÉRIFICATION CORRESPONDANCE IDS ===' AS section,
  CASE 
    WHEN u.id = au.id THEN '✅ IDs correspondent'
    ELSE '❌ IDs NE correspondent PAS - PROBLÈME CRITIQUE'
  END AS id_match,
  u.id AS user_table_id,
  au.id AS auth_table_id
FROM users u
FULL OUTER JOIN auth.users au ON u.email = au.email
WHERE u.email = 'support@brsats.com' OR au.email = 'support@brsats.com';

-- 4. Afficher toutes les politiques RLS sur users
SELECT 
  '=== POLITIQUES RLS SUR USERS ===' AS section,
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- 5. Test de la politique RLS (simuler ce que fait la politique)
-- Note: Cette requête ne peut pas être exécutée car auth.uid() n'est disponible que dans le contexte d'une requête authentifiée
SELECT 
  '=== SIMULATION POLITIQUE RLS ===' AS section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM users u
      WHERE u.email = 'support@brsats.com'
      AND u.role = 'support'
      AND u.is_approved = true
    ) THEN '✅ La politique devrait autoriser (si auth.uid() correspond)'
    ELSE '❌ La politique bloquera'
  END AS policy_check;
