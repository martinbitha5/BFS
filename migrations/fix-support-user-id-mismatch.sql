-- ========================================
-- Correction: Synchroniser l'ID du compte support
-- ========================================

-- Cette migration corrige le problème si l'ID dans users ne correspond pas à l'ID dans auth.users

DO $$
DECLARE
  auth_support_id UUID;
  user_support_id UUID;
  has_references BOOLEAN;
BEGIN
  -- Récupérer l'ID depuis auth.users
  SELECT id INTO auth_support_id
  FROM auth.users
  WHERE email = 'support@brsats.com'
  LIMIT 1;

  IF auth_support_id IS NULL THEN
    RAISE EXCEPTION 'Compte support introuvable dans auth.users';
  END IF;

  -- Récupérer l'ID depuis users
  SELECT id INTO user_support_id
  FROM users
  WHERE email = 'support@brsats.com'
  LIMIT 1;

  IF user_support_id IS NULL THEN
    -- Le compte n'existe pas dans users, le créer
    INSERT INTO users (id, email, full_name, airport_code, role, is_approved, approved_at)
    VALUES (
      auth_support_id,
      'support@brsats.com',
      'Support BFS',
      'ALL',
      'support',
      true,
      NOW()
    );
    RAISE NOTICE 'Compte support créé avec ID: %', auth_support_id;
    
  ELSIF user_support_id != auth_support_id THEN
    -- Les IDs ne correspondent pas - PROBLÈME CRITIQUE
    RAISE NOTICE 'ATTENTION: ID mismatch détecté!';
    RAISE NOTICE 'ID dans auth.users: %', auth_support_id;
    RAISE NOTICE 'ID dans users: %', user_support_id;
    
    -- Vérifier si l'ancien ID est référencé ailleurs
    SELECT EXISTS (
      SELECT 1 FROM airlines WHERE approved_by = user_support_id
      UNION ALL
      SELECT 1 FROM users WHERE approved_by = user_support_id
      UNION ALL
      SELECT 1 FROM audit_logs WHERE user_id = user_support_id
    ) INTO has_references;
    
    IF has_references THEN
      -- L'ancien ID est référencé, mettre à jour les références
      RAISE NOTICE 'Mise à jour des références de l''ancien ID vers le nouveau...';
      
      -- Mettre à jour les références dans airlines
      UPDATE airlines SET approved_by = auth_support_id WHERE approved_by = user_support_id;
      
      -- Mettre à jour les références dans users (approved_by)
      UPDATE users SET approved_by = auth_support_id WHERE approved_by = user_support_id;
      
      -- Mettre à jour les références dans audit_logs
      UPDATE audit_logs SET user_id = auth_support_id WHERE user_id = user_support_id;
      
      RAISE NOTICE 'Références mises à jour';
    END IF;
    
    -- Supprimer l'ancien enregistrement
    DELETE FROM users WHERE id = user_support_id;
    RAISE NOTICE 'Ancien enregistrement supprimé';
    
    -- Créer le nouveau avec le bon ID
    INSERT INTO users (id, email, full_name, airport_code, role, is_approved, approved_at)
    VALUES (
      auth_support_id,
      'support@brsats.com',
      'Support BFS',
      'ALL',
      'support',
      true,
      NOW()
    );
    RAISE NOTICE 'Nouveau compte créé avec le bon ID: %', auth_support_id;
    
  ELSE
    -- Les IDs correspondent, juste mettre à jour pour être sûr
    UPDATE users 
    SET 
      role = 'support',
      is_approved = true,
      approved_at = COALESCE(approved_at, NOW()),
      airport_code = 'ALL',
      updated_at = NOW()
    WHERE id = auth_support_id;
    RAISE NOTICE 'Compte support mis à jour (ID correct: %)', auth_support_id;
  END IF;
END $$;

-- Vérification finale
SELECT 
  '=== VÉRIFICATION FINALE ===' AS section;

SELECT 
  u.id AS user_id,
  au.id AS auth_id,
  CASE 
    WHEN u.id = au.id THEN '✅ IDs correspondent'
    ELSE '❌ IDs ne correspondent pas'
  END AS id_status,
  u.email,
  u.role,
  u.is_approved
FROM users u
JOIN auth.users au ON u.email = au.email
WHERE u.email = 'support@brsats.com';
