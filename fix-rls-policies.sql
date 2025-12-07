-- ========================================
-- FIX: Correction des politiques RLS pour éviter la récursion
-- ========================================

-- 1. Supprimer toutes les anciennes politiques sur users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Supervisors can view airport users" ON users;

-- 2. Désactiver temporairement RLS sur users pour permettre l'inscription
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- OU

-- 3. Utiliser des politiques simples sans récursion
-- Politique : Tout utilisateur authentifié peut lire son propre profil
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Politique : Tout utilisateur authentifié peut mettre à jour son propre profil
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Politique : Permettre l'insertion lors de l'inscription (via service_role de l'API)
-- Note: L'API utilise SUPABASE_SERVICE_KEY qui bypass RLS
-- Donc pas besoin de politique INSERT pour les utilisateurs normaux

-- Si vous voulez activer RLS, utilisez cette approche:
-- Les nouvelles inscriptions se font via l'API qui utilise service_role
-- donc RLS sera bypassé pour les INSERT

-- Réactiver RLS (optionnel - à activer seulement si nécessaire)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
