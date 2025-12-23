-- ========================================
-- Script: Créer le premier utilisateur support
-- Description: Crée un utilisateur support approuvé pour gérer les approbations
-- IMPORTANT: Suivez les étapes ci-dessous dans l'ordre
-- ========================================

-- ========================================
-- ÉTAPE 1: Créer l'utilisateur dans Supabase Auth
-- ========================================
--   1. Allez dans Authentication > Users dans Supabase Dashboard
--   2. Cliquez sur "Add user" > "Create new user"
--   3. Entrez l'email et le mot de passe
--   4. ✅ Cochez "Auto Confirm User" (important!)
--   5. Cliquez sur "Create user"
--   6. 📋 COPIEZ L'ID de l'utilisateur créé (UUID) - vous en aurez besoin à l'étape 2

-- ========================================
-- ÉTAPE 2: Créer le profil dans la table users
-- ========================================
-- Exécutez cette requête SQL en remplaçant les valeurs :
--   - 'VOTRE_USER_ID_ICI' → L'ID copié à l'étape 1
--   - 'support@bfs.cd' → Votre email
--   - 'Administrateur Support' → Votre nom complet

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
  'VOTRE_USER_ID_ICI', -- ⚠️ REMPLACEZ par l'ID de l'utilisateur Supabase Auth (étape 1)
  'support@bfs.cd', -- ⚠️ REMPLACEZ par votre email
  'Administrateur Support', -- ⚠️ REMPLACEZ par votre nom complet
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

-- ========================================
-- ÉTAPE 3: Vérifier que l'utilisateur a été créé
-- ========================================
-- Exécutez cette requête pour vérifier :

SELECT 
  id,
  email,
  full_name,
  role,
  approved,
  approved_at,
  airport_code
FROM users
WHERE role = 'support'
ORDER BY created_at DESC;

-- Vous devriez voir votre utilisateur avec approved = true
-- Si c'est le cas, vous pouvez maintenant vous connecter au dashboard !
