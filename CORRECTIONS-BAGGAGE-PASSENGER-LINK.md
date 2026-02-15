# 🔧 CORRECTIONS À APPLIQUER - Liaison Passager-Bagages

## Correction 1: Valider passenger.id dans BaggageScreen.tsx

**Fichier**: `src/screens/BaggageScreen.tsx`  
**Ligne**: Après la vérification `if (!passenger)` (ligne 318)

Ajouter une validation stricte:

```typescript
// ❌ AVANT (ligne 318-320)
if (!passenger) {
  await playErrorSound();
  setProcessing(false);
  
  Alert.alert(
    'TAG NON RECONNU',
    `Le tag ${tagNumber} n'appartient a aucun passager enregistre.\n\nVerifiez que le passager a bien fait son check-in.`,
    // ...
  );
  return;
}

// ✅ APRÈS: Ajouter cette validation STRICTE
if (!passenger) {
  await playErrorSound();
  setProcessing(false);
  
  Alert.alert(
    'TAG NON RECONNU',
    `Le tag ${tagNumber} n'appartient a aucun passager enregistre.\n\nVerifiez que le passager a bien fait son check-in.`,
    // ...
  );
  return;
}

// 🔴 NOUVELLE VALIDATION: Vérifier que passenger.id existe et est valide
if (!passenger.id || typeof passenger.id !== 'string' || passenger.id.trim() === '') {
  console.error('[BAGGAGE] ❌ CRITICAL: passenger.id invalide!', {
    id: passenger.id,
    type: typeof passenger.id,
    fullName: passenger.fullName,
  });
  
  await playErrorSound();
  setProcessing(false);
  
  Alert.alert(
    'ERREUR SYSTÈME',
    'Les données du passager sont incomplètes.\n\nID passager manquant.\n\nContactez le support.',
    [
      {
        text: 'Nouveau scan',
        onPress: () => {
          isProcessingRef.current = false;
          setScanned(false);
          setShowScanner(true);
        },
      },
    ],
    { cancelable: false }
  );
  return;
}
```

---

## Correction 2: Ajouter check après re-fetch du passager

**Fichier**: `src/screens/BaggageScreen.tsx`  
**Ligne**: Après `passenger = await databaseServiceInstance.getPassengerById(passengerId);` (ligne 267)

```typescript
// ❌ AVANT (ligne 265-267)
// Créer le passager localement pour les futurs scans et pour lier le bagage
const passengerId = await databaseServiceInstance.createPassenger({
  // ...
});

passenger = await databaseServiceInstance.getPassengerById(passengerId);

// ✅ APRÈS: Ajouter validation du re-fetch
passenger = await databaseServiceInstance.getPassengerById(passengerId);

// 🔴 NOUVELLE VALIDATION
if (!passenger) {
  console.error('[BAGGAGE] ❌ CRITICAL: Passager créé mais non trouvé au re-fetch!', {
    passengerId,
    apiResponse: result.data,
  });
  
  await playErrorSound();
  setProcessing(false);
  
  Alert.alert(
    'ERREUR SYSTÈME',
    'Le passager a été créé mais ne peut pas être chargé.\n\nVeuillez recommencer le scan.',
    [
      {
        text: 'Nouveau scan',
        onPress: () => {
          isProcessingRef.current = false;
          setScanned(false);
          setShowScanner(true);
        },
      },
    ],
    { cancelable: false }
  );
  return;
}
```

---

## Correction 3: Corriger le mapping camelCase dans database.service.ts

**Fichier**: `src/services/database.service.ts`  
**Fonction**: `getPassengerByPnr()` (ligne 450)

### Avant (❌ Mapping incohérent):
```typescript
async getPassengerByPnr(pnr: string): Promise<Passenger | null> {
  if (!this.db) throw new Error('Database not initialized');

  const result = await this.db.getFirstAsync<Passenger>(
    'SELECT * FROM passengers WHERE pnr = ?',
    [pnr]
  );

  if (result) {
    return {
      ...result,  // ⚠️ Spread direct sans conversion snake_case → camelCase
      synced: Boolean(result.synced),
    };
  }

  return null;
}
```

### Après (✅ Mapping explicite):
```typescript
async getPassengerByPnr(pnr: string): Promise<Passenger | null> {
  if (!this.db) throw new Error('Database not initialized');

  const result = await this.db.getFirstAsync<any>(
    'SELECT * FROM passengers WHERE pnr = ?',
    [pnr]
  );

  if (result) {
    // ✅ MAPPING EXPLICITE: snake_case → camelCase
    return {
      id: result.id,
      pnr: result.pnr,
      fullName: result.full_name,
      firstName: result.first_name,
      lastName: result.last_name,
      flightNumber: result.flight_number,
      flightTime: result.flight_time,
      airline: result.airline,
      airlineCode: result.airline_code,
      departure: result.departure,
      arrival: result.arrival,
      route: result.route,
      companyCode: result.company_code,
      ticketNumber: result.ticket_number,
      seatNumber: result.seat_number,
      cabinClass: result.cabin_class,
      baggageCount: result.baggage_count,
      baggageBaseNumber: result.baggage_base_number,
      rawData: result.raw_data,
      format: result.format,
      checkedInAt: result.checked_in_at,
      checkedInBy: result.checked_in_by,
      synced: Boolean(result.synced),
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  return null;
}
```

### ⚠️ APPLIQUER LE MÊME CORRECTION À:
- `getPassengerByName()` (ligne 472)
- `getPassengerById()` (ligne 581)

---

## Correction 4: Valider la response API

**Fichier**: `src/screens/BaggageScreen.tsx`  
**Ligne**: Après le fetch API (ligne 228-235)

### Avant (❌ Validation insuffisante):
```typescript
if (response.ok) {
  const result = await response.json();
  if (result.data) {  // ⚠️ Seul check
    console.log('[BAGGAGE] Passager trouve via API:', result.data.full_name);
    // ...
  }
}
```

### Après (✅ Validation stricte):
```typescript
if (response.ok) {
  const result = await response.json();
  
  // ✅ Validation stricte des champs obligatoires
  if (result.data && 
      result.data.pnr && 
      result.data.full_name &&
      result.data.flight_number &&
      result.data.departure &&
      result.data.arrival) {
    
    console.log('[BAGGAGE] ✅ Passager trouvé via API:', {
      pnr: result.data.pnr,
      name: result.data.full_name,
      flight: result.data.flight_number,
    });
    
    // Extraction et création...
    // (code existant)
    
  } else {
    console.warn('[BAGGAGE] ⚠️ API response incomplète:', result.data);
    // Continuer avec fallback (cherche localement)
  }
}
```

---

## Correction 5: Ajouter logs de diagnostic complets

**Fichier**: `src/screens/BaggageScreen.tsx`  
**Après**: Création du bagage (ligne 354-378)

```typescript
// 🟢 APRÈS CRÉATION DU BAGAGE: Ajouter diagnostic
console.log('[BAGGAGE] 🟢 Bagage enregistré avec succès:', {
  baggageId,
  tagNumber,
  passengerDetails: {
    id: passenger.id,
    pnr: passenger.pnr,
    fullName: passenger.fullName,
    flightNumber: passenger.flightNumber,
    baggageCount: passenger.baggageCount,
  },
  timestamp: new Date().toISOString(),
});

setFoundPassenger(passenger);
console.log('[BAGGAGE] ✅ Passager associé défini dans l\'état:', {
  passengerId: passenger.id,
  passengerName: passenger.fullName,
});
```

**ET AUSSI**: Avant l'affichage du résultat (ligne 538):
```typescript
{/* Section: Passager Associé */}
{foundPassenger && (
  <View style={[styles.resultContainer, { /* ... */ }]}>
    {/* ... */}
    {foundPassenger.fullName && (
      <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
        <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>Nom:</Text>
        <Text style={[styles.resultValue, { color: colors.text.primary, fontWeight: FontWeights.bold }]}>
          {foundPassenger.fullName}
        </Text>
      </View>
    )}
    {foundPassenger.pnr && (
      <View style={[styles.resultRow, { borderBottomColor: colors.border.light }]}>
        <Text style={[styles.resultLabel, { color: colors.text.secondary }]}>PNR:</Text>
        <Text style={[styles.resultValue, { color: colors.text.primary, fontFamily: 'monospace' }]}>
          {foundPassenger.pnr}
        </Text>
      </View>
    )}
    {/* ... */}
  </View>
)}
```

---

## 📋 PLAN D'APPLICATION

### Phase 1 (URGENT - P0):
1. ✅ Correction 1: Valider `passenger.id`
2. ✅ Correction 2: Check re-fetch après création
3. ✅ Correction 5: Ajouter logs (aide au débogage)

### Phase 2 (IMPORTANT - P1):
4. ✅ Correction 3: Corriger Mapping camelCase (toutes fonctions)
5. ✅ Correction 4: Valider response API

---

## 🧪 TESTS RECOMMANDÉS

Après application des corrections, tester:

1. **Scan passager dans API**
   - Vérifier console: logs avec `id`, `pnr`, `fullName`
   - Vérifier UI: Passager associé affiché correctement

2. **Scan passager pas dans API**
   - Doit fallback à recherche locale
   - Ou afficher "TAG NON RECONNU"

3. **Quota dépassé**
   - Vérifier "QUOTA DE BAGAGES DÉPASSÉ"
   - Bagage ne doit PAS être créé

4. **Doublons**
   - Scanner 2x le même tag
   - 2e fois doit afficher "⚠️ Bagage déjà scanné"

5. **Response API incomplète**
   - Simuler réponse API sans `full_name`
   - Doit fallback gracieux

---

## ✨ VÉRIFICATION FINALE

Après corrections, vérifier dans la console:
```
[BAGGAGE] ✅ Tag bagage reçu: ...
[BAGGAGE] ✅ Passager trouvé via API: { pnr: ..., name: ..., flight: ... }
[BAGGAGE] 🟢 Bagage enregistré avec succès: { baggageId, tagNumber, passengerDetails }
[BAGGAGE] ✅ Passager associé défini dans l'état: { passengerId, passengerName }
```

Si vous voyez ces logs = ✅ **Liaison correcte**
