# Guide de correction - Création d'utilisateurs Dashboard

## Problème identifié

La création d'utilisateurs Dashboard (superviseur et baggage_dispute) échoue pour **deux raisons**:

### 1. Contrainte CHECK manquante
Le rôle `baggage_dispute` n'est pas inclus dans la contrainte CHECK de la table `users`.

### 2. Compte support manquant
Le compte support doit exister dans la table `users` pour que la politique RLS "Support can create users" fonctionne.

---

## Solution - Étapes à suivre

### Étape 1: Ouvrir le SQL Editor de Supabase

1. Connectez-vous à: https://supabase.com/dashboard
2. Sélectionnez votre projet: `ncxnouvkjnqldhhrkjcq`
3. Cliquez sur **SQL Editor** dans le menu de gauche
4. Cliquez sur **New Query**

---

### Étape 2: Exécuter la première migration

**Copiez et exécutez ce SQL:**

```sql
-- ========================================
-- Migration 1: Créer le compte support dans users
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
    RAISE WARNING 'Compte support introuvable dans auth.users - Créez-le d''abord';
  END IF;
END $$;

-- Vérifier le résultat
SELECT id, email, full_name, role, is_approved, airport_code
FROM users
WHERE email = 'support@brsats.com';
```

**Résultat attendu:** Vous devriez voir une ligne avec le compte support.

---

### Étape 3: Exécuter la deuxième migration

**Copiez et exécutez ce SQL:**

```sql
-- ========================================
-- Migration 2: Ajouter baggage_dispute à la contrainte CHECK
-- ========================================

-- Supprimer l'ancienne contrainte
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- Recréer la contrainte avec tous les rôles incluant baggage_dispute
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('checkin', 'baggage', 'boarding', 'arrival', 'supervisor', 'baggage_dispute', 'support'));

-- Vérification
SELECT 'Contrainte users_role_check mise à jour avec succès' AS status;

-- Afficher la nouvelle contrainte
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';
```

**Résultat attendu:** Vous devriez voir la contrainte avec tous les rôles incluant `baggage_dispute`.

---

### Étape 4: Vérifier que tout fonctionne

**Copiez et exécutez ce SQL de test:**

```sql
-- Test: Vérifier que la configuration est correcte

-- 1. Vérifier le compte support
SELECT 
  'Support User' AS check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM users WHERE email = 'support@brsats.com' AND role = 'support' AND is_approved = true)
    THEN '✅ OK'
    ELSE '❌ MANQUANT'
  END AS status;

-- 2. Vérifier la contrainte CHECK
SELECT 
  'Role Constraint' AS check_type,
  CASE 
    WHEN pg_get_constraintdef(oid) LIKE '%baggage_dispute%'
    THEN '✅ OK'
    ELSE '❌ MANQUANT'
  END AS status
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

-- 3. Vérifier la politique RLS INSERT
SELECT 
  'RLS Policy' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND policyname = 'Support can create users'
      AND cmd = 'INSERT'
    )
    THEN '✅ OK'
    ELSE '❌ MANQUANTE'
  END AS status;
```

**Résultat attendu:** Tous les statuts doivent être `✅ OK`.

---

## Test depuis le Dashboard

Après avoir exécuté les migrations:

1. Connectez-vous au Dashboard avec le compte support
2. Allez dans **Administration**
3. Essayez de créer:
   - Un **Superviseur** avec un aéroport spécifique (ex: FIH)
   - Un **Litige Bagages** (tous les aéroports)

Les deux créations devraient maintenant fonctionner.

---

## Si le compte support n'existe pas dans auth.users

Si la première migration indique que le compte support n'existe pas dans `auth.users`, créez-le d'abord:

```sql
-- Créer le compte support dans auth.users (si nécessaire)
-- Note: Remplacez 'VotreMotDePasse' par un mot de passe sécurisé

-- Cette opération doit être faite via le dashboard Supabase:
-- Authentication > Users > Add user
-- Email: support@brsats.com
-- Password: [votre mot de passe sécurisé]
-- Auto Confirm User: OUI
```

Puis réexécutez la Migration 1.

---

## Fichiers de référence

- Migration 1: `migrations/ensure-support-user-in-table.sql`
- Migration 2: `migrations/fix-baggage-dispute-role-constraint.sql`
- Schéma corrigé: `database-schema.sql` (lignes 12 et 234)

---

## Support

Si vous rencontrez des erreurs:

1. Copiez le message d'erreur complet
2. Vérifiez que vous êtes connecté avec les droits administrateur
3. Assurez-vous d'exécuter les migrations dans l'ordre (1 puis 2)
