# Guide : Vider complètement la base de données

⚠️ **ATTENTION** : Cette opération supprime **TOUTES** les données de **TOUTES** les tables. Cette opération est **IRRÉVERSIBLE**.

## 📋 Vue d'ensemble

Ce guide explique comment vider complètement votre base de données Supabase, y compris :
- Tous les utilisateurs (agents, superviseurs)
- Toutes les compagnies aériennes
- Tous les passagers
- Tous les bagages (nationaux et internationaux)
- Tous les rapports BIRS
- Tous les scans bruts
- Toutes les demandes d'inscription
- Tous les utilisateurs Auth (Supabase Authentication)

## 🗂️ Fichiers créés

1. **`migrations/clear-all-database-data.sql`** : Script SQL pour supprimer toutes les données des tables
2. **`api/scripts/clear-auth-users.ts`** : Script TypeScript pour supprimer tous les utilisateurs Auth

## 📝 Étapes pour vider la base de données

### Étape 1 : Exécuter le script SQL dans Supabase

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Ouvrez le fichier `migrations/clear-all-database-data.sql`
4. Copiez tout le contenu
5. Collez-le dans l'éditeur SQL de Supabase
6. Cliquez sur **Run** ou appuyez sur `Ctrl+Enter`

Le script va :
- Supprimer toutes les données dans l'ordre correct (en respectant les foreign keys)
- Afficher un message de confirmation pour chaque table vidée
- Afficher un rapport final avec le nombre d'enregistrements restants (devrait être 0)

### Étape 2 : Supprimer les utilisateurs Auth

Les utilisateurs dans la table `users` ont été supprimés, mais les comptes dans `auth.users` (Supabase Auth) doivent être supprimés séparément.

#### Option A : Utiliser le script TypeScript (recommandé)

```bash
cd api
npx ts-node scripts/clear-auth-users.ts
```

Ce script va :
- Lister tous les utilisateurs Auth par lots de 1000
- Supprimer chaque utilisateur un par un
- Afficher un rapport final avec le nombre d'utilisateurs supprimés

**Prérequis** :
- Les variables `SUPABASE_URL` et `SUPABASE_SERVICE_KEY` doivent être définies dans `api/.env`
- La clé `SUPABASE_SERVICE_KEY` doit être la clé **SERVICE_ROLE** (pas la clé anon)

#### Option B : Utiliser le Dashboard Supabase

1. Allez dans **Authentication** > **Users**
2. Sélectionnez tous les utilisateurs (ou utilisez les filtres)
3. Cliquez sur **Delete** (ou supprimez-les un par un)

#### Option C : Utiliser l'API Supabase Admin (programmatique)

Si vous avez besoin d'automatiser cette opération, vous pouvez utiliser l'API Admin :

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'VOTRE_SUPABASE_URL',
  'VOTRE_SUPABASE_SERVICE_KEY' // Clé SERVICE_ROLE
);

// Lister tous les utilisateurs
const { data: { users } } = await supabase.auth.admin.listUsers();

// Supprimer chaque utilisateur
for (const user of users) {
  await supabase.auth.admin.deleteUser(user.id);
}
```

## ✅ Vérification

Après avoir exécuté les deux scripts, vérifiez que toutes les tables sont vides :

```sql
-- Vérifier le nombre d'enregistrements dans chaque table
SELECT 'users' AS table_name, COUNT(*) AS count FROM users
UNION ALL SELECT 'airlines', COUNT(*) FROM airlines
UNION ALL SELECT 'passengers', COUNT(*) FROM passengers
UNION ALL SELECT 'baggages', COUNT(*) FROM baggages
UNION ALL SELECT 'international_baggages', COUNT(*) FROM international_baggages
UNION ALL SELECT 'boarding_status', COUNT(*) FROM boarding_status
UNION ALL SELECT 'birs_reports', COUNT(*) FROM birs_reports
UNION ALL SELECT 'birs_report_items', COUNT(*) FROM birs_report_items
UNION ALL SELECT 'raw_scans', COUNT(*) FROM raw_scans;
```

Tous les compteurs devraient être à **0**.

Pour vérifier les utilisateurs Auth, allez dans **Authentication** > **Users** dans le Dashboard Supabase. La liste devrait être vide.

## 🔄 Réinitialiser après le nettoyage

Après avoir vidé la base de données, vous pouvez :

1. **Créer un compte support** (si nécessaire) :
   ```bash
   # Exécuter dans Supabase SQL Editor
   # Voir migrations/create-support-airline-account.sql
   ```

2. **Créer des utilisateurs de test** :
   - Utiliser l'API d'inscription
   - Ou créer manuellement via le Dashboard Supabase

3. **Créer des compagnies aériennes de test** :
   - Utiliser le portail airline
   - Ou créer directement dans la table `airlines`

## ⚠️ Avertissements

- **Cette opération est IRRÉVERSIBLE** : Une fois les données supprimées, elles ne peuvent pas être récupérées (sauf si vous avez une sauvegarde)
- **Sauvegardez vos données** avant d'exécuter ces scripts si vous avez besoin de les conserver
- **Testez d'abord sur un environnement de développement** si possible
- **Vérifiez que vous êtes connecté au bon projet Supabase** avant d'exécuter les scripts

## 🆘 Problèmes courants

### Erreur : "permission denied for table"
- **Solution** : Assurez-vous d'utiliser la clé **SERVICE_ROLE** (pas la clé anon) pour le script TypeScript
- Vérifiez que vous avez les droits d'administration dans Supabase

### Erreur : "foreign key constraint violation"
- **Solution** : Le script SQL devrait gérer cela automatiquement en supprimant dans le bon ordre
- Si l'erreur persiste, vérifiez que toutes les tables sont bien supprimées dans l'ordre

### Le script TypeScript ne trouve pas les variables d'environnement
- **Solution** : Vérifiez que `api/.env` contient bien `SUPABASE_URL` et `SUPABASE_SERVICE_KEY`
- Assurez-vous d'exécuter le script depuis le répertoire `api/`

## 📞 Support

Si vous rencontrez des problèmes, vérifiez :
1. Les logs dans la console Supabase SQL Editor
2. Les logs du script TypeScript dans votre terminal
3. Les politiques RLS (Row Level Security) qui pourraient bloquer les suppressions

