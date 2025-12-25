# Création du premier utilisateur support

Pour gérer les approbations d'inscription, vous devez créer un premier utilisateur avec le rôle `support` et `approved = true`.

## Méthode 1: Via Supabase Dashboard (Recommandé)

### Étape 1: Créer l'utilisateur dans Supabase Auth

1. Connectez-vous à votre projet Supabase Dashboard
2. Allez dans **Authentication** > **Users**
3. Cliquez sur **"Add user"** > **"Create new user"**
4. Remplissez :
   - **Email**: `support@bfs.cd` (ou votre email)
   - **Password**: Choisissez un mot de passe sécurisé
   - **Auto Confirm User**: ✅ Cochez cette case
5. Cliquez sur **"Create user"**
6. **Copiez l'ID de l'utilisateur créé** (UUID)

### Étape 2: Créer le profil dans la table users

1. Allez dans **SQL Editor** dans Supabase Dashboard
2. Exécutez cette requête SQL (remplacez les valeurs) :

```sql
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
  'VOTRE_USER_ID_ICI', -- Collez l'ID copié à l'étape 1
  'support@bfs.cd', -- Votre email
  'Administrateur Support', -- Votre nom
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
```

### Étape 3: Vérifier

Exécutez cette requête pour vérifier :

```sql
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
```

Vous devriez voir votre utilisateur avec `approved = true`.

## Méthode 2: Via Script Node.js

Si vous avez Node.js installé :

1. Installez les dépendances :
```bash
npm install @supabase/supabase-js dotenv
```

2. Configurez votre `.env` :
```env
SUPABASE_URL=votre_url_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
```

3. Exécutez le script :
```bash
npx ts-node scripts/create-support-user.ts
```

Le script vous demandera :
- Email
- Mot de passe
- Nom complet

Il créera automatiquement l'utilisateur dans Auth et dans la table users.

## Méthode 3: Via l'API directement

Vous pouvez aussi créer l'utilisateur via une requête HTTP POST vers votre API (si vous avez un endpoint spécial pour ça).

## Après la création

1. Connectez-vous au dashboard avec l'email et mot de passe créés
2. Vous verrez le lien **"Approbations"** dans le menu
3. Vous pourrez approuver/rejeter les demandes d'inscription

## Notes importantes

- ⚠️ Le premier utilisateur support doit être créé manuellement
- 🔒 Utilisez un mot de passe fort
- 👥 Vous pouvez créer plusieurs utilisateurs support si nécessaire
- 🛡️ Seuls les utilisateurs avec `role = 'support'` et `approved = true` peuvent accéder à la page d'approbation

