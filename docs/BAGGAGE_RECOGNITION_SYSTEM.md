# 🎯 Système de Reconnaissance et Liaison des Bagages

## Table des matières
- [Vue d'ensemble](#vue-densemble)
- [Flux de reconnaissance](#flux-de-reconnaissance)
- [Architecture technique](#architecture-technique)
- [Parsing des données](#parsing-des-données)
- [Système de liaison](#système-de-liaison)
- [Cas particuliers](#cas-particuliers)

---

## Vue d'ensemble

Le système BFS (Baggage Found Solution) utilise un **processus en 2 étapes** pour lier les bagages aux passagers :

### Étape 1 : Identification du passager
Le système scanne le **boarding pass** du passager (format PDF417 ou QR code) et extrait :
- PNR (identifiant unique)
- Nom complet
- Numéro de vol
- Nombre de bagages attendus
- Numéro de base des tags RFID (pour Air Congo)

### Étape 2 : Enregistrement des bagages
Pour chaque bagage du passager, le système scanne le **tag RFID** et :
- Extrait le numéro d'identification
- Vérifie qu'il n'a pas déjà été scanné
- Le lie automatiquement au passager identifié à l'étape 1
- Enregistre dans la base de données locale et synchronise

---

## Flux de reconnaissance

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCAN BOARDING PASS                           │
│  (PDF417 / QR Code du passager)                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ parserService  │
                    │    .parse()    │
                    └────────┬───────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  Extraction des données:     │
              │  • PNR                       │
              │  • Nom complet               │
              │  • Vol, départ, arrivée      │
              │  • Nombre de bagages         │
              │  • Numéro de base (Air Congo)│
              └──────────┬───────────────────┘
                         │
                         ▼
           ┌─────────────────────────────┐
           │ Recherche passager par PNR  │
           │ dans la base de données     │
           └──────────┬──────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
    ┌──────────┐          ┌──────────────┐
    │ TROUVÉ   │          │ NON TROUVÉ   │
    └────┬─────┘          └──────┬───────┘
         │                       │
         │                       ▼
         │              ❌ Erreur: Passager
         │                 non enregistré
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                    SCAN TAG RFID BAGAGE                        │
│  (Code-barres / RFID de l'étiquette bagage)                   │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ parserService  │
                    │.parseBaggageTag│
                    └────────┬───────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  Extraction du tag RFID:     │
              │  • Numéro d'étiquette        │
              │  • Nom passager (optionnel)  │
              │  • PNR (optionnel)           │
              │  • Vol (optionnel)           │
              └──────────┬───────────────────┘
                         │
                         ▼
           ┌─────────────────────────────┐
           │ Vérifications anti-doublon: │
           │ • raw_scans                 │
           │ • baggages                  │
           │ • international_baggages    │
           └──────────┬──────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
    ┌──────────┐          ┌──────────────┐
    │ NOUVEAU  │          │ DÉJÀ SCANNÉ  │
    └────┬─────┘          └──────┬───────┘
         │                       │
         │                       ▼
         │              ⚠️ Alerte: Bagage
         │                 déjà enregistré
         │
         ▼
┌─────────────────────┐
│  Passager trouvé?   │
└──────┬──────────────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
 OUI     NON
   │       │
   │       ▼
   │    ┌────────────────────────────┐
   │    │ Création BAGAGE            │
   │    │ INTERNATIONAL              │
   │    │ (table international_      │
   │    │  baggages)                 │
   │    │                            │
   │    │ • Statut: 'scanned'        │
   │    │ • À réconcilier avec BIRS  │
   │    └────────────────────────────┘
   │
   ▼
┌────────────────────────────┐
│ Création BAGAGE NORMAL     │
│ (table baggages)           │
│                            │
│ • passenger_id = id        │
│ • rfid_tag = tag scanné    │
│ • status = 'checked'       │
│ • Liaison immédiate        │
└────────────────────────────┘
```

---

## Architecture technique

### Composants principaux

#### 1. **BaggageScreen.tsx**
Écran principal de scan des bagages.

**Responsabilités :**
- Gestion de la caméra (scan boarding pass + tag RFID)
- Orchestration du flux en 2 étapes
- Affichage des informations en temps réel
- Prévention des scans multiples

**Fonctions clés :**
```typescript
handleBoardingPassScanned()  // Étape 1: Scan boarding pass
handleRfidScanned()           // Étape 2: Scan tag RFID
```

#### 2. **parserService**
Service de parsing des données scannées.

**Responsabilités :**
- Détection automatique du format (Air Congo, Ethiopian, Generic)
- Extraction des informations du boarding pass
- Extraction du tag RFID depuis l'étiquette bagage

**Fonctions clés :**
```typescript
parse(rawData: string)                    // Parse boarding pass
parseBaggageTag(rawData: string)          // Parse tag bagage
```

#### 3. **databaseService**
Service de gestion de la base de données SQLite locale.

**Responsabilités :**
- CRUD sur les passagers et bagages
- Recherche par PNR et tag RFID
- Gestion de la file de synchronisation

**Fonctions clés :**
```typescript
getPassengerByPnr(pnr: string)
createBaggage(data: BaggageData)
getBaggageByRfidTag(rfidTag: string)
```

#### 4. **rawScanService**
Service de traçabilité des scans bruts.

**Responsabilités :**
- Enregistrement de tous les scans (historique complet)
- Prévention des doublons
- Statistiques et audit

**Fonctions clés :**
```typescript
createOrUpdateRawScan()
findByRawData()
```

---

## Parsing des données

### Format Boarding Pass

Le système supporte 3 formats de boarding pass :

#### **1. Air Congo (9U)**
```
M19UDUMBA/ALBERT     KXXS8Q FIHFJMAC9U 0404346Y116D002A0114 100
```

**Caractéristiques :**
- Code compagnie : `9U`
- PNR : 6 caractères (ex: `KXXS8Q`)
- Bagages : Format `002A` → 2 bagages, numéro de base A
- Numéros d'étiquettes attendus : générés séquentiellement

#### **2. Ethiopian Airlines (ET)**
```
M2MOHILO/LOUVE     EYFMKNE ADDFIH ET 0840Y022L1A 5 14922NOV ... ET 0863Y012M1C...
```

**Caractéristiques :**
- Code compagnie : `ET`
- PNR : 6-7 caractères (ex: `EYFMKNE`)
- Multi-segments possibles (M2)
- Hub : Addis Ababa (ADD)

#### **3. Generic (IATA BCBP)**
Format standard IATA Bar Coded Boarding Pass.

### Format Tag Bagage

Exemple de données extraites d'un tag RFID :
```
NME:MOHILO LOUVE | 4071 ET201605 | ET73/22NOV | PNR:HHJWNG | GMA→FIH
```

**Extraction :**
```typescript
{
  passengerName: "MOHILO LOUVE",
  rfidTag: "4071 ET201605",      // Tag RFID principal
  flightNumber: "ET73",
  flightDate: "22NOV",
  pnr: "HHJWNG",
  origin: "GMA",
  destination: "FIH"
}
```

**Formats de tag RFID supportés :**
- `4071 ET201605` (format complet)
- `4071` (numéro court)
- `ET201605` (code Ethiopian)
- `4071136262` (numéro long)

---

## Système de liaison

### Liaison Bagage → Passager

La liaison se fait via la **clé étrangère** `passenger_id` dans la table `baggages`.

#### **Schéma SQLite (app mobile)**
```sql
CREATE TABLE baggages (
  id TEXT PRIMARY KEY,
  passenger_id TEXT NOT NULL,        -- ← LIAISON
  rfid_tag TEXT UNIQUE NOT NULL,
  expected_tag TEXT,
  status TEXT NOT NULL DEFAULT 'checked',
  -- ... autres champs
  FOREIGN KEY (passenger_id) REFERENCES passengers(id)
);
```

#### **Schéma PostgreSQL (Supabase)**
```sql
CREATE TABLE baggages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID REFERENCES passengers(id) ON DELETE CASCADE,  -- ← LIAISON
  tag_number TEXT UNIQUE NOT NULL,
  -- ... autres champs
);
```

### Processus de liaison

```typescript
// 1. Scan boarding pass → Trouver le passager
const passenger = await databaseService.getPassengerByPnr(pnr);

// 2. Scan tag RFID → Créer le bagage lié
await databaseService.createBaggage({
  passengerId: passenger.id,    // ← LIAISON ICI
  rfidTag: extractedTag,
  status: 'checked',
  checkedBy: currentUser.id,
  // ...
});
```

### Validation des tags attendus (Air Congo)

Air Congo fournit un **numéro de base** pour les tags RFID :

```typescript
// Génération des tags attendus
function generateExpectedTags(baseNumber: string, count: number) {
  const base = parseInt(baseNumber, 10);
  return Array.from({ length: count }, (_, i) => 
    (base + i).toString()
  );
}

// Exemple:
// baseNumber = "4071", count = 3
// → Tags attendus: ["4071", "4072", "4073"]
```

Si le tag scanné correspond à un tag attendu :
```typescript
const isExpected = expectedTags.includes(rfidTag);
if (isExpected) {
  baggage.expectedTag = rfidTag;  // Marqué comme attendu
}
```

---

## Cas particuliers

### 1. Bagage sans passager (International)

Si un bagage est scanné mais **aucun passager n'est trouvé** :

```typescript
if (!passenger) {
  // Création d'un bagage international
  const internationalBaggage = await birsService.createInternationalBaggage(
    rfidTag,
    userId,
    airportCode,
    baggageTagData.passengerName,  // Extrait du tag
    baggageTagData.pnr,
    baggageTagData.flightNumber,
    baggageTagData.origin
  );
  
  // → Stocké dans table 'international_baggages'
  // → À réconcilier plus tard avec un rapport BIRS
}
```

### 2. Prévention des doublons

Trois niveaux de vérification :

```typescript
// Niveau 1: Vérifier dans raw_scans (historique)
const existingScan = await rawScanService.findByRawData(data);
if (existingScan?.statusBaggage) {
  return error('Bagage déjà scanné');
}

// Niveau 2: Vérifier dans baggages (nationaux)
const existing = await databaseService.getBaggageByRfidTag(rfidTag);
if (existing) {
  return error('Bagage déjà enregistré');
}

// Niveau 3: Vérifier dans international_baggages
const existingInternational = await birsDatabaseService
  .getInternationalBaggageByRfidTag(rfidTag);
if (existingInternational) {
  return error('Bagage international déjà scanné');
}
```

### 3. Synchronisation offline

Tous les bagages créés en mode offline sont ajoutés à la **file de synchronisation** :

```typescript
await databaseService.addToSyncQueue({
  tableName: 'baggages',
  recordId: rfidTag,
  operation: 'insert',
  data: JSON.stringify({ passengerId, rfidTag }),
  userId: currentUser.id
});
```

Lors de la reconnexion, la file est traitée automatiquement.

### 4. Suivi des statuts

Un bagage passe par plusieurs statuts :

```typescript
type BaggageStatus = 
  | 'checked'     // Enregistré au check-in
  | 'loaded'      // Chargé dans l'avion
  | 'in_transit'  // En transit
  | 'arrived'     // Arrivé à destination
  | 'delivered'   // Livré au passager
  | 'rush'        // Soute pleine - Réacheminement nécessaire
  | 'lost';       // Bagage perdu
```

Chaque changement de statut est tracé avec :
- Horodatage (`checked_at`, `arrived_at`, etc.)
- Agent responsable (`checked_by`, `arrived_by`, etc.)

---

## Résumé

Le système BFS utilise une approche **robuste et traçable** pour lier les bagages aux passagers :

1. ✅ **Identification certaine** via PNR unique
2. ✅ **Prévention des doublons** multi-niveaux
3. ✅ **Support multi-formats** (Air Congo, Ethiopian, Generic)
4. ✅ **Gestion des cas exceptionnels** (bagages internationaux, tags inconnus)
5. ✅ **Traçabilité complète** via `raw_scans` et audit logs
6. ✅ **Synchronisation offline** garantie

Cette architecture permet une **fiabilité maximale** dans l'enregistrement et le suivi des bagages.
