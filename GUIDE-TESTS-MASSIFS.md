# 🧪 Guide de Test Massif - Validation Complète du Système

## 📋 Résumé

J'ai créé **2 scripts de test complets** pour valider tout le système BFS :

1. **`test-massive-flow.ts`** : Test massif avec 1M d'agents + restrictions + flux complets
2. **`test-portals.ts`** : Test des portails (Dashboard + Airline Portal)

## 🚀 Utilisation Rapide

### Test Massif (Flux complet + Restrictions)

```bash
cd api
npm run test-massive
```

**Ce script teste :**
- ✅ Génération de 1 million d'agents avec différents rôles
- ✅ Restrictions par rôle (checkin, baggage, boarding, arrival, supervisor, support)
- ✅ Restrictions par aéroport (accès uniquement à son aéroport)
- ✅ Flux complet (checkin → baggage → boarding → arrival)
- ✅ Validation que chaque rôle ne peut accéder qu'aux fonctionnalités autorisées

### Test des Portails

```bash
cd api
npm run test-portals
```

**Ce script teste :**
- ✅ Authentification Dashboard (supervisor)
- ✅ Restrictions Dashboard (checkin ne peut pas accéder aux approbations)
- ✅ Authentification Airline Portal
- ✅ Upload BIRS (endpoint accessible)
- ✅ Historique BIRS (accès autorisé)

## ⚙️ Configuration

### Pour tester rapidement (recommandé pour commencer)

Dans `api/scripts/test-massive-flow.ts`, ligne ~60, modifiez :

```typescript
const CONFIG = {
  TOTAL_USERS: 100, // Au lieu de 1000000 pour tester rapidement
  // ...
};
```

### Pour tester avec 1 million d'utilisateurs

Laissez `TOTAL_USERS: 1000000` mais **attention** :
- ⏱️ Cela peut prendre **plusieurs heures**
- 💾 Assurez-vous d'avoir assez d'espace Supabase
- 🔄 Le script crée par lots de 1000 pour éviter les timeouts

## 📊 Ce qui est testé

### Restrictions par Rôle

| Rôle | Accès Passagers | Création Passagers | Accès Bagages | Accès Approbations |
|------|----------------|-------------------|--------------|-------------------|
| checkin | ✅ | ✅ | ✅ | ❌ |
| baggage | ❌ | ❌ | ✅ | ❌ |
| boarding | ❌ | ❌ | ❌ | ❌ |
| arrival | ❌ | ❌ | ✅ | ❌ |
| supervisor | ✅ | ✅ | ✅ | ❌ |
| support | ✅ | ✅ | ✅ | ✅ |

### Restrictions par Aéroport

- ✅ Un agent de FIH peut accéder aux données de FIH
- ❌ Un agent de FIH **ne peut pas** accéder aux données de GOM
- ✅ Les données sont automatiquement filtrées par aéroport

### Flux Complet

1. **Check-in** : Un agent checkin crée un passager
2. **Baggage** : Un agent baggage enregistre le bagage du passager
3. **Boarding** : Un agent boarding embarque le passager
4. **Arrival** : Un agent arrival confirme l'arrivée du bagage

Chaque étape est validée et les erreurs sont rapportées.

## 📈 Rapport Généré

Après l'exécution, vous obtiendrez :

```
📊 RAPPORT DE TEST COMPLET
═══════════════════════════════════════════════════════════
Total d'utilisateurs créés: 1000000
Répartition par rôle:
  - checkin: 200000
  - baggage: 200000
  - boarding: 200000
  - arrival: 200000
  - supervisor: 200000

Total de tests: 150
Tests réussis: 148 (98.67%)
Tests échoués: 2 (1.33%)

❌ Erreurs rencontrées:
  1. Rôle baggage: Accès aux passagers: Accès autorisé alors que refusé attendu
  2. ...
═══════════════════════════════════════════════════════════
```

## 🔧 Personnalisation

### Modifier les aéroports testés

Dans `test-massive-flow.ts` :

```typescript
AIRPORTS: ['FIH', 'GOM', 'KIN', 'LAD', 'BZV', 'NDJ', 'BGF', 'BKO', 'DLA', 'ABJ'],
```

### Ajouter des tests personnalisés

Ajoutez vos propres tests dans les fonctions :
- `testRoleRestrictions()` : Tests de restrictions par rôle
- `testAirportRestrictions()` : Tests de restrictions par aéroport
- `testCompleteFlow()` : Tests de flux complets

## ⚠️ Important

1. **Ne pas exécuter en production** : Ces scripts créent des données de test
2. **Nettoyage** : Les utilisateurs créés ont l'email `test-*@bfs-test.com` et peuvent être supprimés
3. **Performance** : Pour 1M d'utilisateurs, prévoir plusieurs heures
4. **Base de données** : Vérifier l'espace disponible dans Supabase

## 🎯 Prochaines Étapes

1. **Exécuter les tests** avec un petit nombre d'utilisateurs (100-1000)
2. **Vérifier le rapport** et corriger les erreurs
3. **Augmenter progressivement** le nombre d'utilisateurs
4. **Valider** que tout fonctionne avec 1M d'utilisateurs

## 📝 Fichiers Créés

- ✅ `api/scripts/test-massive-flow.ts` : Script principal de test massif
- ✅ `api/scripts/test-portals.ts` : Script de test des portails
- ✅ `api/scripts/README-TESTS.md` : Documentation détaillée
- ✅ `GUIDE-TESTS-MASSIFS.md` : Ce guide

Les scripts sont prêts à être utilisés ! 🚀

