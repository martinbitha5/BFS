-- ========================================
-- FIX: Correction des RLS policies pour airline_registration_requests
-- Problème: La policy "Support can manage airline registration requests" 
-- utilise FOR ALL sans WITH CHECK, ce qui empêche les INSERT
-- ========================================

-- 1. Supprimer les anciennes policies problématiques
DROP POLICY IF EXISTS "Support can manage airline registration requests" ON airline_registration_requests;
DROP POLICY IF EXISTS "Support can view all airline registration requests" ON airline_registration_requests;
DROP POLICY IF EXISTS "Airlines can view own registration request" ON airline_registration_requests;
DROP POLICY IF EXISTS "Allow service role to insert airline registration requests" ON airline_registration_requests;
DROP POLICY IF EXISTS "Support can update airline registration requests" ON airline_registration_requests;

-- 2. Créer une policy pour les INSERT (permet à la clé de service de créer des demandes)
CREATE POLICY "Allow service role to insert airline registration requests"
ON airline_registration_requests FOR INSERT
WITH CHECK (true);

-- 3. Créer une policy pour les SELECT (support peut voir toutes les demandes)
CREATE POLICY "Support can view all airline registration requests"
ON airline_registration_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'support'
    AND u.is_approved = true
  )
  OR auth.jwt() ->> 'role' = 'service_role'
);

-- 4. Créer une policy pour les UPDATE (support peut mettre à jour les demandes)
CREATE POLICY "Support can update airline registration requests"
ON airline_registration_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'support'
    AND u.is_approved = true
  )
  OR auth.jwt() ->> 'role' = 'service_role'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'support'
    AND u.is_approved = true
  )
  OR auth.jwt() ->> 'role' = 'service_role'
);

-- 5. Vérifier que RLS est activée
ALTER TABLE airline_registration_requests ENABLE ROW LEVEL SECURITY;

-- ========================================
-- FIX: Correction des RLS policies pour airlines
-- Problème: La table airlines a une RLS policy trop restrictive
-- ========================================

-- 1. Supprimer les anciennes policies sur airlines
DROP POLICY IF EXISTS "Airlines can view own data" ON airlines;
DROP POLICY IF EXISTS "Airlines can update own data" ON airlines;
DROP POLICY IF EXISTS "Anyone can view approved airlines" ON airlines;
DROP POLICY IF EXISTS "Allow service role to insert airlines" ON airlines;

-- 2. Créer une policy pour les SELECT (tout le monde peut voir les airlines approuvées)
CREATE POLICY "Anyone can view approved airlines"
ON airlines FOR SELECT
USING (approved = true OR auth.jwt() ->> 'role' = 'service_role');

-- 3. Créer une policy pour les INSERT (permet à la clé de service de créer des airlines)
CREATE POLICY "Allow service role to insert airlines"
ON airlines FOR INSERT
WITH CHECK (true);

-- 4. Créer une policy pour les UPDATE (airlines peuvent mettre à jour leurs données)
CREATE POLICY "Airlines can update own data"
ON airlines FOR UPDATE
USING (
  id = auth.uid()
  OR auth.jwt() ->> 'role' = 'service_role'
)
WITH CHECK (
  id = auth.uid()
  OR auth.jwt() ->> 'role' = 'service_role'
);

-- 5. Vérifier que RLS est activée
ALTER TABLE airlines ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Vérification: Afficher les policies actuelles
-- ========================================
-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('airline_registration_requests', 'airlines')
-- ORDER BY tablename, policyname;
