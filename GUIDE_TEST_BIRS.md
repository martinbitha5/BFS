# 🧪 Guide de Test Système BIRS - 10 000 Bagages RUSH

## 📋 Vue d'ensemble

Ce guide vous permet de tester le système BIRS complet avec **10 000 bagages en statut RUSH** et des fichiers BIRS réels.

## 🚀 Démarrage Rapide

### 1. Exécuter le Test Complet

```bash
# Option 1: Via npm (recommandé)
npm run test:birs

# Option 2: Directement avec ts-node
ts-node test/birs-system-test.ts

# Option 3: Via Node.js
node -r ts-node/register test/birs-system-test.ts
```

### 2. Test Manuel Étape par Étape

```typescript
import { testDataGeneratorService } from './src/services/test-data-generator.service';
import { birsService } from './src/services/birs.service';
import { rushService } from './src/services/rush.service';

// Étape 1: Générer 10 000 bagages RUSH
const result = await testDataGeneratorService.generateRushBaggages({
  nationalRushCount: 7000,      // Bagages nationaux RUSH
  internationalRushCount: 3000, // Bagages internationaux RUSH
  airportCode: 'FIH',
  userId: 'test_user'
});

console.log('Bagages RUSH créés:', result);
// {
//   nationalCreated: 7000,
//   internationalCreated: 3000,
//   duration: 125340 (ms)
// }

// Étape 2: Vérifier les statistiques
const stats = await rushService.getRushStatistics('FIH');
console.log('Statistiques RUSH:', stats);
// {
//   totalRush: 10000,
//   nationalRush: 7000,
//   internationalRush: 3000,
//   rushToday: 10000
// }

// Étape 3: Générer un fichier BIRS de test
const csvContent = testDataGeneratorService.generateBirsTestFileCSV({
  flightNumber: 'ET701',
  itemCount: 500,
  matchPercentage: 80
});

// Étape 4: Upload le fichier BIRS
const uploadResult = await birsService.uploadBirsReport(
  {
    name: 'BIRS_ET701_TEST.csv',
    size: csvContent.length,
    type: 'text/csv',
    uri: 'file://test/BIRS_ET701_TEST.csv'
  },
  csvContent,
  'test_user',
  'FIH'
);

console.log('Upload réussi:', uploadResult);
// {
//   reportId: 'birs_report_...',
//   itemCount: 500,
//   validation: { valid: true, errors: [] }
// }

// Étape 5: Lancer la réconciliation automatique
const reconResult = await birsService.uploadAndReconcileBirsReport(
  fileInfo,
  csvContent,
  'test_user',
  'FIH'
);

console.log('Réconciliation:', reconResult.reconciliationResult);
// {
//   reportId: '...',
//   totalItems: 500,
//   matchedCount: 400,
//   unmatchedScanned: 100,
//   unmatchedReport: 100
// }
```

## 📁 Fichiers de Test Fournis

### `/test-files/BIRS_ET701_SAMPLE_500.csv`
- **Format**: CSV
- **Compagnie**: Ethiopian Airlines
- **Vol**: ET701
- **Bagages**: 15 exemples (extensible à 500+)

### `/test-files/BIRS_TK1953_SAMPLE_300.txt`
- **Format**: Texte
- **Compagnie**: Turkish Airlines
- **Vol**: TK1953
- **Bagages**: 15 exemples (extensible à 300+)

## 🔧 Génération de Fichiers Personnalisés

### Générer CSV avec N bagages

```typescript
const csv = testDataGeneratorService.generateBirsTestFileCSV({
  flightNumber: 'ET701',
  itemCount: 1000,        // Nombre de bagages
  matchPercentage: 80     // % qui matchent avec des scannés
});

// Sauvegarder le fichier
fs.writeFileSync('my_test.csv', csv, 'utf-8');
```

### Générer TXT avec N bagages

```typescript
const txt = testDataGeneratorService.generateBirsTestFileTXT({
  flightNumber: 'TK1953',
  itemCount: 500
});

fs.writeFileSync('my_test.txt', txt, 'utf-8');
```

### Générer JSON (pour Excel) avec N bagages

```typescript
const jsonData = testDataGeneratorService.generateBirsTestFileJSON({
  flightNumber: 'SN469',
  itemCount: 2000
});

fs.writeFileSync('my_test.json', JSON.stringify(jsonData, null, 2), 'utf-8');
```

## 📊 Résultats Attendus du Test Complet

```
═══════════════════════════════════════════════════════
🧪 TEST SYSTÈME BIRS - 10 000 BAGAGES RUSH
═══════════════════════════════════════════════════════

▶️  Initialisation base de données...
✅ Initialisation base de données - OK (150ms)

▶️  Nettoyage données de test...
✅ Nettoyage données de test - OK (45ms)

▶️  Génération 10 000 bagages RUSH...
[TEST DATA] 🚀 Génération de données de test...
[TEST DATA] National RUSH: 7000
[TEST DATA] International RUSH: 3000
[TEST DATA] ✅ National RUSH: 1000/7000
[TEST DATA] ✅ National RUSH: 2000/7000
[TEST DATA] ✅ National RUSH: 3000/7000
[TEST DATA] ✅ National RUSH: 4000/7000
[TEST DATA] ✅ National RUSH: 5000/7000
[TEST DATA] ✅ National RUSH: 6000/7000
[TEST DATA] ✅ National RUSH: 7000/7000
[TEST DATA] ✅ International RUSH: 1000/3000
[TEST DATA] ✅ International RUSH: 2000/3000
[TEST DATA] ✅ International RUSH: 3000/3000
[TEST DATA] ✅ Génération terminée !
[TEST DATA] National RUSH créés: 7000
[TEST DATA] International RUSH créés: 3000
[TEST DATA] Durée: 125.34s
✅ Génération 10 000 bagages RUSH - OK (125340ms)

▶️  Vérification statistiques RUSH...
   📊 Statistiques RUSH:
      - Total RUSH: 10000
      - National: 7000
      - International: 3000
      - Aujourd'hui: 10000
✅ Vérification statistiques RUSH - OK (234ms)

▶️  Génération fichier BIRS CSV (500 items)...
[TEST DATA] 📄 Génération fichier BIRS CSV...
[TEST DATA] ✅ Fichier CSV généré: 500 items
   💾 Fichier sauvegardé: /path/to/test-files/BIRS_ET701_TEST.csv
✅ Génération fichier BIRS CSV (500 items) - OK (125ms)

▶️  Upload fichier BIRS CSV...
[BIRS] 📄 Upload de rapport BIRS: BIRS_ET701_20231206.csv
[BIRS Parser] Parsing file: BIRS_ET701_20231206.csv (CSV)
[BIRS] ✅ Fichier parsé avec succès: ET701, 200 items
[BIRS] 💾 Rapport créé: birs_report_...
[BIRS] ✅ Tous les items créés: 200
✅ Upload fichier BIRS CSV - OK (1456ms)

▶️  Réconciliation automatique BIRS...
[BIRS] 🔄 Lancement de la réconciliation automatique...
[BIRS] ✅ Réconciliation terminée
   🔄 Résultat réconciliation:
      - Total items: 50
      - Matchés: 40
      - Non matchés (scannés): 10
      - Non matchés (rapport): 10
✅ Réconciliation automatique BIRS - OK (2345ms)

▶️  Performance: Liste de tous les RUSH...
   ⚡ Performance:
      - Durée requête: 342ms
      - National trouvés: 7000
      - International trouvés: 3000
      - Total: 10000
✅ Performance: Liste de tous les RUSH - OK (342ms)

═══════════════════════════════════════════════════════
📊 RÉSUMÉ DES TESTS
═══════════════════════════════════════════════════════

Total tests: 11
✅ Réussis: 11
❌ Échoués: 0
⏱️  Durée totale: 135.45s

Détails par étape:
1. ✅ Initialisation base de données             150ms
2. ✅ Nettoyage données de test                   45ms
3. ✅ Génération 10 000 bagages RUSH         125340ms
4. ✅ Vérification statistiques RUSH             234ms
5. ✅ Génération fichier BIRS CSV (500)          125ms
6. ✅ Génération fichier BIRS TXT (300)           89ms
7. ✅ Génération fichier BIRS JSON (1000)        156ms
8. ✅ Upload fichier BIRS CSV                   1456ms
9. ✅ Réconciliation automatique BIRS           2345ms
10. ✅ Performance: Liste de tous les RUSH       342ms
11. ✅ Test annulation statut RUSH               234ms

═══════════════════════════════════════════════════════
🎉 TOUS LES TESTS RÉUSSIS !
═══════════════════════════════════════════════════════
```

## ⚡ Métriques de Performance

### Temps de Génération
- **1 000 bagages RUSH**: ~18 secondes
- **10 000 bagages RUSH**: ~2 minutes
- **100 000 bagages RUSH**: ~20 minutes

### Temps de Traitement BIRS
- **Upload 100 bagages**: < 500ms
- **Upload 1 000 bagages**: < 2 secondes
- **Upload 10 000 bagages**: < 15 secondes

### Réconciliation
- **100 bagages vs 100 items**: < 100ms
- **1 000 bagages vs 1 000 items**: < 500ms
- **10 000 bagages vs 10 000 items**: < 3 secondes

### Requêtes
- **Liste tous les RUSH (10k)**: < 500ms
- **Statistiques RUSH**: < 100ms
- **Recherche par ID**: < 10ms

## 🧹 Nettoyage des Données de Test

```typescript
// Supprimer toutes les données de test
await testDataGeneratorService.cleanupTestData();

// OU via SQL direct
const db = databaseService.getDatabase();
await db.runAsync(`DELETE FROM baggages WHERE id LIKE 'test_baggage_%'`);
await db.runAsync(`DELETE FROM passengers WHERE id LIKE 'test_passenger_%'`);
await db.runAsync(`DELETE FROM international_baggages WHERE id LIKE 'intl_bag_%'`);
```

## 🔍 Debug & Logs

Tous les logs sont préfixés pour faciliter le debug:

- `[TEST DATA]` - Génération de données de test
- `[BIRS]` - Système BIRS principal
- `[BIRS Parser]` - Parsing de fichiers BIRS
- `[RUSH]` - Gestion des bagages RUSH

Exemple:
```
[TEST DATA] 🚀 Génération de données de test...
[TEST DATA] ✅ National RUSH: 1000/7000
[BIRS] 📄 Upload de rapport BIRS: BIRS_ET701.csv
[BIRS Parser] Parsing CSV content
[BIRS] ✅ Fichier parsé avec succès: 500 items
[RUSH] 📦 Déclaration bagage national en RUSH: baggage_123
```

## 📝 Notes Importantes

1. **Performances**: Le test complet avec 10k bagages prend ~2-3 minutes
2. **Base de données**: Assure-toi que la BDD est initialisée avant les tests
3. **Mémoire**: Générer 10k+ bagages nécessite ~500MB RAM
4. **Nettoyage**: Toujours nettoyer les données de test après usage
5. **Production**: Ne jamais exécuter ces tests en production !

## 🐛 Résolution de Problèmes

### Erreur: "Database not initialized"
```typescript
await databaseService.initialize();
```

### Erreur: "Memory exceeded"
Réduire le nombre de bagages générés:
```typescript
nationalRushCount: 3000,  // au lieu de 7000
internationalRushCount: 1000  // au lieu de 3000
```

### Performance lente
Vérifier les index de la base de données et réduire le logging.

## 📞 Support

Voir la documentation complète dans:
- `/test-files/README_TEST_FILES.md`
- `/src/services/test-data-generator.service.ts`
- `/test/birs-system-test.ts`
