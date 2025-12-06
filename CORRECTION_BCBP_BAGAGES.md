# ✅ CORRECTION - Format BCBP Kenya Airways

**Date**: 6 Décembre 2024 11:40  
**Erreur corrigée**: Mauvaise interprétation du champ BCBP

---

## 🚨 **MON ERREUR**

J'ai **INCORRECTEMENT** interprété le champ `0009` comme étant le nombre de bagages.

### Ce que j'avais fait (FAUX) ❌:
```typescript
const baggageCount = bcbpMatch[11];  // ❌ FAUX !
baggageInfo = { count: 9 };          // ❌ FAUX !
```

---

## 📚 **FORMAT BCBP OFFICIEL (IATA Resolution 792)**

### Structure des Champs Obligatoires:

```
M1RAZIOU/MOUSTAPHA    E7T5GVL FIHNBOKQ 0555 335M031G0009
│ │                   │       │ │ │ │   │   │ │ │ │ │
│ │                   │       │ │ │ │   │   │ │ │ │ └─ Check-in Sequence Number (0009)
│ │                   │       │ │ │ │   │   │ │ │ └─── Compartment Code (G)
│ │                   │       │ │ │ │   │   │ │ └───── Seat Sequence (031)
│ │                   │       │ │ │ │   │   │ └─────── Class Code (M = Economy)
│ │                   │       │ │ │ │   │   └───────── Julian Date (335)
│ │                   │       │ │ │ │   └─────────────  Flight Number (0555)
│ │                   │       │ │ │ └───────────────── Airline Code (KQ)
│ │                   │       │ │ └─────────────────── Arrival (NBO)
│ │                   │       │ └───────────────────── Departure (FIH)
│ │                   │       └─────────────────────── PNR (E7T5GVL)
│ │                   └───────────────────────────────  Passenger Name
│ └─────────────────────────────────────────────────── Number of Legs (1)
└───────────────────────────────────────────────────── Format Code (M)
```

### **Champ Position 11 = `0009`**

**Ce n'est PAS le nombre de bagages !**

C'est le **Check-in Sequence Number** (Numéro de séquence d'enregistrement).

---

## 💼 **OÙ SONT LES INFOS BAGAGES ?**

Selon la spec IATA BCBP :

### Champ: `freeBaggageAllowance`
- **Type**: Conditionnel (C) - Optionnel
- **Localisation**: Section conditionnelle (pas dans les champs obligatoires)
- **Format**: Indique la franchise en pièces (PC), kilos (K) ou livres (P)
- **Exemple**: `2PC` = 2 pièces, `23K` = 23 kilos

### Dans vos données:
```
M1RAZIOU/MOUSTAPHA    E7T5GVL FIHNBOKQ 0555 335M031G0009 348>5180      B1A              2A70635143243700...
                                                        └─────────────────────────────────┘
                                                        Section conditionnelle/étendue
```

La section après `0009` contient:
- `348>5180` = Probablement des données structurées
- `B1A` = ?
- `2A70635143243700` = Numéro de billet (ticket number)

**Les infos bagages ne sont PAS présentes** dans ce boarding pass, ou sont encodées dans un format que je ne décode pas encore.

---

## 📅 **DATE: Jour Julien 335**

### Calcul:
- **Jour 335 en 2024** (année bissextile, 366 jours): **30 novembre 2024**
- **Jour 335 en 2025** (année normale, 365 jours): **1er décembre 2025**

**Ce n'est PAS le 31 décembre !**

Si le boarding pass a été scanné le 31 décembre, c'est peut-être:
- Vol prévu pour le 30 novembre mais scanné le 31 décembre (retard?)
- Ou l'année de référence est incorrecte

---

## ✅ **CORRECTION APPLIQUÉE**

### Code Avant (FAUX):
```typescript
const baggageCount = bcbpMatch[11];

if (baggageCount) {
  const count = parseInt(baggageCount, 10);
  if (!isNaN(count) && count > 0) {
    baggageInfo = {
      count,
      baseNumber: undefined,
      expectedTags: undefined
    };
  }
}
```

### Code Après (CORRECT):
```typescript
const checkInSeqNumber = bcbpMatch[11];  // Check-in sequence number, NOT baggage!

// Note: Baggage info is NOT in mandatory BCBP fields.
// It would be in optional 'freeBaggageAllowance' field which is not present here.
// The field at position 11 is 'checkInSequenceNumber' (e.g., '0009'), not baggage count!

// baggageInfo reste undefined car non présent dans ce boarding pass
```

---

## 🔍 **DONNÉES ACTUELLEMENT EXTRAITES (CORRECT)**

```json
{
  "pnr": "E7T5GVL",                    // ✅
  "fullName": "RAZIOU/MOUSTAPHA",      // ✅
  "flightNumber": "KQ0555",            // ✅
  "flightDate": "335",                 // ✅ (Jour julien)
  "route": "FIH-NBO",                  // ✅
  "departure": "FIH",                  // ✅
  "arrival": "NBO",                    // ✅
  "seatNumber": "031G",                // ✅
  "companyCode": "KQ",                 // ✅
  "airline": "Kenya Airways",          // ✅
  "baggageInfo": undefined,            // ✅ CORRECT - Non présent dans BCBP
  "ticketNumber": "5143243700"         // ✅
}
```

---

## 📊 **RÉSULTAT**

### Ce qui est maintenant CORRECT:
- ✅ PNR extrait: `E7T5GVL`
- ✅ Date de vol: `335` (jour julien)
- ✅ Vol complet: `KQ0555`
- ✅ Route: `FIH-NBO`
- ✅ Siège: `031G`
- ✅ **Bagages: `undefined`** (correct car non présent)

### Ce qui reste à clarifier:
- ❓ **Date réelle du vol**: Jour 335 = 30 novembre (pas 31 décembre)
- ❓ **Bagages**: Pas d'info bagages dans ce boarding pass BCBP

---

## 🎯 **PROCHAINES ÉTAPES**

Si vous avez besoin d'extraire les infos bagages:

1. **Vérifier si les bagages sont dans la section conditionnelle** après le check-in sequence
2. **Parser la section étendue** (`348>5180      B1A...`)
3. **Chercher le champ `freeBaggageAllowance`** s'il existe

Ou les infos bagages peuvent être:
- **Imprimées séparément** sur le boarding pass papier
- **Non encodées** dans le barcode BCBP
- **Dans un autre système** (étiquettes bagages séparées)

---

## 📚 **Références**

- IATA Resolution 792 - Bar Coded Boarding Pass (BCBP)
- Scandit BCBP Parser Documentation
- JavaDude Blog: "What's in my boarding pass barcode?"

**Désolé pour la confusion initiale !** ✅
