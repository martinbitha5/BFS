# BFS API - Baggage Found Solution API

API backend pour le système de gestion de bagages BFS.

## 🚀 Déploiement sur Hostinger

Ce dépôt est configuré pour le déploiement automatique sur Hostinger via Git.

### Prérequis

- Node.js 18+
- PM2 pour la gestion des processus
- Accès SSH à Hostinger

### Configuration

1. **Variables d'environnement** : Créer un fichier `.env` sur le serveur avec :

```env
PORT=3000
NODE_ENV=production

SUPABASE_URL=votre_url_supabase
SUPABASE_SERVICE_KEY=votre_service_key

ALLOWED_ORIGINS=https://api.brsats.com,https://dashboard.brsats.com,https://brsats.com

API_KEY=votre_api_key
JWT_SECRET=votre_jwt_secret
```

2. **Installation sur Hostinger** :

```bash
# Cloner le dépôt
git clone https://github.com/martinbitha5/api.git
cd api

# Installer les dépendances
npm install

# Configurer PM2
pm2 start ecosystem.config.js --env production
pm2 save
```

### Scripts disponibles

- `npm run dev` : Développement avec hot-reload
- `npm run build` : Compilation TypeScript
- `npm start` : Démarrage en production
- `npm run lint` : Vérification du code

### Structure du projet

```
api/
├── src/              # Code source TypeScript
│   ├── routes/      # Routes API
│   ├── middleware/  # Middlewares Express
│   ├── services/    # Services métier
│   └── config/      # Configuration
├── dist/            # Code compilé (généré)
├── scripts/         # Scripts utilitaires
└── ecosystem.config.js  # Configuration PM2
```

### Déploiement automatique

Hostinger peut être configuré pour faire un `git pull` automatique à chaque push sur la branche `main`.

### Documentation

Voir `DEPLOIEMENT_HOSTINGER.md` pour les instructions détaillées.

