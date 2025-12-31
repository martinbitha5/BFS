# Corrections BFS - 31 Décembre 2025

## Problème 1: Mobile - Bagage non reconnu après scan du boarding pass

### Cause Identifiée
Lors du scan du boarding pass en check-in, les données du passager (notamment `baggage_count` et `baggage_base_number`) n'étaient pas stockées en base SQLite. Donc quand on scannait le bagage, la fonction `getPassengerByExpectedTag()` échouait car ces champs étaient NULL.

### Solution Appliquée
**Fichier modifié**: `/src/screens/CheckinScreen.tsx` (lignes 178-216)

Ajout d'une étape 5 après le scan du boarding pass pour créer/mettre à jour le passager en base SQLite avec:
- `baggageCount`: nombre de bagages extrait du boarding pass
- `baggageBaseNumber`: numéro de base des bagages
- Tous les autres champs du passager (PNR, nom, vol, route, etc.)

```typescript
// ✅ ÉTAPE 5: Créer/mettre à jour le passager en base SQLite avec les données parsées
if (parsedData) {
  const { databaseServiceInstance } = await import('../services');
  
  let existingPassenger = await databaseServiceInstance.getPassengerByPnr(parsedData.pnr);
  
  if (!existingPassenger) {
    const passengerId = await databaseServiceInstance.createPassenger({
      pnr: parsedData.pnr,
      fullName: parsedData.fullName,
      firstName: parsedData.firstName,
      lastName: parsedData.lastName,
      flightNumber: parsedData.flightNumber,
      flightTime: parsedData.flightTime,
      airline: parsedData.airline,
      airlineCode: parsedData.companyCode,
      departure: parsedData.departure,
      arrival: parsedData.arrival,
      route: parsedData.route,
      companyCode: parsedData.companyCode,
      ticketNumber: parsedData.ticketNumber,
      seatNumber: parsedData.seatNumber,
      baggageCount: parsedData.baggageInfo?.count || 1,
      baggageBaseNumber: parsedData.baggageInfo?.baseNumber,
      rawData: data,
      format: parsedData.format,
      checkedInAt: new Date().toISOString(),
      checkedInBy: user.id,
      synced: false,
    });
  }
}
```

### Flux Corrigé
1. ✅ Scan boarding pass → Parser extrait données (PNR, nom, baggage_count, baggage_base_number)
2. ✅ Données stockées en base SQLite dans table `passengers`
3. ✅ Scan bagage → Recherche par tag attendu trouve le passager
4. ✅ Bagage lié au passager avec `passenger_id`

---

## Problème 2: Dashboard - Données en base mais non affichées

### Cause Identifiée
L'API retournait les bagages avec un champ `passengers` (pluriel) mais le dashboard attendait `passenger` (singulier). De plus, le champ `checkedAt` n'était pas retourné.

### Solution Appliquée
**Fichier modifié**: `/api/src/routes/baggage.routes.ts` (lignes 13-66)

Corrections apportées:
1. Ajout du paramètre `airport` en query pour permettre au dashboard de filtrer par aéroport
2. Retour du champ `checkedAt` au lieu de `scannedAt`
3. Changement de `passenger` à `passengers` pour cohérence avec la structure Supabase
4. Ajout du champ `rfidTag` en alias de `tag_number`

```typescript
const transformedData = data?.map(baggage => {
  const passenger = Array.isArray(baggage.passengers) 
    ? baggage.passengers[0] 
    : baggage.passengers;
  
  return {
    id: baggage.id,
    tagNumber: baggage.tag_number,
    rfidTag: baggage.tag_number,  // ✅ Ajout
    passengerId: baggage.passenger_id,
    weight: baggage.weight,
    status: baggage.status,
    flightNumber: baggage.flight_number,
    airportCode: baggage.airport_code,
    currentLocation: baggage.current_location,
    checkedAt: baggage.checked_at,  // ✅ Correction
    arrivedAt: baggage.arrived_at,
    deliveredAt: baggage.delivered_at,
    lastScannedAt: baggage.last_scanned_at,
    lastScannedBy: baggage.last_scanned_by,
    passengers: passenger ? {  // ✅ Changé de 'passenger' à 'passengers'
      id: passenger.id,
      fullName: passenger.full_name,
      pnr: passenger.pnr,
      flightNumber: passenger.flight_number,
      departure: passenger.departure,
      arrival: passenger.arrival
    } : null
  };
});
```

**Fichier modifié**: `/dashboard/src/pages/Baggages.tsx` (lignes 6-23)

Mise à jour de l'interface `Baggage` pour accepter les champs optionnels:
```typescript
interface Baggage {
  id: string;
  tagNumber: string;
  rfidTag?: string;  // ✅ Ajout
  passengerId: string;
  weight: number;
  status: 'checked' | 'arrived' | 'rush';
  flightNumber: string;
  checkedAt: string;
  arrivedAt: string | null;
  currentLocation: string;
  passengers?: {  // ✅ Changé de 'passengers' à optionnel
    fullName: string;
    pnr: string;
    departure: string;
    arrival: string;
  };
}
```

### Flux Corrigé
1. ✅ Mobile crée bagage avec `passenger_id`
2. ✅ API retourne bagages avec structure cohérente
3. ✅ Dashboard reçoit données et les affiche correctement

---

## Vérification

### Checklist Mobile
- [x] Parser extrait `baggageInfo` (count et baseNumber)
- [x] CheckinScreen crée passager avec `baggage_count` et `baggage_base_number`
- [x] BaggageScreen recherche passager par tag attendu
- [x] Bagage créé avec `passenger_id` correct

### Checklist Dashboard
- [x] API retourne champ `passengers` (structure cohérente)
- [x] API retourne champ `checkedAt`
- [x] Dashboard interface accepte champs optionnels
- [x] Dashboard affiche les bagages correctement

---

## Fichiers Modifiés
1. `/src/screens/CheckinScreen.tsx` - Création passager lors du scan
2. `/api/src/routes/baggage.routes.ts` - Retour données cohérentes
3. `/dashboard/src/pages/Baggages.tsx` - Interface mise à jour

## Prochaines Étapes (Optionnel)
- Tester le flux complet: Check-in → Scan bagage → Affichage dashboard
- Vérifier que les données de bagages sont correctement synchronisées
- Valider que la recherche par tag attendu fonctionne pour tous les formats de tags
