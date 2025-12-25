# 🧪 Scripts de Test Massifs - Guide d'utilisation

## 📋 Vue d'ensemble

Ces scripts permettent de tester massivement le système BFS avec :
- **1 million d'agents** avec différents rôles
- **Tests de restrictions** par rôle et par aéroport
- **Tests de flux complets** (checkin → baggage → boarding → arrival)
- **Tests des portails** (Dashboard et Airline Portal)

## 🚀 Installation

Assurez-vous que toutes les dépendances sont installées :

```bash
cd api
npm install
```

## ⚙️ Configuration

Avant d'exécuter les tests, vérifiez que votre fichier `.env` contient :

```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_KEY=votre_service_key
API_URL=http://localhost:3000
```

## 📝 Scripts disponibles

### 1. Test Massif du Flux Complet

**Commande :**
```bash
npm run test-massive
```

**Ce que fait ce script :**
- Génère 1 million d'agents avec différents rôles (checkin, baggage, boarding, arrival, supervisor)
- Répartit les agents sur 10 aéroports différents
- Crée les utilisateurs dans Supabase Auth et la table `users`
- Teste les restrictions par rôle :
  - Accès aux passagers (checkin, supervisor uniquement)
  - Création de passagers (checkin, supervisor uniquement)
  - Accès aux bagages (baggage, checkin, supervisor)
  - Accès aux routes d'approbation (support uniquement)
- Teste les restrictions par aéroport :
  - Accès aux données de son propre aéroport
  - Refus d'accès aux données d'autres aéroports
- Teste le flux complet :
  - Check-in d'un passager
  - Enregistrement d'un bagage
  - Boarding du passager
  - Arrival du bagage

**⚠️ ATTENTION :** 
- La création de 1 million d'utilisateurs peut prendre **très longtemps** (plusieurs heures)
- Pour tester rapidement, modifiez `CONFIG.TOTAL_USERS` dans le script à 100 ou 1000
- Le script crée par défaut seulement 100 utilisateurs pour les tests

**Résultat :**
Le script génère un rapport détaillé avec :
- Nombre d'utilisateurs créés par rôle
- Nombre de tests réussis/échoués
- Liste des erreurs rencontrées

### 2. Test des Portails

**Commande :**
```bash
npm run test-portals
```

**Ce que fait ce script :**
- Teste l'authentification Dashboard (supervisor)
- Teste les restrictions d'accès Dashboard (checkin ne peut pas accéder aux approbations)
- Teste l'authentification Airline Portal
- Teste l'upload BIRS (endpoint accessible)
- Teste l'accès à l'historique BIRS

**Résultat :**
Rapport avec le nombre de tests réussis/échoués pour chaque portail.

## 🔧 Personnalisation

### Modifier le nombre d'utilisateurs

Dans `api/scripts/test-massive-flow.ts`, modifiez :

```typescript
const CONFIG = {
  TOTAL_USERS: 1000000, // Changez ici (100, 1000, 10000, etc.)
  BATCH_SIZE: 1000,
  // ...
};
```

### Modifier les aéroports testés

```typescript
AIRPORTS: ['FIH', 'GOM', 'KIN', 'LAD', 'BZV', 'NDJ', 'BGF', 'BKO', 'DLA', 'ABJ'],
```

### Modifier les rôles testés

```typescript
ROLES: ['checkin', 'baggage', 'boarding', 'arrival', 'supervisor'] as UserRole[],
```

## 📊 Exemple de sortie

```
🚀 Démarrage du test massif du flux complet
Configuration: 1000000 utilisateurs, 5 rôles, 10 aéroports
Génération de 1000000 utilisateurs...
✅ Génération terminée: 1000000 utilisateurs créés
Répartition par rôle: {"checkin":200000,"baggage":200000,...}

🧪 Test des restrictions par rôle...
✅ Rôle checkin: Accès aux passagers: OK
✅ Rôle baggage: Accès refusé aux passagers: OK
...

📊 RAPPORT DE TEST COMPLET
Total d'utilisateurs créés: 1000000
Total de tests: 150
Tests réussis: 148 (98.67%)
Tests échoués: 2 (1.33%)
```

## 🐛 Dépannage

### Erreur: "SUPABASE_URL must be defined"
- Vérifiez que votre fichier `.env` contient `SUPABASE_URL` et `SUPABASE_SERVICE_KEY`

### Erreur: "Rate limit exceeded"
- Supabase a des limites de taux. Réduisez `BATCH_SIZE` ou `TOTAL_USERS`
- Attendez quelques minutes entre les lots

### Erreur: "Cannot find module"
- Exécutez `npm install` dans le dossier `api/`

### Les tests échouent
- Vérifiez que l'API tourne : `curl http://localhost:3000/health`
- Vérifiez les logs de l'API : `pm2 logs bfs-api`
- Vérifiez que les tables Supabase existent

## 📝 Notes importantes

1. **Nettoyage** : Les utilisateurs de test sont créés avec l'email `test-*@bfs-test.com`. Vous pouvez les supprimer avec :
   ```sql
   DELETE FROM users WHERE email LIKE 'test-%@bfs-test.com';
   ```

2. **Performance** : Pour 1 million d'utilisateurs, prévoyez plusieurs heures d'exécution

3. **Base de données** : Assurez-vous d'avoir assez d'espace dans Supabase

4. **Production** : Ne jamais exécuter ces scripts en production !

## 🎯 Prochaines étapes

Après avoir exécuté les tests :
1. Vérifiez le rapport généré
2. Corrigez les erreurs identifiées
3. Réexécutez les tests pour valider les corrections
4. Documentez les résultats

