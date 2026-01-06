-- ========================================
-- Migration: Correction du rôle support et RLS
-- Date: 2026-01-06
-- Description: Ajoute le rôle 'support' et corrige les RLS pour baggage_authorization_requests
-- ========================================

-- ========================================
-- ÉTAPE 1: Ajouter le rôle 'support' à la table users
-- ========================================

-- Supprimer l'ancienne contrainte
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Ajouter la nouvelle contrainte avec le rôle 'support'
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('checkin', 'baggage', 'boarding', 'arrival', 'supervisor', 'support'));

SELECT '✅ Rôle support ajouté à la contrainte users' AS status;

-- ========================================
-- ÉTAPE 2: Ajouter approved à la table users si manquant
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'approved'
  ) THEN
    ALTER TABLE users ADD COLUMN approved BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Colonne approved ajoutée à users';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne approved existe déjà';
  END IF;
END
$$;

-- ========================================
-- ÉTAPE 3: Corriger les RLS pour baggage_authorization_requests
-- ========================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view airport baggage authorization requests" ON baggage_authorization_requests;
DROP POLICY IF EXISTS "Users can create baggage authorization requests" ON baggage_authorization_requests;
DROP POLICY IF EXISTS "Support can manage baggage authorization requests" ON baggage_authorization_requests;

-- Policy: Les utilisateurs peuvent voir les demandes de leur aéroport
CREATE POLICY "Users can view airport baggage authorization requests"
ON baggage_authorization_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = baggage_authorization_requests.airport_code
  )
);

-- Policy: Les utilisateurs peuvent créer des demandes pour leur aéroport
CREATE POLICY "Users can create baggage authorization requests"
ON baggage_authorization_requests FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = baggage_authorization_requests.airport_code
  )
);

-- Policy: Support peut gérer TOUTES les demandes (lecture, création, modification, suppression)
CREATE POLICY "Support can manage all baggage authorization requests"
ON baggage_authorization_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'support'
    AND (u.approved = true OR u.is_approved = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'support'
    AND (u.approved = true OR u.is_approved = true)
  )
);

-- Policy: Superviseurs peuvent aussi gérer les demandes de leur aéroport
CREATE POLICY "Supervisors can manage airport baggage authorization requests"
ON baggage_authorization_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'supervisor'
    AND u.airport_code = baggage_authorization_requests.airport_code
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'supervisor'
    AND u.airport_code = baggage_authorization_requests.airport_code
  )
);

SELECT '✅ RLS corrigées pour baggage_authorization_requests' AS status;

-- ========================================
-- ÉTAPE 4: Vérification
-- ========================================

-- Vérifier la contrainte du rôle
SELECT 
  constraint_name, 
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'users_role_check';

-- Vérifier les policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'baggage_authorization_requests'
ORDER BY policyname;

-- Compter les utilisateurs support
SELECT 
  COUNT(*) as total_support_users,
  COUNT(*) FILTER (WHERE approved = true OR is_approved = true) as approved_support_users
FROM users
WHERE role = 'support';

SELECT '✅ ✅ ✅ CORRECTIONS TERMINÉES ✅ ✅ ✅' AS status;
