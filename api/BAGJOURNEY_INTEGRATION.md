# Intégration BagJourney SITA

Ce document décrit l'intégration de l'API BagJourney de SITA dans le système BFS (Baggage Found Solution).

## Présentation

BagJourney est une API de SITA qui permet de suivre les bagages en temps réel tout au long de leur voyage. L'intégration permet d'enrichir les données locales avec les informations provenant du système mondial de SITA.

## Configuration

### Variables d'environnement

Ajoutez les variables suivantes dans votre fichier `.env` :

```bash
# Configuration BagJourney SITA (optionnel)
BAGJOURNEY_API_KEY=your_sita_bagjourney_api_key_here
BAGJOURNEY_BASE_URL=https://bagjourney.sita.aero/baggage/history/v1.0
BAGJOURNEY_TIMEOUT=30000
```

### Obtenir une clé API SITA

1. Contactez SITA pour obtenir un compte développeur
2. Demandez l'accès à l'API BagJourney
3. Obtenez votre clé API et configurez-la dans les variables d'environnement

## API Endpoints

### Routes BagJourney

#### 1. Statut d'un bagage
```
GET /api/v1/bagjourney/status/:tagNumber
```

Récupère le statut d'un bagage depuis BagJourney.

**Paramètres :**
- `tagNumber` (path) : Numéro de tag RFID du bagage
- `flightDate` (query, optionnel) : Date du vol (format YYYY-MM-DD)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "tagNumber": "0125243458",
    "flightDate": "2024-01-15",
    "events": [
      {
        "code": "CHECKED_IN",
        "description": "Bag checked in",
        "timestamp": "2024-01-15T08:30:00Z",
        "location": "Check-in Counter",
        "airportCode": "CDG"
      }
    ],
    "currentStatus": {
      "code": "LOADED_ON_AIRCRAFT",
      "description": "Bag loaded on aircraft",
      "location": "Aircraft Hold",
      "timestamp": "2024-01-15T10:15:00Z"
    }
  },
  "timestamp": "2024-01-15T12:00:00Z"
}
```

#### 2. Bagages pour un vol
```
GET /api/v1/bagjourney/flight/:flightNumber/:flightDate
```

Récupère la liste des bagages pour un vol spécifique.

**Paramètres :**
- `flightNumber` (path) : Numéro de vol
- `flightDate` (path) : Date du vol (format YYYY-MM-DD)
- `airport` (query, optionnel) : Code aéroport

#### 3. Bagages par passager
```
GET /api/v1/bagjourney/passenger/:passengerName
```

Récupère les bagages par nom de passager.

**Paramètres :**
- `passengerName` (path) : Nom du passager
- `flightNumber` (query, optionnel) : Numéro de vol
- `flightDate` (query, optionnel) : Date du vol

#### 4. Synchronisation de données
```
POST /api/v1/bagjourney/sync
```

Synchronise les données BagJourney avec le système local.

**Body :**
```json
{
  "tagNumbers": ["0125243458", "0125243459"],
  "options": {
    "enableRealTimeSync": true,
    "syncInterval": 5,
    "batchSize": 10,
    "retryAttempts": 3
  }
}
```

#### 5. Configuration
```
GET /api/v1/bagjourney/config
```

Récupère la configuration BagJourney (sans la clé API).

#### 6. Health Check
```
GET /api/v1/bagjourney/health
```

Vérifie la disponibilité du service BagJourney.

### Routes Baggage enrichies

#### Bagage avec données BagJourney
```
GET /api/v1/baggage/:tagNumber/bagjourney
```

Récupère les données d'un bagage enrichies avec les informations BagJourney.

**Réponse :**
```json
{
  "success": true,
  "data": {
    "local": {
      "id": "baggage_123",
      "tag_number": "0125243458",
      "status": "checked",
      "flight_number": "ET840",
      "passengers": {
        "full_name": "John Doe",
        "pnr": "ABC123"
      }
    },
    "bagjourney": {
      "tagNumber": "0125243458",
      "events": [...],
      "currentStatus": {...}
    },
    "syncStatus": {
      "bagjourneyAvailable": true,
      "lastSync": "2024-01-15T12:00:00Z"
    }
  }
}
```

## Codes d'événements BagJourney

| Code | Description |
|------|-------------|
| CHECKED_IN | Bag checked in |
| PAX_BOARDED | Passenger boarded |
| SCREENED | Bag screened |
| SCREENING_PASSED | Bag screening passed |
| SCREENING_FAILED | Bag screening failed |
| SORTED | Bag sorted |
| LOADED_IN_CONTAINER | Bag loaded into container |
| LOADED_ON_AIRCRAFT | Bag loaded on aircraft |
| OFFLOADED | Bag offloaded |
| EXPECTED | Bag expected |
| REROUTED | Bag rerouted |
| REFLIGHTED | Bag re-flighted |
| CANCELLED | Bag cancelled |
| MISHANDLED | Bag mishandled |
| ONA | Bag on hand not loaded - Authorized to load |
| OND | Bag on hand not loaded - Not authorized to load |
| NAL | Bag loaded - not authorized to load |
| UNS | Bag unseen |

## Utilisation

### 1. Activer l'intégration

Configurez les variables d'environnement dans votre fichier `.env` :

```bash
BAGJOURNEY_API_KEY=your_actual_api_key_here
BAGJOURNEY_BASE_URL=https://bagjourney.sita.aero/baggage/history/v1.0
BAGJOURNEY_TIMEOUT=30000
```

### 2. Tester la connexion

Utilisez le script de test fourni :

```bash
cd api
npm run test:bagjourney
```

### 3. Utiliser dans votre application

Les routes BagJourney sont maintenant disponibles et peuvent être utilisées pour :
- Enrichir les données de suivi des bagages
- Valider les informations de bagages
- Synchroniser les données avec SITA
- Améliorer la traçabilité des bagages

## Sécurité

- La clé API BagJourney est stockée de manière sécurisée dans les variables d'environnement
- Les routes BagJourney nécessitent une authentification via `apiKeyAuth`
- Le service vérifie automatiquement les permissions d'aéroport via `requireAirportCode`

## Support

Pour toute question ou problème avec l'intégration BagJourney :
1. Vérifiez votre configuration dans les variables d'environnement
2. Consultez les logs d'erreur pour identifier les problèmes
3. Contactez SITA pour les problèmes liés à l'API elle-même
4. Contactez l'équipe BFS pour les problèmes d'intégration