# 🔒 Système de validation des vols lors des scans

## 📋 Vue d'ensemble

Le système valide maintenant **CHAQUE scan** (boarding pass ET bagage) contre la table `flight_schedule` avant de créer un passager ou un bagage.

## ❌ **Ancien comportement (système "passe-partout")**

```
Scanner boarding pass → Accepte TOUT
  - Vol ET0080 ✅ (programmé)
  - Vol KQ123 ✅ (pas programmé mais accepté!)
  - Vol XY9999 ✅ (compagnie inconnue mais accepté!)
  - Même d'autres aéroports ✅ (accepté!)
```

**Problème** : N'importe quel boarding pass était scanné sans vérification.

## ✅ **Nouveau comportement (système sécurisé)**

```
Scanner boarding pass → Validation STRICTE
  1. ✅ Vol existe dans flight_schedule ?
  2. ✅ Vol actif (active = true) ?
  3. ✅ Vol opère aujourd'hui (lundi/mardi/etc.) ?
  4. ✅ Aéroport correct ?
  
  Si NON → ❌ REFUSÉ avec raison
  Si OUI → ✅ ACCEPTÉ et passager créé
```

## 🔧 Fonction de validation

### `validateFlightBeforeScan()`

```typescript
async function validateFlightBeforeScan(
  flightNumber: string,  // Ex: "ET0080"
  airportCode: string,   // Ex: "FIH"
  scanDate: Date         // Date du scan
): Promise<{ valid: boolean; reason?: string }>
```

### Vérifications effectuées

#### 1️⃣ **Vol existe et est actif ?**

```sql
SELECT * FROM flight_schedule
WHERE flight_number = 'ET0080'
  AND airport_code = 'FIH'
  AND active = true
```

Si **NON** → ❌ Refusé : `"Vol ET0080 non programmé à l'aéroport FIH"`

#### 2️⃣ **Vol opère aujourd'hui ?**

```typescript
// Extraire le jour de la semaine
const dayOfWeek = scanDate.getDay(); // 0-6
const dayName = 'monday'; // Exemple

// Vérifier la colonne du jour
if (!scheduledFlight.monday) {
  return { valid: false, reason: "Vol ET0080 ne vole pas le lundi" };
}
```

Si **NON** → ❌ Refusé : `"Vol ET0080 ne vole pas le mercredi"`

#### 3️⃣ **Validation réussie**

Si **OUI** → ✅ Accepté : Le scan est traité normalement

## 📊 Cas d'utilisation

### Cas 1 : Boarding pass vol programmé ✅

```
Scan: Boarding pass ET0080 (mercredi)
flight_schedule:
  - flight_number: ET0080
  - airport_code: FIH  
  - wednesday: true
  - active: true

Résultat: ✅ ACCEPTÉ
Action: Passager créé avec ses bagages
```

### Cas 2 : Boarding pass vol non programmé ❌

```
Scan: Boarding pass KQ456 (lundi)
flight_schedule: Aucune entrée pour KQ456

Résultat: ❌ REFUSÉ
Raison: "Vol KQ456 non programmé à l'aéroport FIH"
Action: Scan marqué comme processed=true avec processing_error
```

### Cas 3 : Boarding pass mauvais jour ❌

```
Scan: Boarding pass ET0080 (dimanche)
flight_schedule:
  - flight_number: ET0080
  - sunday: false  ❌
  - monday: true

Résultat: ❌ REFUSÉ
Raison: "Vol ET0080 ne vole pas le dimanche"
Action: Scan marqué comme processed=true avec processing_error
```

### Cas 4 : Bagage vol non programmé ❌

```
Scan: Tag bagage avec vol TK0540 (mardi)
flight_schedule: Aucune entrée pour TK0540

Résultat: ❌ REFUSÉ
Raison: "Vol TK0540 non programmé à l'aéroport FIH"
Action: Bagage NON créé, scan refusé
```

## 🗄️ Traçabilité des refus

### Table `raw_scans` - Nouvelle colonne

```sql
ALTER TABLE raw_scans 
ADD COLUMN processing_error TEXT;
```

### Exemple de scans refusés

| id | scan_type | raw_data | processed | processing_error |
|----|-----------|----------|-----------|------------------|
| 123 | boarding_pass | M1JOHN/DOE... | true | Vol KQ456 non programmé à l'aéroport FIH |
| 124 | baggage_tag | RFID12345... | true | Vol TK0540 ne vole pas le dimanche |

### Requête pour voir les scans refusés

```sql
SELECT 
  scan_type,
  processing_error,
  created_at
FROM raw_scans
WHERE processing_error IS NOT NULL
ORDER BY created_at DESC;
```

## 🔄 Flux complet

```
┌─────────────────────────┐
│   Scanner boarding pass │
│   ou bagage RFID        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Parser les données     │
│  Extraire flight_number │
└────────────┬────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  validateFlightBeforeScan()      │
│  1. Vol existe ?                 │
│  2. Vol actif ?                  │
│  3. Vol opère aujourd'hui ?      │
└────────────┬─────────────────────┘
             │
        ┌────┴────┐
        │         │
        ▼         ▼
    ❌ REFUSÉ  ✅ ACCEPTÉ
        │         │
        │         ▼
        │    Créer passager
        │    Créer bagages
        │         │
        ▼         ▼
    Marquer scan avec
    processing_error
```

## 📱 Impact sur l'application mobile

### Avant
```typescript
// Pas de feedback sur refus
scanBoardingPass() → Success | Error générique
```

### Après (à implémenter)
```typescript
// Feedback clair
scanBoardingPass() → 
  | Success: "Passager créé"
  | Error: "Vol ET0080 non programmé à FIH"
  | Error: "Vol TK0540 ne vole pas le dimanche"
```

## 🛠️ Maintenance

### Ajouter un nouveau vol

```sql
INSERT INTO flight_schedule (
  flight_number, airline_code, airport_code,
  monday, tuesday, wednesday, thursday, friday,
  active
) VALUES (
  'ET0080', 'ET', 'FIH',
  true, false, true, false, true,
  true
);
```

### Désactiver un vol temporairement

```sql
UPDATE flight_schedule 
SET active = false
WHERE flight_number = 'ET0080';
```

### Désactiver un vol un jour spécifique

```sql
UPDATE flight_schedule 
SET sunday = false
WHERE flight_number = 'ET0080';
```

## 🧪 Tests

### Test 1 : Vol programmé accepté
```bash
POST /api/v1/sync-raw-scans
{
  "airport_code": "FIH"
}
# Avec un scan ET0080 programmé pour aujourd'hui
# Résultat attendu: passengersCreated++
```

### Test 2 : Vol non programmé refusé
```bash
POST /api/v1/sync-raw-scans
{
  "airport_code": "FIH"
}
# Avec un scan XY9999 non programmé
# Résultat attendu: errors++, processing_error rempli
```

## 📝 Migration requise

```sql
-- Exécuter dans Supabase SQL Editor
ALTER TABLE raw_scans 
ADD COLUMN IF NOT EXISTS processing_error TEXT;

CREATE INDEX IF NOT EXISTS idx_raw_scans_processing_error 
ON raw_scans(processing_error) 
WHERE processing_error IS NOT NULL;
```

## ⚠️ Points d'attention

1. **Performance** : Chaque scan fait maintenant une requête SQL supplémentaire
2. **Données legacy** : Les anciens passagers sans validation restent en base
3. **Time zone** : La fonction utilise `scanDate.getDay()` (local au serveur)
4. **Vols de nuit** : Un vol à 23h59 puis 00h01 peut avoir des jours différents

## 🎯 Avantages

- ✅ **Sécurité** : Seuls les vols programmés sont acceptés
- ✅ **Traçabilité** : Tous les refus sont loggés avec raison
- ✅ **Contrôle** : L'aéroport contrôle exactement quels vols scanner
- ✅ **Qualité des données** : Pas de passagers "fantômes"

---

**Créé le** : 11 décembre 2025  
**Auteur** : Martin Bitha Moponda  
**Version** : 1.0
