# Test de Flux Complet - BFS

Ce script teste le flux complet de l'application pour tous les agents et tous les aéroports.

## Prérequis

1. Installer les dépendances :
```bash
npm install
```

2. Le script nécessite `tsx` pour exécuter TypeScript directement :
```bash
npm install --save-dev tsx
```

## Exécution

```bash
npm run test:flow
```

## Ce que teste le script

Le script teste le flux complet suivant pour **chaque aéroport** :

1. **Check-in** : Enregistrement d'un passager avec un boarding pass
2. **Baggage** : Enregistrement des bagages RFID pour le passager
3. **Boarding** : Embarquement du passager
4. **Arrival** : Confirmation de l'arrivée des bagages à l'aéroport de destination
5. **Supervisor** : Consultation des données par le superviseur

### Validations testées

- ✅ Validation que le vol concerne l'aéroport de l'agent
- ✅ Détection des doublons (passagers, bagages, embarquements)
- ✅ Filtrage correct des données par aéroport
- ✅ Création et mise à jour correcte des données
- ✅ Flux complet sans erreur

## Résultats

Le script affiche :
- Le nombre total de tests exécutés
- Le nombre de tests réussis/échoués
- Le taux de réussite
- Les détails des échecs (si applicable)
- Les statistiques par aéroport

## Note importante

Ce script utilise directement `expo-sqlite` qui nécessite un environnement React Native/Expo. Si vous rencontrez des erreurs liées à `expo-sqlite`, vous pouvez :

1. Exécuter le test dans l'application Expo elle-même
2. Ou utiliser les services mock pour tester la logique métier

## Structure du test

Pour chaque aéroport :
- Crée des utilisateurs mock pour chaque rôle
- Simule un vol vers un autre aéroport
- Teste chaque étape du flux
- Vérifie que les données sont correctement filtrées par aéroport

