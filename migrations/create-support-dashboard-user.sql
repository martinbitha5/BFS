-- ========================================
-- Création du compte support pour le Dashboard
-- Email: support@brsats.com
-- Mot de passe: 0827241919mA@
-- Rôle: support (accès complet au Dashboard)
-- ========================================
-- 
-- ⚠️  IMPORTANT: Ce script SQL nécessite que l'utilisateur soit déjà créé dans Supabase Auth
-- 
-- Pour créer l'utilisateur Auth, vous avez 2 options:
-- 
-- OPTION 1 (Recommandé): Utiliser le script Node.js automatique
--   cd api
--   npm run create-support-dashboard-user
--   (Ce script crée automatiquement l'utilisateur Auth ET le profil)
--
-- OPTION 2: Créer manuellement dans Supabase Dashboard, puis exécuter ce SQL
--   1. Allez dans Authentication > Users
--   2. Cliquez sur "Add user" > "Create new user"
--   3. Email: support@brsats.com
--   4. Password: 0827241919mA@
--   5. ✅ Cochez "Auto Confirm User"
--   6. Cliquez sur "Create user"
--   7. Exécutez ce script SQL (il trouvera automatiquement l'ID)
-- ========================================

-- Trouver l'ID de l'utilisateur dans auth.users s'il existe
DO $$
DECLARE
  user_id UUID;
BEGIN
  -- Chercher l'utilisateur dans auth.users par email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = 'support@brsats.com'
  LIMIT 1;

  IF user_id IS NULL THEN
    RAISE EXCEPTION '❌ ERREUR: L''utilisateur avec l''email support@brsats.com n''existe pas dans Supabase Auth. Veuillez d''abord créer l''utilisateur dans Authentication > Users du Dashboard Supabase, ou utilisez le script Node.js: npm run create-support-dashboard-user';
  END IF;

  -- Créer ou mettre à jour le profil dans la table users
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
    'BRSATS Support',
    'ALL', -- Accès à tous les aéroports
    'support',
    true, -- Approuvé automatiquement
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = 'support',
    airport_code = 'ALL',
    approved = true,
    approved_at = COALESCE(users.approved_at, NOW()),
    updated_at = NOW();

  RAISE NOTICE '✅ Compte support créé/mis à jour avec succès! ID: %', user_id;
END $$;

-- ========================================
-- Vérification que le compte support a été créé correctement
-- ========================================
SELECT 
  id,
  email,
  full_name,
  role,
  airport_code,
  approved,
  approved_at,
  created_at,
  CASE 
    WHEN role = 'support' AND approved = true THEN '✅ Rôle support correctement configuré'
    WHEN role = 'support' AND approved = false THEN '⚠️ Rôle support mais non approuvé'
    WHEN role != 'support' THEN '❌ ERREUR: Rôle incorrect'
    ELSE '❓ État inconnu'
  END AS verification_role
FROM users 
WHERE email = 'support@brsats.com';

-- ========================================
-- Vérification finale avec détails
-- ========================================
SELECT 
  '✅ Vérification finale du compte support' AS status,
  COUNT(*) FILTER (WHERE role = 'support' AND approved = true) AS comptes_support_actifs,
  COUNT(*) FILTER (WHERE role = 'support' AND approved = false) AS comptes_support_en_attente,
  COUNT(*) FILTER (WHERE email = 'support@brsats.com' AND role = 'support' AND approved = true) AS compte_support_brsats_actif
FROM users 
WHERE email = 'support@brsats.com' OR role = 'support';

-- ========================================
-- Résumé des permissions du rôle support
-- ========================================
-- Le rôle "support" avec approved = true donne accès à:
-- ✅ Dashboard complet (Vue d'ensemble, Vols, Bagages, Passagers)
-- ✅ BRS International (Dashboard, Rapports, Workflow, Non Matchés, Traçabilité)
-- ✅ Scans Bruts et Export
-- ✅ Menu Approbations (Utilisateurs, Airlines, Bagages)
-- ✅ Accès à tous les aéroports (airport_code = 'ALL')
-- ✅ Toutes les routes API d'approbation (/api/v1/user-approval, /api/v1/airline-approval, /api/v1/baggage-authorization)


