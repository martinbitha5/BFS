# 🔍 DIAGNOSTIC: Liaison Passager-Bagages - Écran de Bagage

**Date**: 14 février 2026  
**Analyse**: Vérification complète de la liaison passager-bagage et reconnaissance du passager

---

## ✅ **POINTS FORTS IDENTIFIÉS**

### 1. **Architecture Relationnelle Solide**
- ✅ **Foreign Key Définie**: `baggages.passenger_id` → `passengers.id` avec `ON DELETE CASCADE`
- ✅ **Index Performance**: Index sur `passenger_id` dans la table `baggages`
- ✅ **Schéma Normalisé**: Liaison 1-N cohérente

### 2. **Logique de Recherche du Passager ROBUSTE (3 niveaux)**
```typescript
// Priorité 1: API Supabase (source de vérité)
→ Cherche via tag bagage ou PNR

// Fallback 2: Recherche locale par tag attendu
→ getPassengerByExpectedTag(tagNumber)

// Fallback 3: Recherche par PNR ou nom
→ getPassengerByPnr() ou getPassengerByName()
```

### 3. **Validation de Quota de Bagages**
```typescript
✅ Nombre de bagages vérifiés vs nombre autorisé
✅ Empêche l'ajout si quota dépassé
✅ Message d'erreur clair
```

### 4. **Vérifications Antidoublons**
```typescript
✅ Vérification si bagage déjà dans raw_scans
✅ Vérification si bagage existe dans baggages (national)
✅ Vérification si bagage existe dans international_baggages
```

### 5. **Affichage de la Liaison Réussie**
```typescript
✅ Passager associé affiché avec tous les détails:
   - Nom complet
   - PNR
   - Numéro de vol
   - Route (départ → arrivée)
```

---

## ⚠️ **PROBLÈMES POTENTIELS IDENTIFIÉS**

### 🔴 **PROBLÈME 1: Validation du `passenger.id` INSUFFISANTE**

**Localisation**: [BaggageScreen.tsx ligne 269-320](BaggageScreen.tsx#L269-L320)

```typescript
// RISQUE: Pas de validation que passenger.id existe et n'est pas vide
const baggageId = await databaseServiceInstance.createBaggage({
  passengerId: passenger.id,  // ⚠️ Pas de check si passenger.id est valide
  tagNumber,
  // ...
});
```

**Scénario de Rupture**:
- Si `passenger` est créé avec `id` = `undefined` ou `""` (string vide)
- Le bagage sera créé avec `passenger_id = NULL`
- Le bagage devient **orphelin** (pas lié au passager)

**Impact**: 🔴 **CRITIQUE** - Rupture de la liaison

---

### 🔴 **PROBLÈME 2: Conversion Type Snake_Case → camelCase**

**Localisation**: [database.service.ts ligne 233-241](database.service.ts#L233-L241)

Dans `getPassengerByPnr()`:
```typescript
const result = await this.db.getFirstAsync<Passenger>(
  'SELECT * FROM passengers WHERE pnr = ?',
  [pnr]
);

if (result) {
  return {
    ...result,  // ⚠️ Copie directe sans conversion
    synced: Boolean(result.synced),
  };
}
```

**Problème**:
- SQLite retourne: `full_name`, `first_name`, `last_name`, `baggage_base_number`, etc. (snake_case)
- TypeScript attend: `fullName`, `firstName`, `lastName`, `baggageBaseNumber` (camelCase)
- Spread operator ne fait PAS la conversion automatique

**Scénario de Rupture**:
```typescript
passenger.fullName  // undefined ❌ (au lieu de la vraie valeur)
passenger.full_name // "John Doe" ✅ (mais pas dans le type)
```

**Résultat**: L'affichage du nom du passager peut être vide ou incorrectement mappé

**Impact**: 🟠 **GRAVE** - Affichage incomplet du passager

---

### 🔴 **PROBLÈME 3: Pas de Null-Check avant Création**

**Localisation**: [BaggageScreen.tsx ligne 268-320](BaggageScreen.tsx#L268-L320)

```typescript
if (!passenger) {
  // Alert et reject ✅ 
  return;
}

// ✅ Pas de check que passenger.id n'est pas null/empty
const baggageId = await databaseServiceInstance.createBaggage({
  passengerId: passenger.id,  // Pourrait être null si passenger est partiellement créé
  // ...
});
```

**Question Critique**:
- Que se passe-t-il si `passenger` est un objet vide `{}`?
- Que se passe-t-il si seuls certains champs sont remplis?

**Impact**: 🔴 **CRITIQUE**

---

### 🟠 **PROBLÈME 4: Pas de Re-fetch après Création API**

**Localisation**: [BaggageScreen.tsx ligne 230-267](BaggageScreen.tsx#L230-L267)

```typescript
// Créer le passager localement
const passengerId = await databaseServiceInstance.createPassenger({
  pnr: result.data.pnr,
  fullName: fullName,
  // ...
});

// Récupérer le passager créé
passenger = await databaseServiceInstance.getPassengerById(passengerId);
// ⚠️ Pas de check si getPassengerById retourne null!
```

**Scénario**:
1. `createPassenger()` retourne un ID
2. `getPassengerById()` retourne `null` (problème DB async)
3. Code continue avec `passenger = null`
4. Affichage manquant du passager associé

**Impact**: 🟠 **GRAVE**

---

### 🔴 **PROBLÈME 5: Mapping Field Incohérent dans createPassenger**

**Localisation**: [BaggageScreen.tsx ligne 241-265](BaggageScreen.tsx#L241-L265)

```typescript
const passengerId = await databaseServiceInstance.createPassenger({
  pnr: result.data.pnr,
  fullName: fullName,
  firstName: firstName,
  lastName: lastName,
  flightNumber: result.data.flight_number,  // ✅ snake_case dans l'API
  airline: result.data.airline || '',
  airlineCode: result.data.airline_code || '',  // ✅ snake_case
  departure: departure,
  arrival: arrival,
  route: result.data.route || `${departure}-${arrival}`,
  baggageCount: result.data.baggage_count || 1,  // ✅ snake_case
  baggageBaseNumber: result.data.baggage_base_number,  // ✅ snake_case
  // ...
});
```

Le problème: L'API Supabase retourne du **snake_case**, mais le mapping mixte peut créer des incohérences.

---

### 🟡 **PROBLÈME 6: Pas de Validation de l'API Response**

**Localisation**: [BaggageScreen.tsx ligne 230-235](BaggageScreen.tsx#L230-L235)

```typescript
if (response.ok) {
  const result = await response.json();
  if (result.data) {  // ⚠️ Seul check sur result.data
    // Utiliser result.data.pnr, result.data.full_name, etc.
    // Pas de validation des champs individuels!
  }
}
```

**Risque**:
- `result.data` pourrait être `{}` (objet vide)
- `result.data.pnr` pourrait être `null` ou `undefined`
- `result.data.full_name` pourrait être vide

---

## 🐛 **CAS DE RUPTURE IDENTIFIÉS**

### Cas 1: **Passager créé avec ID null**
```
Scan tag → API trouve passager → createPassenger() → passengerId = "uuid"
                                 ↓
                     getPassengerById(passengerId)
                                 ↓
                     Retourne null (timing issue DB)
                                 ↓
                     passenger = null
                                 ↓
                     Affichage du passager = VIDE ❌
```

### Cas 2: **Bug de Mapping camelCase**
```
DB: full_name = "John Doe"
TypeScript: passenger.fullName = undefined ❌
Affichage: "undefined" ❌
```

### Cas 3: **Quota non respecté**
```
Passager avec baggageCount = 2
3e bagage scanné → Pas de vérification correcte
                → Bagage créé avec passager.id correct
                → MAIS quota dépassé ❌
```

### Cas 4: **Passager non trouvé mais bagage créé quand même**
```
API cherche passager → 404 (passager pas dans API)
              ↓
Fallback cherche localement → null
              ↓
REFUSER LE SCAN ✅ (mais il y a quand même un risque race condition)
```

---

## ✨ **SOLUTIONS RECOMMANDÉES**

### 🔧 **CORRECTION 1: Valider le `passenger.id` avant création**

```typescript
if (!passenger || !passenger.id || passenger.id.trim() === '') {
  await playErrorSound();
  Alert.alert('Erreur', 'Données du passager invalides');
  resetScanner();
  return;
}
```

### 🔧 **CORRECTION 2: Corriger le Mapping camelCase**

Dans `getPassengerByPnr()` et autres fonctions:
```typescript
if (result) {
  return {
    id: result.id,
    pnr: result.pnr,
    fullName: result.full_name,  // ✅ Explicit mapping
    firstName: result.first_name,
    lastName: result.last_name,
    flightNumber: result.flight_number,
    airline: result.airline,
    airlineCode: result.airline_code,
    departure: result.departure,
    arrival: result.arrival,
    route: result.route,
    baggageCount: result.baggage_count,
    baggageBaseNumber: result.baggage_base_number,
    checkedInAt: result.checked_in_at,
    checkedInBy: result.checked_in_by,
    synced: Boolean(result.synced),
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
}
```

### 🔧 **CORRECTION 3: Vérifier le re-fetch après création**

```typescript
passenger = await databaseServiceInstance.getPassengerById(passengerId);

if (!passenger) {
  console.error('[BAGGAGE] Passager créé mais non trouvé au re-fetch!');
  await playErrorSound();
  Alert.alert('Erreur', 'Impossible de charger les données du passager');
  resetScanner();
  return;
}
```

### 🔧 **CORRECTION 4: Valider la response API**

```typescript
if (response.ok) {
  const result = await response.json();
  if (result.data && result.data.pnr && result.data.full_name) {
    // ✅ Validation stricte des champs obligatoires
    // Créer le passager...
  } else {
    console.warn('[BAGGAGE] API response incomplete:', result.data);
    // Fallback à recherche locale
  }
}
```

### 🔧 **CORRECTION 5: Ajouter des Logs de Diagnostic**

```typescript
setFoundPassenger(passenger);
console.log('[BAGGAGE] ✅ Passager associé:', {
  id: passenger.id,
  name: passenger.fullName,
  pnr: passenger.pnr,
  flight: passenger.flightNumber,
  baggage_count: passenger.baggageCount,
});
```

---

## 📋 **CHECKLIST DE VÉRIFICATION**

- [ ] Validation que `passenger.id` n'est jamais null/undefined/empty
- [ ] Tous les retours de `getPassengerById()` vérifiés
- [ ] Mapping camelCase/snake_case cohérent partout
- [ ] Response API validée (existence des champs)
- [ ] Logs de diagnostic à chaque étape clé
- [ ] Tests avec différents scénarios:
  - [ ] Passager dans API
  - [ ] Passager pas dans API
  - [ ] Response API incomplète
  - [ ] Quota dépassé
  - [ ] Doublons bagage

---

## 🎯 **PRIORITÉ DES CORRECTIONS**

1. **🔴 P0 (CRITIQUE)**: Validation `passenger.id` avant création bagages
2. **🔴 P0 (CRITIQUE)**: Vérifier re-fetch après création passager
3. **🟠 P1 (GRAVE)**: Corriger Mapping camelCase (affichage incorrect)
4. **🟠 P1 (GRAVE)**: Valider response API
5. **🟡 P2 (IMPORTANT)**: Ajouter logs de diagnostic

---

## 📊 **RÉSUMÉ**

| Aspect | État | Risque |
|--------|------|--------|
| **Foreign Key** | ✅ Définie | Très Bas |
| **Recherche Passager** | ✅ Multi-niveaux | Bas |
| **Validation Quota** | ✅ Présente | Bas |
| **Antidoublons** | ✅ Présents | Bas |
| **Validation ID Passager** | ❌ Absente | **CRITIQUE** |
| **Mapping Type** | ⚠️ Incohérent | **GRAVE** |
| **Re-fetch Validation** | ❌ Absente | **GRAVE** |
| **Logs Diagnostic** | ⚠️ Limités | Moyen |

---

**Conclusion**: La liaison passager-bagages est **architecturalement solide** mais présente **des risques d'exécution** dus à l'absence de validations strictes à certains points critiques.
