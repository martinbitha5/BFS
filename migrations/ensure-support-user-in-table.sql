-- ========================================
-- Migration: Vérifier et créer le compte support dans la table users
-- Date: 2026-01-06
-- Description: Le compte support doit exister dans users pour que la politique RLS fonctionne
-- ========================================

-- Vérifier si le compte support existe dans auth.users
DO $$
DECLARE
  support_auth_id UUID;
BEGIN
  -- Récupérer l'ID du compte support depuis auth.users
  SELECT id INTO support_auth_id
  FROM auth.users
  WHERE email = 'support@brsats.com'
  LIMIT 1;

  IF support_auth_id IS NOT NULL THEN
    -- Vérifier si le compte existe déjà dans users
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = support_auth_id) THEN
      -- Insérer le compte support dans users
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
      RAISE NOTICE 'Compte support créé dans la table users avec ID: %', support_auth_id;
    ELSE
      RAISE NOTICE 'Compte support existe déjà dans users';
    END IF;
  ELSE
    RAISE WARNING 'Compte support introuvable dans auth.users';
  END IF;
END $$;

-- Vérifier le résultat
SELECT id, email, full_name, role, is_approved, airport_code
FROM users
WHERE email = 'support@brsats.com';
