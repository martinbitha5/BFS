# Configuration pour Hostinger Cloud Pro

## ⚠️ IMPORTANT : Remplacez les URLs par défaut

Toutes les configurations pointent maintenant vers **Hostinger** au lieu de Render.

## Fichiers à Configurer

### 1. API Backend (`api/.env`)

Créez le fichier `api/.env` avec :

```env
PORT=3000
NODE_ENV=production

# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_cle_anon
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role

# CORS - Remplacez par vos domaines Hostinger réels
ALLOWED_ORIGINS=https://api.votredomaine.com,https://dashboard.votredomaine.com

# Sécurité
API_KEY=votre_cle_api_secrete
```

### 2. Dashboard Frontend (`dashboard/.env`)

Créez le fichier `dashboard/.env` avec :

```env
# URL de l'API Backend sur Hostinger
VITE_API_URL=https://api.votredomaine.com

# Clé API (optionnel)
VITE_API_KEY=votre_cle_api_secrete
```

## Changements Effectués

✅ **`api/src/server.ts`** : Configuration CORS améliorée pour Hostinger
✅ **`dashboard/src/config/api.ts`** : URL par défaut mise à jour
✅ **`api/ecosystem.config.js`** : Configuration PM2 pour production

## Prochaines Étapes

1. **Remplacez `votredomaine.com`** par votre domaine Hostinger réel dans tous les fichiers `.env`
2. **Déployez l'API** sur votre serveur Hostinger (voir `DEPLOYMENT-HOSTINGER.md`)
3. **Configurez Nginx** comme reverse proxy (voir `DEPLOYMENT-HOSTINGER.md`)
4. **Mettez à jour le dashboard** avec la nouvelle URL de l'API

## Test

Après configuration, testez :

```bash
curl https://api.votredomaine.com/health
```

Devrait retourner : `{"status":"ok","timestamp":"..."}`

