# ✅ Résultat Attendu - Kenya Airways

## Données Brutes
```
M1RAZIOU/MOUSTAPHA    E7T5GVL FIHNBOKQ 0555 335M031G0009 348>5180      B1A              2A70635143243700                           N
```

## Décomposition Correcte

| Champ | Valeur | Position |
|-------|--------|----------|
| **Format** | M1 | Position 0-2 |
| **Nom** | RAZIOU/MOUSTAPHA | Après M1 jusqu'aux espaces multiples |
| **PNR** | E7T5GVL | 7 caractères après espaces |
| **Départ** | FIH | 3 caractères (Kinshasa) |
| **Arrivée** | NBO | 3 caractères (Nairobi) |
| **Code** | KQ | 2 caractères (Kenya Airways) |
| **Vol** | 0555 | 4 chiffres |
| **Date** | 335 | Jour julien (1er décembre) |
| **Classe** | M | Classe économique |
| **Siège Seq** | 031 | Séquence |
| **Compartiment** | G | Section G |
| **Bagages** | 0009 | 9 bagages |
| **Ticket** | 5143243700 | Plus loin dans les données |

## Résultat Final Attendu ✅

```json
{
  "pnr": "E7T5GVL",                    // ✅ 7 caractères
  "fullName": "RAZIOU MOUSTAPHA",      // ✅ Sans espaces multiples
  "firstName": "MOUSTAPHA",            // ✅
  "lastName": "RAZIOU",                // ✅
  "flightNumber": "KQ0555",            // ✅ Code + Vol
  "flightTime": undefined,             // ⚠️ Pas dans BCBP (ou "05:55" si interprété)
  "flightDate": "335",                 // ✅ Jour julien
  "route": "FIH-NBO",                  // ✅
  "departure": "FIH",                  // ✅
  "arrival": "NBO",                    // ✅
  "seatNumber": "031G",                // ✅ Seq + Comp
  "ticketNumber": "5143243700",        // ✅
  "companyCode": "KQ",                 // ✅ Kenya Airways
  "airline": "Kenya Airways",          // ✅
  "baggageInfo": {                     // ✅
    "count": 9,                        // ✅ 0009 = 9 bagages
    "baseNumber": undefined,
    "expectedTags": undefined
  },
  "rawData": "M1RAZIOU/MOUSTAPHA...",  // ✅
  "format": "GENERIC"                  // ✅
}
```

## Logs Attendus

```
LOG  [PARSER] 📋 Parsing GENERIC/BCBP, données brutes: M1RAZIOU/MOUSTAPHA    E7T5GVL FIHNBOKQ 0555...
LOG  [PARSER] ✅ Format BCBP structuré détecté
LOG  [PARSER] 📊 Données extraites BCBP: {
  fullName: "RAZIOU MOUSTAPHA",
  pnr: "E7T5GVL",
  departure: "FIH",
  arrival: "NBO",
  companyCode: "KQ",
  flightNumber: "KQ0555",
  flightDate: "335",
  cabinClass: "M",
  seatNumber: "031G",
  baggageCount: "0009"
}
LOG  [PARSER] ✅ Résultat final GENERIC: {...}
```

## Vérifications Check-In Screen

L'écran devrait maintenant afficher:

```
✅ Nom: RAZIOU MOUSTAPHA
✅ PNR: E7T5GVL (7 caractères)
✅ Vol: KQ0555 (Kenya Airways)
✅ Route: FIH-NBO (Kinshasa → Nairobi)
✅ Date: 335 (Jour 335 = 1er Décembre)
✅ Siège: 031G
✅ Bagages: 9 pièces
✅ Ticket: 5143243700
```

## Si Regex Échoue Encore

Si aucune des 3 regex ne matche, vérifier:
1. Caractères invisibles dans rawData
2. Encodage des espaces (espaces normaux vs non-breaking spaces)
3. Longueur exacte de chaque champ
4. Console.log du rawData brut avec .charCodeAt() pour chaque caractère
