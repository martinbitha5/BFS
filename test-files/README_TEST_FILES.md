# 🧪 Fichiers de Test BIRS

Ce dossier contient des fichiers de test pour le système BIRS (Baggage Irregularity Report System).

## 📁 Fichiers Disponibles

### 1. BIRS_ET701_SAMPLE_500.csv
- **Format**: CSV
- **Compagnie**: Ethiopian Airlines (ET)
- **Vol**: ET701
- **Nombre de bagages**: 15 (exemple), peut être étendu à 500+
- **Colonnes**: Bag ID, Passenger Name, PNR, Seat Number, Class, PSN, Weight, Route

**Utilisation**:
```typescript
import { birsService } from '../src/services';

const csvContent = fs.readFileSync('test-files/BIRS_ET701_SAMPLE_500.csv', 'utf-8');

await birsService.uploadBirsReport(
  {
    name: 'BIRS_ET701_SAMPLE_500.csv',
    size: csvContent.length,
    type: 'text/csv',
    uri: 'file://test-files/BIRS_ET701_SAMPLE_500.csv'
  },
  csvContent,
  'user@example.com',
  'FIH'
);
```

### 2. BIRS_TK1953_SAMPLE_300.txt
- **Format**: Texte
- **Compagnie**: Turkish Airlines (TK)
- **Vol**: TK1953
- **Nombre de bagages**: 15 (exemple), peut être étendu à 300+
- **Format**: Colonnes fixes avec espaces

**Utilisation**:
```typescript
const txtContent = fs.readFileSync('test-files/BIRS_TK1953_SAMPLE_300.txt', 'utf-8');

await birsService.uploadBirsReport(
  {
    name: 'BIRS_TK1953_SAMPLE_300.txt',
    size: txtContent.length,
    type: 'text/plain',
    uri: 'file://test-files/BIRS_TK1953_SAMPLE_300.txt'
  },
  txtContent,
  'user@example.com',
  'FIH'
);
```

## 🔧 Génération de Fichiers de Test

Pour générer automatiquement des fichiers BIRS de test avec un grand nombre de bagages:

```typescript
import { testDataGeneratorService } from '../src/services/test-data-generator.service';

// Générer fichier CSV avec 500 bagages
const csv = testDataGeneratorService.generateBirsTestFileCSV({
  flightNumber: 'ET701',
  itemCount: 500,
  matchPercentage: 80
});

// Générer fichier TXT avec 300 bagages
const txt = testDataGeneratorService.generateBirsTestFileTXT({
  flightNumber: 'TK1953',
  itemCount: 300
});

// Générer fichier JSON avec 1000 bagages
const json = testDataGeneratorService.generateBirsTestFileJSON({
  flightNumber: 'SN469',
  itemCount: 1000
});
```

## 🧪 Test Complet du Système

Pour exécuter le test complet avec 10 000 bagages RUSH:

```bash
# Via Node.js
npm run test:birs

# Ou directement
ts-node test/birs-system-test.ts
```

### Ce que le test fait:

1. ✅ Initialise la base de données
2. ✅ Nettoie les données de test précédentes
3. ✅ Génère 10 000 bagages RUSH (7000 nationaux + 3000 internationaux)
4. ✅ Vérifie les statistiques RUSH
5. ✅ Génère fichiers BIRS de test (CSV, TXT, JSON)
6. ✅ Upload des rapports BIRS
7. ✅ Teste la réconciliation automatique
8. ✅ Mesure les performances
9. ✅ Teste l'annulation de statut RUSH
10. ✅ Affiche un rapport détaillé

### Résultat attendu:

```
═══════════════════════════════════════════════════════
🧪 TEST SYSTÈME BIRS - 10 000 BAGAGES RUSH
═══════════════════════════════════════════════════════

▶️  Initialisation base de données...
✅ Initialisation base de données - OK (150ms)

▶️  Génération 10 000 bagages RUSH...
[TEST DATA] ✅ National RUSH: 1000/7000
[TEST DATA] ✅ National RUSH: 2000/7000
...
[TEST DATA] ✅ National RUSH: 7000/7000
[TEST DATA] ✅ International RUSH: 1000/3000
...
✅ Génération 10 000 bagages RUSH - OK (125340ms)

▶️  Vérification statistiques RUSH...
   📊 Statistiques RUSH:
      - Total RUSH: 10000
      - National: 7000
      - International: 3000
      - Aujourd'hui: 10000
✅ Vérification statistiques RUSH - OK (234ms)

...

═══════════════════════════════════════════════════════
📊 RÉSUMÉ DES TESTS
═══════════════════════════════════════════════════════

Total tests: 11
✅ Réussis: 11
❌ Échoués: 0
⏱️  Durée totale: 135.45s

🎉 TOUS LES TESTS RÉUSSIS !
═══════════════════════════════════════════════════════
```

## 📊 Formats de Fichiers Supportés

Le système BIRS supporte les formats suivants:

### 1. CSV (Comma-Separated Values)
```csv
Bag ID,Passenger Name,PNR,Seat Number,Class,Weight
ET1234567890,MARTIN/JEAN,ABC123,12A,Y,15
```

### 2. TXT (Texte avec colonnes fixes)
```
ET1234567890 MARTIN/JEAN              ABC123   12A   Y     15KG
```

### 3. Excel (via JSON)
```json
{
  "flightNumber": "ET701",
  "items": [
    {
      "bagId": "ET1234567890",
      "passengerName": "MARTIN/JEAN",
      "pnr": "ABC123",
      ...
    }
  ]
}
```

### 4. PDF (extrait en texte)
Le contenu du PDF doit être extrait en texte avant upload.

### 5. SVG (avec métadonnées embarquées)
Données BIRS dans les balises `<text>` ou `<metadata>`.

## 🔍 Validation des Fichiers

Chaque fichier uploadé est automatiquement validé:

- ✅ Numéro de vol valide
- ✅ Date de vol présente
- ✅ Au moins 1 bagage dans le rapport
- ✅ Chaque bagage a un Bag ID valide (10+ caractères)
- ✅ Chaque bagage a un nom de passager

## ⚡ Performance

Le système peut traiter:
- **Upload**: ~2000 bagages/seconde
- **Réconciliation**: ~5000 comparaisons/seconde
- **Requête RUSH**: Tous les bagages en < 500ms

## 📞 Support

Pour toute question sur les tests BIRS:
- Voir: `/src/services/test-data-generator.service.ts`
- Voir: `/test/birs-system-test.ts`
