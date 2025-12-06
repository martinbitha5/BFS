# Test Parsing Kenya Airways

## Données Brutes Réelles
```
M1RAZIOU/MOUSTAPHA    E7T5GVL FIHNBOKQ 0555 335M031G0009 348>5180      B1A              2A70635143243700                           N
```

## Analyse Structure
```
M1                        = Format marker
RAZIOU/MOUSTAPHA          = Nom (avec espaces de remplissage après)
E7T5GVL                   = PNR (7 caractères)
FIHNBO                    = FIH (départ) + NBO (arrivée)
KQ                        = Code compagnie Kenya Airways
0555                      = Numéro de vol (avec espace avant)
335                       = Date (jour julien)
M                         = Classe cabine
031                       = Séquence siège
G                         = Compartiment
0009                      = Nombre de bagages
```

## Problème Actuel
- PNR: UNKNOWN ❌ (devrait être E7T5GVL)
- flightDate: undefined ❌ (devrait être 335)
- baggageInfo: undefined ❌ (devrait être {count: 9})

## Regex Attendue
La regex doit capturer avec les espaces MULTIPLES après le nom !
