-- ========================================
-- Migration: Ajouter politique RLS INSERT pour la table users
-- Date: 2026-01-06
-- Description: Permettre au support de créer des utilisateurs via l'API
-- ========================================

-- Supprimer l'ancienne politique si elle existe
DROP POLICY IF EXISTS "Support can create users" ON users;

-- Créer une politique permettant au support de créer des utilisateurs
-- Le support peut créer des utilisateurs pour n'importe quel aéroport
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

-- Vérification
SELECT 'RLS INSERT policy for users created successfully' AS status;

-- Afficher les politiques actuelles sur users
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
