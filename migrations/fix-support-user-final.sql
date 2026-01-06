-- ========================================
-- Correction finale du compte support (sans suppression)
-- ========================================

-- 1. Vérifier si le compte support existe dans auth.users et users
DO $$
DECLARE
  support_auth_id UUID;
  support_exists BOOLEAN;
BEGIN
  -- Récupérer l'ID depuis auth.users
  SELECT id INTO support_auth_id
  FROM auth.users
  WHERE email = 'support@brsats.com'
  LIMIT 1;

  IF support_auth_id IS NULL THEN
    RAISE EXCEPTION 'Compte support introuvable dans auth.users. Créez-le via Authentication > Users';
  END IF;

  -- Vérifier si le compte existe déjà dans users
  SELECT EXISTS (SELECT 1 FROM users WHERE id = support_auth_id) INTO support_exists;

  IF support_exists THEN
    -- Mettre à jour l'enregistrement existant
    UPDATE users 
    SET 
      email = 'support@brsats.com',
      full_name = 'Support BFS',
      airport_code = 'ALL',
      role = 'support',
      is_approved = true,
      approved_at = COALESCE(approved_at, NOW()),
      updated_at = NOW()
    WHERE id = support_auth_id;
    
    RAISE NOTICE 'Compte support mis à jour avec ID: %', support_auth_id;
  ELSE
    -- Insérer le nouveau compte
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
    
    RAISE NOTICE 'Compte support créé avec ID: %', support_auth_id;
  END IF;
END $$;

-- 2. Corriger la contrainte CHECK (ajouter baggage_dispute)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('checkin', 'baggage', 'boarding', 'arrival', 'supervisor', 'baggage_dispute', 'support'));

-- 3. Recréer la politique RLS INSERT
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

-- 4. Vérification finale
SELECT 
  '=== VÉRIFICATION FINALE ===' AS titre;

SELECT 
  id,
  email,
  full_name,
  role,
  is_approved,
  airport_code,
  created_at
FROM users
WHERE email = 'support@brsats.com';

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM users WHERE email = 'support@brsats.com' AND role = 'support' AND is_approved = true)
    THEN '✅ Compte support OK'
    ELSE '❌ Compte support manquant ou non approuvé'
  END AS support_status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Support can create users' AND cmd = 'INSERT')
    THEN '✅ Politique RLS INSERT OK'
    ELSE '❌ Politique RLS INSERT manquante'
  END AS rls_status;

SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';
