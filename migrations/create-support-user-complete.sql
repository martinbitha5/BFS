-- ========================================
-- Script: Créer le profil utilisateur support
-- Email: support@brsats.com
-- ========================================

-- ÉTAPE 1: Trouver l'ID de l'utilisateur créé dans Supabase Auth
-- Dans Supabase Dashboard > Authentication > Users
-- Trouvez l'utilisateur avec l'email "support@brsats.com"
-- Copiez son ID (UUID) et remplacez-le dans la requête ci-dessous

-- ÉTAPE 2: Exécutez cette requête en remplaçant 'VOTRE_USER_ID_ICI' par l'ID copié

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
  'VOTRE_USER_ID_ICI', -- ⚠️ REMPLACEZ par l'ID de l'utilisateur (voir étape 1)
  'support@brsats.com',
  'Administrateur Support',
  'ALL', -- Accès à tous les aéroports
  'support',
  true, -- Approuvé automatiquement
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'support',
  approved = true,
  approved_at = COALESCE(users.approved_at, NOW());

-- ÉTAPE 3: Vérifier que l'utilisateur a été créé correctement
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

-- Si vous voyez votre utilisateur avec approved = true, c'est bon ! ✅

