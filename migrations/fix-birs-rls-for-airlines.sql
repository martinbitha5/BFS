-- ========================================
-- Migration: Autoriser les airlines à uploader des rapports BIRS
-- Date: 2026-01-06
-- Description: Ajouter une politique RLS pour permettre aux airlines d'uploader des rapports BIRS
-- ========================================

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Supervisors can create birs reports" ON birs_reports;

-- Créer une nouvelle politique qui autorise :
-- 1. Les superviseurs (users avec role = 'supervisor')
-- 2. Les airlines (via leur token JWT, même si pas dans users)
CREATE POLICY "Supervisors and airlines can create birs reports"
ON birs_reports FOR INSERT
WITH CHECK (
  -- Autoriser les superviseurs
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.airport_code = birs_reports.airport_code
    AND u.role = 'supervisor'
  )
  OR
  -- Autoriser les airlines (vérifier qu'ils ont un token valide)
  -- Les airlines ont un auth.uid() mais pas d'entrée dans users
  (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid()
    )
  )
);

-- Vérification
SELECT 'Policy updated successfully' AS status;

-- Afficher les politiques actuelles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'birs_reports'
ORDER BY policyname;
