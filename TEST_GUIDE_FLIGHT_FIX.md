# 🧪 GUIDE DE TEST - Fix Flight Number Parsing

## Configuration du Test

### 1. S'assurer que les vols sont programmés au dashboard

Aller dans le **Dashboard** (https://dashboard.brsats.com):
- Aéroport: Sélectionner l'aéroport de test
- Date: Aujourd'hui
- Ajouter les vols:
  - **ET64** (Ethiopian Airlines)
  - **KQ555** (Kenya Airways)

### 2. Vérifier les vols en base de données

Exécuter cette requête dans la DB:
```sql
SELECT 
  id, 
  flight_number, 
  airline, 
  departure, 
  arrival,
  scheduled_date,
  status
FROM flight_schedule
WHERE scheduled_date = CURRENT_DATE
  AND flight_number IN ('ET64', 'KQ555')
  AND status IN ('scheduled', 'boarding');
```

Résultat attendu:
```
id | flight_number | airline | departure | arrival | scheduled_date | status
---|---------------|---------|-----------|---------|----------------|---------
1  | ET64          | ET      | ADD       | CDG     | 2025-01-22     | scheduled
2  | KQ555         | KQ      | NBO       | JNB     | 2025-01-22     | boarding
```

---

## Test 1: Vérifier l'Extraction du Numéro de Vol

### A. Test unitaire (Node.js)
```javascript
// Copier le contenu du test-flight-parser.js
node test-flight-parser.js
```

Résultat attendu:
```
✅ PASS: ET64 - 2 digits
✅ PASS: KQ555 - 3 digits
```

### B. Test du parser backend
```bash
# SSH into Hostinger
ssh user@api.brsats.com

# Test le parser directement
cd /home/bfs/api
npm run build
node -e "
const ParserService = require('./dist/services/parser.service.js');
const parser = new ParserService();

const testData = 'M1PASSENGER/NAME ET64FIH CDG...';
const result = parser.parse(testData);
console.log('Flight Number:', result.flightNumber);
"
```

Résultat attendu:
```
Flight Number: ET64
```

---

## Test 2: Tester le Check-in avec ET64

### Étapes:
1. **Ouvrir l'app mobile** en mode Check-in
2. **Scanner un boarding pass ET64** (généré ou réel)
3. **Vérifier le résultat:**
   - ❌ BUGUÉ: Message "VOL NON AUTORISÉ - Le vol UNKNOWN..."
   - ✅ FIXÉ: Passager enregistré avec numéro ET64 visible

### Vérifier dans les logs:
```
[PARSER] 🔍 Validation vol: ET64
[FlightService] ✅ Vol validé: ET64
```

---

## Test 3: Tester le Boarding avec KQ555

### Étapes:
1. **Scanner le même passager au boarding**
2. **Vérifier:**
   - ✅ Message "Embarquement confirmé ! (Vol: KQ555)"
   - ✅ Passager marqué comme embarqué

### Vérifier en base:
```sql
SELECT 
  id,
  pnr,
  flight_number,
  status_checkin,
  status_boarding,
  checked_in_at,
  boarded_at
FROM raw_scans
WHERE flight_number IN ('ET64', 'KQ555')
ORDER BY created_at DESC
LIMIT 5;
```

---

## Test 4: Vérifier les Logs API

### 1. Logs de validation:
```
[ValidateBoarding] 🔍 Validation: ET64 (norm: ET64) @ FIH
[ValidateBoarding] ✅ Vol valide: ET64 (scheduled)
```

### 2. Logs de parsing:
```
[PARSER] Format détecté: GENERIC
[PARSER] Flight number extracted: ET64
[PARSER] ✅ Vol trouvé: ET64
```

### 3. Commande pour voir les logs:
```bash
# Sur Hostinger
pm2 logs bfs-api | grep "ET64\|KQ555"
```

---

## Test 5: Cas Limites

### A. Avec espace:
```
Boarding pass: "ET 64" (avec espace)
Résultat attendu: ✅ ET64
```

### B. Avec zéro:
```
Boarding pass: "ET064" (avec zéro leading)
Résultat attendu: ✅ ET64 (après normalisation)
```

### C. Mixte:
```
Boarding pass: "KQ 0555" (espace + zéro)
Résultat attendu: ✅ KQ555
```

---

## Checklist de Validation

- [ ] **Parser extraction:** ET64 et KQ555 bien extraits
- [ ] **Validation locale:** Vols trouvés dans `getAvailableFlights()`
- [ ] **Validation API:** `/api/v1/flights/validate-boarding` retourne `isValid: true`
- [ ] **Check-in:** Passager enregistré avec numéro correct
- [ ] **Boarding:** Passager peut embarquer sans erreur "UNKNOWN"
- [ ] **Logs:** Pas d'erreurs, patterns matchent correctement
- [ ] **Base de données:** Numéros de vol stockés correctement

---

## Résolution de Problèmes

### Si le test échoue:

#### 1. "Vol UNKNOWN" toujours affiché
```bash
# Vérifier que le code est déployé
curl -s https://api.brsats.com/api/v1/health | jq .

# Vérifier la date et timezone du serveur
ssh user@api.brsats.com
date
```

#### 2. Pattern ne matchent pas
```bash
# Vérifier le regex compilé en JS
node -e "console.log(/([A-Z]{2})\s*(\d{2,4})/.test('ET64'))"
# Doit retourner: true
```

#### 3. Vol non trouvé en base
```sql
-- Vérifier les vols programmés
SELECT COUNT(*) FROM flight_schedule 
WHERE scheduled_date = CURRENT_DATE;

-- Si vide, ajouter manuellement
INSERT INTO flight_schedule (flight_number, airline, departure, arrival, scheduled_date, status)
VALUES ('ET64', 'ET', 'ADD', 'CDG', CURRENT_DATE, 'scheduled');
```

---

## Signaler les Résultats

Après les tests:
- ✅ Si tous les tests passent → Fix validé
- ❌ Si un test échoue → Décrire l'erreur avec:
  - Numéro de vol testé
  - Contenu du boarding pass
  - Message d'erreur exact
  - Logs complètes
