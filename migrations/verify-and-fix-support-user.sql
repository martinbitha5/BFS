-- ========================================
-- Vérification et correction complète du compte support
-- ========================================

-- 1. Vérifier si le compte support existe dans auth.users
SELECT 'Compte support dans auth.users:' AS info;
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'support@brsats.com';

-- 2. Vérifier si le compte support existe dans users
SELECT 'Compte support dans users:' AS info;
SELECT id, email, full_name, role, is_approved, airport_code
FROM users
WHERE email = 'support@brsats.com';

-- 3. Si le compte n'existe pas dans users, le créer
DO $$
DECLARE
  support_auth_id UUID;
BEGIN
  -- Récupérer l'ID depuis auth.users
  SELECT id INTO support_auth_id
  FROM auth.users
  WHERE email = 'support@brsats.com'
  LIMIT 1;

  IF support_auth_id IS NULL THEN
    RAISE EXCEPTION 'Compte support introuvable dans auth.users. Créez-le d''abord via Authentication > Users';
  END IF;

  -- Supprimer l'ancien enregistrement s'il existe (pour éviter les doublons)
  DELETE FROM users WHERE email = 'support@brsats.com';

  -- Insérer le compte support
  INSERT INTO users (id, email, full_name, airport_code, role, is_approved, approved_at)
  VALUES (
    support_auth_id,
    'support@brsats.com',
    'Support BFS',
    'ALL',
    'support',
    true,
    NOW()
  );

  RAISE NOTICE 'Compte support créé/recréé avec ID: %', support_auth_id;
END $$;

-- 4. Vérifier la politique RLS INSERT
SELECT 'Politique RLS INSERT sur users:' AS info;
SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users'
AND cmd = 'INSERT'
ORDER BY policyname;

-- 5. Recréer la politique RLS si nécessaire
DROP POLICY IF EXISTS "Support can create users" ON users;

CREATE POLICY "Support can create users"
ON users FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'support'
    AND u.is_approved = true
  )
);

-- 6. Vérification finale
SELECT 'Vérification finale:' AS info;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE email = 'support@brsats.com' 
      AND role = 'support' 
      AND is_approved = true
    ) THEN '✅ Compte support OK'
    ELSE '❌ Compte support manquant'
  END AS support_user_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND policyname = 'Support can create users'
      AND cmd = 'INSERT'
    ) THEN '✅ Politique RLS OK'
    ELSE '❌ Politique RLS manquante'
  END AS rls_policy_status;
