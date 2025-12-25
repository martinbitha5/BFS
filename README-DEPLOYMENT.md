# Guide de Configuration - Hostinger Cloud Pro

## Configuration de Base

### Variables d'Environnement Requises

#### API Backend (`api/.env`)

```env
PORT=3000
NODE_ENV=production

# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_cle_anon
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role

# CORS - Remplacez par vos domaines Hostinger
ALLOWED_ORIGINS=https://api.votredomaine.com,https://dashboard.votredomaine.com

# Sécurité
API_KEY=votre_cle_api_secrete
```

#### Dashboard Frontend (`dashboard/.env`)

```env
# URL de l'API Backend sur Hostinger
VITE_API_URL=https://api.votredomaine.com

# Clé API (optionnel)
VITE_API_KEY=votre_cle_api_secrete
```

## Étapes de Déploiement

1. **Configurer le serveur Hostinger**
   - Installer Node.js 18+
   - Installer PM2 : `npm install -g pm2`

2. **Déployer l'API**
   ```bash
   cd api
   npm install
   npm run build
   pm2 start ecosystem.config.js --env production
   ```

3. **Configurer Nginx** (voir `DEPLOYMENT-HOSTINGER.md`)

4. **Configurer SSL** avec Let's Encrypt

5. **Mettre à jour les variables d'environnement** dans les fichiers `.env`

## Important

⚠️ **Remplacez toutes les références à `votredomaine.com` par votre domaine Hostinger réel**

⚠️ **Ne commitez jamais les fichiers `.env` dans Git** - ils contiennent des secrets

