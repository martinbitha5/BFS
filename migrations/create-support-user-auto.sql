-- ========================================
-- Script AUTOMATIQUE: Créer le profil utilisateur support
-- Email: support@brsats.com
-- Ce script trouve automatiquement l'ID depuis auth.users
-- ========================================

-- Cette fonction trouve l'ID de l'utilisateur par email et crée le profil
DO $$
DECLARE
  user_id UUID;
BEGIN
  -- Trouver l'ID de l'utilisateur dans auth.users par email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = 'support@brsats.com'
  LIMIT 1;

  -- Si l'utilisateur existe, créer/ mettre à jour le profil
  IF user_id IS NOT NULL THEN
    INSERT INTO users (
      id,
      email,
      full_name,
      airport_code,
      role,
      approved,
      approved_at,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      'support@brsats.com',
      'Administrateur Support',
      'ALL',
      'support',
      true,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'support',
      approved = true,
      approved_at = COALESCE(users.approved_at, NOW());

    RAISE NOTICE '✅ Utilisateur support créé avec succès ! ID: %', user_id;
  ELSE
    RAISE EXCEPTION '❌ Utilisateur avec email support@brsats.com non trouvé dans auth.users. Vérifiez que vous avez bien créé l''utilisateur dans Authentication > Users';
  END IF;
END $$;

-- Vérifier que l'utilisateur a été créé
SELECT 
  id,
  email,
  full_name,
  role,
  approved,
  approved_at,
  airport_code,
  created_at
FROM users
WHERE email = 'support@brsats.com'
ORDER BY created_at DESC;

