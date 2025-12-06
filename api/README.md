# BFS API - Baggage Flight System API

API REST pour le système de gestion des bagages aéroportuaires.

## 🚀 Installation

```bash
cd api
npm install
```

## ⚙️ Configuration

1. Copiez le fichier `.env.example` vers `.env`:
```bash
cp .env.example .env
```

2. Configurez vos variables d'environnement dans `.env`:
```env
PORT=3000
SUPABASE_URL=votre_url_supabase
SUPABASE_ANON_KEY=votre_cle_anon
SUPABASE_SERVICE_KEY=votre_cle_service
CORS_ORIGIN=http://localhost:3001
```

## 🏃 Démarrage

### Mode développement
```bash
npm run dev
```

### Mode production
```bash
npm run build
npm start
```

## 📚 Endpoints API

### Health Check
- `GET /health` - Vérifier le statut de l'API

### Bagages
- `GET /api/v1/baggage` - Liste tous les bagages
  - Query params: `airport`, `status`, `flight`, `tag`
- `GET /api/v1/baggage/:tagNumber` - Détails d'un bagage
- `GET /api/v1/baggage/track/:tagNumber` - Suivi public d'un bagage

### Passagers
- `GET /api/v1/passengers` - Liste tous les passagers
  - Query params: `airport`, `flight`, `pnr`
- `GET /api/v1/passengers/:id` - Détails d'un passager
- `GET /api/v1/passengers/pnr/:pnr` - Recherche par PNR

### Statistiques
- `GET /api/v1/stats/airport/:code` - Stats d'un aéroport
- `GET /api/v1/stats/global` - Stats globales

### Vols
- `GET /api/v1/flights` - Liste des vols
  - Query params: `airport`
- `GET /api/v1/flights/:flightNumber` - Détails d'un vol

## 📖 Exemples d'utilisation

### Suivre un bagage (endpoint public)
```bash
curl http://localhost:3000/api/v1/baggage/track/BAG123456
```

### Obtenir les statistiques d'un aéroport
```bash
curl http://localhost:3000/api/v1/stats/airport/YUL
```

### Lister les passagers d'un vol
```bash
curl http://localhost:3000/api/v1/passengers?flight=AC123
```

## 🔒 Sécurité

L'API peut être sécurisée avec une clé API en configurant `API_KEY` dans le `.env`.
Les requêtes doivent alors inclure l'en-tête `x-api-key` ou le paramètre `api_key`.

## 📦 Structure

```
api/
├── src/
│   ├── config/         # Configuration (database)
│   ├── middleware/     # Middleware Express
│   ├── routes/         # Routes API
│   └── server.ts       # Point d'entrée
├── .env.example        # Variables d'environnement exemple
├── package.json
└── tsconfig.json
```
