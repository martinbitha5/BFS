# Solution temporaire - Désactiver RLS pour tester

Si les politiques RLS continuent de bloquer, voici une solution temporaire pour tester:

## Option 1: Désactiver RLS temporairement sur users

```sql
-- ATTENTION: Ceci désactive la sécurité RLS temporairement
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

Testez la création d'utilisateurs. Si ça fonctionne, le problème est bien la politique RLS.

Puis réactivez:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

## Option 2: Politique RLS permissive pour support

```sql
-- Supprimer toutes les politiques INSERT
DROP POLICY IF EXISTS "Support can create users" ON users;

-- Créer une politique très permissive pour tester
CREATE POLICY "Support can create users"
ON users FOR INSERT
TO authenticated
WITH CHECK (
  -- Permet à n'importe quel utilisateur authentifié d'insérer
  -- TEMPORAIRE POUR TEST UNIQUEMENT
  true
);
```

Si ça fonctionne, on sait que le problème est la vérification du rôle support.

## Option 3: Utiliser l'API avec service_role key

L'API utilise probablement la clé `anon` de Supabase. Pour bypass RLS, elle devrait utiliser la clé `service_role`.

Vérifier dans `/api/src/config/database.ts`:
- Si elle utilise `SUPABASE_ANON_KEY` → RLS s'applique
- Si elle utilise `SUPABASE_SERVICE_ROLE_KEY` → RLS est bypassé

## Solution définitive recommandée

Après avoir identifié le problème, la solution définitive sera de:

1. Utiliser `service_role` key dans l'API pour les opérations admin
2. OU créer une fonction PostgreSQL `create_user_by_support()` avec SECURITY DEFINER
3. OU corriger la politique RLS pour qu'elle fonctionne sans récursion

## Test immédiat

Exécutez dans Supabase SQL Editor:

```sql
-- Test 1: Désactiver RLS temporairement
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Maintenant testez la création depuis le Dashboard
-- Si ça marche, le problème est confirmé: c'est la politique RLS

-- Après le test, réactiver:
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```
