# BFS - Baggage Found Solution
## Documentation Complète du Projet

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Contexte et Objectifs](#contexte-et-objectifs)
3. [Fonctionnalités Principales](#fonctionnalités-principales)
4. [Architecture Technique](#architecture-technique)
5. [Technologies Utilisées](#technologies-utilisées)
6. [Structure du Projet](#structure-du-projet)
7. [Spécifications Techniques Détaillées](#spécifications-techniques-détaillées)
8. [Base de Données](#base-de-données)
9. [Parsing des Boarding Passes](#parsing-des-boarding-passes)
10. [Mode Offline-First](#mode-offline-first)
11. [Gestion des Rôles et Permissions](#gestion-des-rôles-et-permissions)
12. [Intégration Scanner RFID](#intégration-scanner-rfid)
13. [Configuration et Installation](#configuration-et-installation)
14. [Étapes de Développement Restantes](#étapes-de-développement-restantes)
15. [Points d'Attention](#points-dattention)

---

## 🎯 VUE D'ENSEMBLE

**BFS (Baggage Found Solution)** est une application mobile aéroportuaire développée en React Native avec Expo. Elle permet le suivi complet des bagages et la gestion des passagers dans un environnement aéroportuaire, avec support du mode hors ligne et synchronisation automatique.

### Public Cible
- Agents de check-in
- Agents de gestion des bagages
- Agents d'embarquement (check-out)
- Agents de réception des bagages à l'arrivée
- Superviseurs

### Plateformes
- **Production** : PDA Chainway C66 avec scanner RFID intégré (Android) et Smartphones iOS et Android
- **Développement/Test** : Smartphones iOS et Android via Expo Go
- **Déploiement** : App Store et Play Store pour les superviseurs

---

## 🎯 CONTEXTE ET OBJECTIFS

### Problématique
Les aéroports ont besoin d'un système fiable pour :
- Enregistrer les passagers rapidement via scan de boarding pass
- Lier les bagages RFID aux passagers
- Valider l'embarquement des passagers
- Confirmer la réception des bagages à l'arrivée
- Suivre et exporter les données pour la supervision

### Contraintes
- **Mode offline** : L'application doit fonctionner plusieurs heures sans connexion internet
- **Multi-compagnies** : Support de différents formats de boarding pass (Air Congo, Ethiopian Airlines, IATA BCBP standard)
- **Sécurité** : Chaque agent ne voit que les données de son aéroport assigné
- **Performance** : Scans rapides et traitement instantané

---

## 🚀 FONCTIONNALITÉS PRINCIPALES

### 1. CHECK-IN
**Rôle** : `checkin`

**Fonctionnalités** :
- Scanner le boarding pass PDF417 et d'autre format de boarding  du passager
- Extraire automatiquement les informations :
  - Nom complet (prénom + nom)
  - PNR (Passenger Name Record)
  - Numéro de vol
  - Route (départ → arrivée)
  - Heure du vol
  - Siège
  - Nombre de bagages
  - Numéro de ticket
- Vérifier que le vol concerne l'aéroport de l'agent
- Empêcher les doublons (vérification par PNR)
- Enregistrer dans la base de données locale (SQLite)
- Ajouter à la file de synchronisation pour Supabase

**Interface** :
- Vue scanner avec overlay
- Affichage des résultats après scan
- Retour automatique après 3 secondes
- Compteur de scans du jour

### 2. CHECK BAGAGES
**Rôle** : `baggage`

**Fonctionnalités** :
- Rechercher un passager par PNR (saisie manuelle ou scan boarding pass)
- Scanner les tags RFID des bagages
- Lier chaque bagage au passager
- Générer les tags attendus si le passager a plusieurs bagages (format Air Congo)
- Mettre à jour le nombre de bagages scannés
- Afficher le statut de chaque bagage (scanné/en attente)

**Format Air Congo pour les bagages** :
- Si le boarding pass contient `4071161863002` (finissant par `002`)
- Cela signifie 2 bagages
- Bagage 1 : `4071161863`
- Bagage 2 : `4071161864`
- Le nombre de bagages est déterminé par les 2 derniers chiffres

### 3. CHECK-OUT
**Rôle** : `boarding`

**Fonctionnalités** :
- Scanner le boarding pass à l'embarquement (pied de l'avion)
- Vérifier que le passager est bien enregistré
- Marquer le passager comme "embarqué"
- Enregistrer la date/heure d'embarquement
- Enregistrer l'agent qui a validé

### 4. CHECK ARRIVÉE
**Rôle** : `arrival`

**Fonctionnalités** :
- Scanner le tag RFID d'un bagage arrivé
- Afficher les informations du passager propriétaire
- Confirmer la réception du bagage
- Mettre à jour le statut du bagage à "arrived"
- Vérifier que le bagage appartient bien au passager

### 5. SUPERVISION
**Rôle** : `supervisor`

**Fonctionnalités** :
- Vue dashboard avec filtres :
  - Date
  - Numéro de vol
  - PNR
  - Nom du passager
  - Statut (enregistré, embarqué, etc.)
  - Agent
- Liste des passagers avec détails
- Vue détaillée d'un passager :
  - Informations complètes
  - Liste des bagages avec statuts
  - Statut d'embarquement
- Export Excel des données filtrées
- Accès en lecture seule
- Filtrage par aéroport assigné au superviseur

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Architecture Offline-First

```
┌─────────────────────────────────────────┐
│         APPLICATION MOBILE               │
│  (React Native + Expo + TypeScript)     │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌────────▼────────┐
│   SQLite       │    │   Sync Service   │
│  (Local DB)    │◄───┤  (File d'attente)│
└───────┬────────┘    └────────┬────────┘
        │                       │
        │              ┌────────▼────────┐
        │              │    Supabase     │
        │              │  (Cloud DB)     │
        │              └─────────────────┘
        │
┌───────▼────────┐
│  Scanner RFID   │
│  (Chainway SDK) │
└─────────────────┘
```

### Flux de Données

1. **Enregistrement Local** : Toutes les opérations sont d'abord enregistrées dans SQLite
2. **File d'Attente** : Chaque opération est ajoutée à `sync_queue`
3. **Synchronisation** : Quand la connexion est disponible, le `sync.service.ts` :
   - Vérifie la connexion internet
   - Traite la file d'attente
   - Envoie les données à Supabase
   - Marque les enregistrements comme synchronisés
   - Gère les erreurs et réessais

### Services Principaux

- **`auth.service.ts`** : Authentification et gestion des utilisateurs
- **`database.service.ts`** : Accès à SQLite (CRUD complet)
- **`sync.service.ts`** : Synchronisation avec Supabase
- **`parser.service.ts`** : Parsing des boarding passes
- **`scanner.service.ts`** : Gestion du scanner RFID (Chainway SDK)
- **`export.service.ts`** : Export Excel pour les superviseurs

---

## 💻 TECHNOLOGIES UTILISÉES

### Frontend
- **React Native** : Framework mobile cross-platform
- **Expo** : Outils et services pour React Native
- **Expo Router** : Navigation basée sur les fichiers
- **TypeScript** : Typage statique
- **React Hooks** : Gestion d'état

### Backend
- **Supabase** : Backend-as-a-Service
  - PostgreSQL (base de données)
  - Authentication
  - Row Level Security (RLS)
  - REST API automatique

### Base de Données Locale
- **SQLite** : Base de données locale pour le mode offline
- **expo-sqlite** : Wrapper SQLite pour Expo

### Scanner
- **expo-barcode-scanner** : Scanner de codes-barres (développement/test)
- **Chainway SDK** : SDK natif pour scanner RFID UHF (production)

### Autres
- **xlsx** : Génération de fichiers Excel
- **@supabase/supabase-js** : Client Supabase

---

## 📁 STRUCTURE DU PROJET

```
BFS/
├── app/                          # Écrans (Expo Router)
│   ├── _layout.tsx              # Layout principal
│   ├── index.tsx                # Écran d'accueil/welcome
│   ├── (auth)/                  # Authentification
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/                  # Navigation par onglets
│   │   ├── _layout.tsx
│   │   └── index.tsx            # Dashboard principal
│   ├── checkin/
│   │   └── index.tsx            # Écran Check-in
│   ├── baggage/
│   │   └── index.tsx            # Écran Check Bagages
│   ├── checkout/
│   │   └── index.tsx            # Écran Check-out
│   ├── arrival/
│   │   └── index.tsx            # Écran Arrivée
│   └── supervisor/
│       ├── dashboard.tsx        # Dashboard superviseur
│       └── passenger-details.tsx # Détails passager
│
├── components/                   # Composants réutilisables
│   ├── ui/                      # Composants UI
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── airport-picker-modal.tsx
│   │   └── role-picker-modal.tsx
│   ├── themed-text.tsx
│   └── themed-view.tsx
│
├── services/                     # Services métier
│   ├── auth.service.ts          # Authentification
│   ├── database.service.ts      # SQLite
│   ├── sync.service.ts          # Synchronisation Supabase
│   ├── parser.service.ts        # Parsing boarding pass
│   ├── scanner.service.ts       # Scanner RFID
│   └── export.service.ts        # Export Excel
│
├── types/                        # Types TypeScript
│   ├── user.types.ts
│   ├── passenger.types.ts
│   ├── baggage.types.ts
│   └── boarding.types.ts
│
├── database/                     # Schémas de base de données
│   ├── schema.ts                # Schéma SQLite
│   ├── supabase-schema.sql      # Schéma Supabase
│   └── reset-database.sql       # Script de reset
│
├── constants/                    # Constantes
│   ├── colors.ts                # Palette de couleurs
│   ├── airports.ts              # Liste des aéroports RDC
│   └── theme.ts
│
├── utils/                        # Utilitaires
│
├── hooks/                        # React Hooks personnalisés
│
├── package.json                  # Dépendances
├── app.json                      # Configuration Expo
├── tsconfig.json                 # Configuration TypeScript
└── README_BFS.md                 # Documentation de base
```

---

## 🔧 SPÉCIFICATIONS TECHNIQUES DÉTAILLÉES

### 1. Authentification

**Inscription** :
- Les agents s'inscrivent eux-mêmes
- Champs requis :
  - Nom complet
  - Email (unique)
  - Mot de passe
  - Aéroport assigné (sélection depuis liste RDC)
  - Rôle (un seul rôle par agent)
- Création du compte dans Supabase Auth
- Création du profil dans la table `users`

**Connexion** :
- Email + mot de passe
- Vérification du rôle et redirection appropriée
- Stockage de la session localement

**Rôles** :
- `checkin` : Check-in uniquement
- `baggage` : Gestion des bagages uniquement
- `boarding` : Check-out uniquement
- `arrival` : Arrivée uniquement
- `supervisor` : Supervision (lecture seule)

### 2. Parsing des Boarding Passes

**Format Supporté** : PDF417 (standard IATA)

**Compagnies Supportées** :
- **Air Congo** : Format spécifique avec règles particulières
- **Ethiopian Airlines** : À implémenter
- **Générique IATA BCBP** : Format standard

**Règles de Parsing Air Congo** :

1. **PNR (Passenger Name Record)** :
   - Format : 6 caractères alphanumériques
   - Exemple : `GPRJDV`, `YFMKNE`
   - Position : Variable selon le format
   - **Important** : Ne pas prendre les 2 premiers caractères si ce sont des préfixes

2. **Nom du Passager** :
   - Format : Commence souvent par `M1` suivi du nom
   - **Règle** : Ignorer le préfixe `M1`, prendre directement le nom
   - Exemple : `M1KATEBA` → `KATEBA`

3. **Numéro de Ticket** :
   - Format : Commence à la position 21, finit à la position 70
   - **Règle** : Ne pas inclure le code compagnie au début
   - Exemple : Si le code compagnie est `9U`, ne pas l'inclure dans le numéro de ticket

4. **Bagages** :
   - Format : Numéro de base + suffixe indiquant le nombre
   - Exemple : `4071161863002` signifie 2 bagages
   - Bagage 1 : `4071161863`
   - Bagage 2 : `4071161864`
   - Le nombre de bagages = les 2 derniers chiffres

5. **Heure du Vol** :
   - Format : HHMM (ex: `1430` pour 14h30)
   - À convertir en format lisible (14:30)

**Structure de Données Extraites** :

```typescript
interface PassengerData {
  pnr: string;                    // PNR unique
  fullName: string;               // Nom complet
  firstName: string;              // Prénom
  lastName: string;               // Nom de famille
  flightNumber: string;           // Numéro de vol
  flightTime?: string;            // Heure du vol (HH:MM)
  route: string;                  // Format: "FIH-JNB"
  departure: string;              // Code aéroport départ (ex: "FIH")
  arrival: string;                // Code aéroport arrivée (ex: "JNB")
  seatNumber?: string;            // Numéro de siège
  ticketNumber?: string;          // Numéro de ticket
  companyCode?: string;           // Code compagnie (ex: "9U")
  airline?: string;               // Nom compagnie
  baggageInfo?: {
    count: number;                // Nombre de bagages
    baseNumber?: string;          // Numéro de base
    expectedTags?: string[];      // Tags RFID attendus
  };
  rawData: string;                // Données brutes du scan
  format: string;                 // Format détecté (ex: "AIR_CONGO")
}
```

### 3. Mode Offline-First

**Principe** :
- Toutes les opérations sont d'abord enregistrées localement (SQLite)
- Chaque opération est ajoutée à la file de synchronisation
- La synchronisation se fait en arrière-plan quand la connexion est disponible

**File de Synchronisation** (`sync_queue`) :
```typescript
{
  id: string;
  table_name: 'passengers' | 'baggages' | 'boarding_status';
  record_id: string;
  operation: 'insert' | 'update' | 'delete';
  data: object;              // Données JSON
  retry_count: number;      // Nombre de tentatives
  last_error?: string;       // Dernière erreur
  user_id: string;
  created_at: string;
}
```

**Processus de Synchronisation** :
1. Vérifier la connexion internet (`syncService.checkConnection()`)
2. Récupérer les éléments non synchronisés de `sync_queue`
3. Pour chaque élément :
   - Envoyer à Supabase selon l'opération
   - En cas de succès : marquer comme synchronisé et supprimer de la queue
   - En cas d'erreur : incrémenter `retry_count`, enregistrer l'erreur
   - Si `retry_count > 5` : alerter l'utilisateur
4. Répéter périodiquement (toutes les 30 secondes quand en ligne)

### 4. Gestion des Rôles et Permissions

**Filtrage par Aéroport** :
- Chaque agent a un `airport_code` assigné
- Les requêtes SQLite filtrent automatiquement par aéroport
- Les politiques RLS dans Supabase font de même

**Accès par Rôle** :
- Chaque écran vérifie le rôle de l'utilisateur
- Redirection automatique si accès non autorisé
- Les superviseurs voient tous les passagers de leur aéroport

**Exemple de Filtrage** :
```typescript
// Dans database.service.ts
async getPassengersByAirport(airportCode: string) {
  // Récupère uniquement les passagers dont le départ OU l'arrivée = airportCode
  return db.getAll(`
    SELECT * FROM passengers 
    WHERE departure = ? OR arrival = ?
  `, [airportCode, airportCode]);
}
```

---

## 🗄️ BASE DE DONNÉES

### Schéma SQLite (Local)

#### Table `passengers`
```sql
CREATE TABLE passengers (
  id TEXT PRIMARY KEY,
  pnr TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  flight_number TEXT NOT NULL,
  flight_time TEXT,
  airline TEXT,
  airline_code TEXT,
  departure TEXT NOT NULL,
  arrival TEXT NOT NULL,
  route TEXT NOT NULL,
  company_code TEXT,
  ticket_number TEXT,
  seat_number TEXT,
  cabin_class TEXT,
  baggage_count INTEGER DEFAULT 0,
  baggage_base_number TEXT,
  raw_data TEXT,
  format TEXT,
  checked_in_at TEXT NOT NULL,
  checked_in_by TEXT NOT NULL,
  synced INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### Table `baggages`
```sql
CREATE TABLE baggages (
  id TEXT PRIMARY KEY,
  passenger_id TEXT NOT NULL,
  rfid_tag TEXT UNIQUE NOT NULL,
  expected_tag TEXT,
  status TEXT NOT NULL DEFAULT 'checked',
  checked_at TEXT,
  checked_by TEXT,
  arrived_at TEXT,
  arrived_by TEXT,
  synced INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (passenger_id) REFERENCES passengers(id)
);
```

#### Table `boarding_status`
```sql
CREATE TABLE boarding_status (
  id TEXT PRIMARY KEY,
  passenger_id TEXT UNIQUE NOT NULL,
  boarded INTEGER DEFAULT 0,
  boarded_at TEXT,
  boarded_by TEXT,
  synced INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (passenger_id) REFERENCES passengers(id)
);
```

#### Table `sync_queue`
```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  data TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

### Schéma Supabase (Cloud)

Les tables Supabase sont similaires mais utilisent :
- `UUID` au lieu de `TEXT` pour les IDs
- `TIMESTAMP WITH TIME ZONE` au lieu de `TEXT` pour les dates
- `BOOLEAN` au lieu de `INTEGER` pour les booléens
- Relations avec `REFERENCES` et `ON DELETE CASCADE`

**Row Level Security (RLS)** :
- Toutes les tables ont RLS activé
- Les politiques filtrent par `airport_code` de l'utilisateur
- Les superviseurs ont accès en lecture seule
- Les agents ne peuvent modifier que leurs propres enregistrements

---

## 📝 PARSING DES BOARDING PASSES

### Format PDF417

Le format PDF417 est un code-barres 2D standard utilisé par l'industrie aéronautique.

### Structure Générale IATA BCBP

```
Position 1-2   : Format du document
Position 3-5   : Code compagnie aérienne
Position 6-10  : Nom du passager
Position 11-13 : Numéro de vol
...
```

### Implémentation du Parser

**Fichier** : `services/parser.service.ts`

**Méthode Principale** :
```typescript
parse(rawData: string): PassengerData {
  const format = this.detectFormat(rawData);
  
  if (format === 'AIR_CONGO') {
    return this.parseAirCongo(rawData);
  }
  
  return this.parseGeneric(rawData);
}
```

**Détection du Format** :
- Analyse des premiers caractères
- Recherche de patterns spécifiques
- Exemple : Air Congo commence souvent par certains codes

**Parsing Air Congo** :
- Extraction du PNR (6 caractères, position variable)
- Extraction du nom (ignorer préfixe `M1`)
- Extraction du numéro de ticket (position 21-70, sans code compagnie)
- Calcul du nombre de bagages depuis le suffixe
- Génération des tags RFID attendus

**Ajout d'une Nouvelle Compagnie** :
1. Ajouter la détection dans `detectFormat()`
2. Créer la méthode `parseXXX()` avec les règles spécifiques
3. Tester avec des exemples réels de boarding passes

---

## 🔄 MODE OFFLINE-FIRST

### Architecture

```
┌─────────────────┐
│  User Action    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SQLite (Local) │  ← Enregistrement immédiat
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  sync_queue     │  ← Ajout à la file
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sync Service   │  ← Vérification connexion
└────────┬────────┘
         │
    ┌────┴────┐
    │        │
    ▼        ▼
┌──────┐ ┌──────────┐
│Online│ │ Offline  │
└──┬───┘ └────┬─────┘
   │          │
   ▼          │
┌─────────┐   │
│Supabase │   │
└─────────┘   │
              │
              ▼
         ┌─────────┐
         │ Attente │
         └─────────┘
```

### Implémentation

**Service de Synchronisation** : `services/sync.service.ts`

**Méthodes Principales** :
- `checkConnection()` : Vérifie la connexion internet
- `syncAll()` : Synchronise tous les éléments en attente
- `syncPassenger()` : Synchronise un passager spécifique
- `syncBaggage()` : Synchronise un bagage spécifique
- `syncBoardingStatus()` : Synchronise un statut d'embarquement

**Déclenchement** :
- Au démarrage de l'application
- Après chaque opération (en arrière-plan)
- Périodiquement (toutes les 30 secondes)
- Quand la connexion est rétablie (écouteur d'événements réseau)

**Gestion des Erreurs** :
- Retry automatique (jusqu'à 5 tentatives)
- Enregistrement des erreurs dans `last_error`
- Notification à l'utilisateur si échec répété
- Conservation des données locales même en cas d'échec

---

## 🔐 GESTION DES RÔLES ET PERMISSIONS

### Rôles Disponibles

1. **checkin** : Enregistrement des passagers
2. **baggage** : Gestion des bagages RFID
3. **boarding** : Validation de l'embarquement
4. **arrival** : Validation des bagages arrivés
5. **supervisor** : Consultation et export (lecture seule)

### Contrôle d'Accès

**Au Niveau de l'Application** :
- Vérification du rôle dans chaque écran
- Redirection si accès non autorisé
- Masquage des boutons selon le rôle

**Au Niveau de la Base de Données** :
- Filtrage par `airport_code` dans toutes les requêtes
- Les agents ne voient que les passagers de leur aéroport
- Les superviseurs voient tous les passagers de leur aéroport

**Au Niveau Supabase (RLS)** :
- Politiques RLS sur toutes les tables
- Filtrage automatique par `airport_code`
- Les superviseurs ont accès en lecture seule
- Les agents peuvent créer/modifier leurs propres enregistrements

---

## 📡 INTÉGRATION SCANNER RFID

### Développement/Test

**expo-barcode-scanner** :
- Utilisé pour scanner les codes-barres PDF417
- Fonctionne sur smartphones avec caméra
- Permet de tester le parsing sans PDA

**Limitations** :
- Ne scanne pas les tags RFID UHF
- Utilisé uniquement pour le développement

### Production

**Chainway C66 PDA** :
- Scanner RFID UHF intégré
- SDK natif Android requis
- Nécessite un build Expo Dev Client

**Intégration** :
1. Créer un build de développement avec `eas build`
2. Installer le SDK Chainway natif
3. Créer un module natif pour interagir avec le SDK
4. Utiliser `scanner.service.ts` pour abstraire l'utilisation

**Fichier** : `services/scanner.service.ts`

**Méthodes** :
- `initScanner()` : Initialise le scanner
- `startScanning()` : Démarre le scan RFID
- `stopScanning()` : Arrête le scan
- `onTagScanned(callback)` : Callback quand un tag est scanné

---

## ⚙️ CONFIGURATION ET INSTALLATION

### Prérequis

- Node.js 18+
- npm ou yarn
- Compte Expo
- Compte Supabase
- Expo CLI : `npm install -g expo-cli`

### Installation

1. **Cloner le projet** :
```bash
git clone <repository-url>
cd BFS
```

2. **Installer les dépendances** :
```bash
npm install
```

3. **Configurer les variables d'environnement** :
Créer un fichier `.env` à la racine :
```env
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
```

4. **Configurer Supabase** :
- Créer un projet Supabase
- Exécuter le script `database/supabase-schema.sql` dans le SQL Editor
- Configurer les politiques RLS
- Activer l'authentification par email

5. **Démarrer l'application** :
```bash
npm start
```

### Build pour Production

**Pour PDA Chainway** :
```bash
eas build --profile development --platform android
```

**Pour App Store / Play Store** :
```bash
eas build --profile production --platform all
```

---

## 📋 ÉTAPES DE DÉVELOPPEMENT RESTANTES

### Priorité Haute

1. **Finaliser la Synchronisation Supabase**
   - [ ] Implémenter complètement `sync.service.ts`
   - [ ] Tester la synchronisation bidirectionnelle
   - [ ] Gérer les conflits de données
   - [ ] Implémenter la récupération des données depuis Supabase

2. **Intégration Chainway SDK**
   - [ ] Créer le module natif pour Chainway C66
   - [ ] Implémenter `scanner.service.ts` avec le SDK réel
   - [ ] Tester sur PDA physique
   - [ ] Gérer les erreurs de scan

3. **Améliorer le Parser**
   - [ ] Ajouter le support Ethiopian Airlines
   - [ ] Améliorer la détection de format
   - [ ] Gérer les cas limites
   - [ ] Ajouter des tests unitaires

4. **Politiques RLS Supabase**
   - [ ] Créer toutes les politiques RLS
   - [ ] Tester l'accès par rôle et aéroport
   - [ ] Sécuriser les endpoints

### Priorité Moyenne

5. **Export Excel**
   - [ ] Finaliser `export.service.ts`
   - [ ] Implémenter tous les filtres
   - [ ] Tester la génération de fichiers
   - [ ] Optimiser pour grandes quantités de données

6. **Gestion des Erreurs**
   - [ ] Ajouter un système de logging
   - [ ] Notifications d'erreur à l'utilisateur
   - [ ] Gestion des erreurs réseau
   - [ ] Retry automatique amélioré

7. **Tests**
   - [ ] Tests unitaires pour les services
   - [ ] Tests d'intégration
   - [ ] Tests E2E pour les flux principaux

### Priorité Basse

8. **Optimisations**
   - [ ] Optimiser les requêtes SQLite
   - [ ] Pagination pour les listes
   - [ ] Cache des données fréquentes
   - [ ] Compression des données synchronisées

9. **UI/UX**
   - [ ] Améliorer les animations
   - [ ] Ajouter des indicateurs de chargement
   - [ ] Améliorer les messages d'erreur
   - [ ] Accessibilité

10. **Documentation**
    - [ ] Documentation API
    - [ ] Guide d'utilisation pour les agents
    - [ ] Guide de déploiement
    - [ ] Troubleshooting

---

## ⚠️ POINTS D'ATTENTION

### Sécurité

1. **Données Sensibles** :
   - Ne jamais stocker de mots de passe en clair
   - Utiliser Supabase Auth pour l'authentification
   - Chiffrer les données sensibles si nécessaire

2. **RLS Supabase** :
   - Vérifier que toutes les tables ont RLS activé
   - Tester que les agents ne voient que leurs données
   - Vérifier que les superviseurs ont accès en lecture seule

3. **Validation des Données** :
   - Valider toutes les entrées utilisateur
   - Sanitizer les données avant insertion
   - Vérifier les permissions avant chaque opération

### Performance

1. **Base de Données Locale** :
   - Indexer les colonnes fréquemment recherchées
   - Limiter la taille de la base de données
   - Nettoyer les anciennes données si nécessaire

2. **Synchronisation** :
   - Limiter le nombre de tentatives de synchronisation
   - Grouper les opérations si possible
   - Éviter les synchronisations simultanées

3. **Scanner** :
   - Désactiver le scanner quand non utilisé
   - Gérer les scans multiples (debounce)
   - Optimiser le parsing des données

### Compatibilité

1. **Formats de Boarding Pass** :
   - Le parser doit être extensible
   - Gérer les formats inconnus gracieusement
   - Logger les formats non reconnus pour amélioration

2. **Versions d'Android** :
   - Tester sur différentes versions Android
   - Gérer les différences d'API
   - Vérifier la compatibilité avec Chainway SDK

3. **Connexion Internet** :
   - L'application doit fonctionner sans internet
   - Gérer les reconnexions automatiques
   - Informer l'utilisateur du statut de connexion

---

## 📞 CONTACTS ET RESSOURCES

### Documentation

- **Expo** : https://docs.expo.dev/
- **Supabase** : https://supabase.com/docs
- **React Native** : https://reactnative.dev/docs/getting-started
- **Chainway SDK** : Documentation fournie par Chainway

### Fichiers Importants

- `README_BFS.md` : Documentation de base
- `SUPABASE_SETUP.md` : Guide de configuration Supabase
- `database/supabase-schema.sql` : Schéma complet Supabase
- `database/schema.ts` : Schéma SQLite
- `services/parser.service.ts` : Logique de parsing

---

## ✅ CHECKLIST DE DÉMARRAGE POUR LE DÉVELOPPEUR

- [ ] Lire cette documentation complète
- [ ] Installer les dépendances
- [ ] Configurer Supabase (projet, tables, RLS)
- [ ] Configurer les variables d'environnement
- [ ] Tester l'authentification
- [ ] Tester le parsing d'un boarding pass
- [ ] Tester la synchronisation
- [ ] Comprendre la structure du code
- [ ] Identifier les tâches à compléter
- [ ] Créer un plan de développement

---

**Dernière mise à jour** : [Date actuelle]
**Version** : 1.0.0
**Auteur** : Équipe BFS

