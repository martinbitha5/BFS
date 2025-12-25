# 🚀 Déploiement API sur Hostinger Cloud Pro

## 📋 Prérequis

- Compte Hostinger Cloud Pro actif
- Accès SSH ou via hPanel
- Node.js 18+ installé sur le serveur
- Base de données PostgreSQL configurée (Supabase ou serveur dédié)

## 🔧 Configuration du serveur

### 1. Connexion SSH

```bash
ssh votre-utilisateur@votre-serveur-hostinger.com
```

### 2. Installation des dépendances système

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier l'installation
node --version
npm --version

# Installer PM2 pour la gestion des processus
sudo npm install -g pm2
```

### 3. Préparation du répertoire

```bash
# Créer le répertoire pour l'API
mkdir -p ~/apps/bfs-api
cd ~/apps/bfs-api

# Cloner le repository ou uploader les fichiers
# Option 1: Via Git
git clone votre-repo-url .
cd api

# Option 2: Via FTP/SFTP
# Uploader le dossier api/ vers ~/apps/bfs-api/
```

## 📦 Installation des dépendances

```bash
cd ~/apps/bfs-api/api
npm install
npm run build
```

## 🔐 Configuration des variables d'environnement

Créer le fichier `.env` :

```bash
nano ~/apps/bfs-api/api/.env
```

Contenu du fichier `.env` :

```env
# Port du serveur (Hostinger Cloud Pro utilise généralement le port 3000 ou un port personnalisé)
PORT=3000

# Environnement
NODE_ENV=production

# Base de données Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-clé-anon
SUPABASE_SERVICE_ROLE_KEY=votre-clé-service-role

# JWT Secret (générer une clé sécurisée)
JWT_SECRET=votre-secret-jwt-super-securise-changez-moi

# API Key (optionnel, pour authentification API)
API_KEY=votre-api-key-securisee

# CORS - Domaines autorisés (ajuster selon vos besoins)
ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com,https://tracking.votre-domaine.com,https://airlines.votre-domaine.com,https://dashboard.votre-domaine.com
```

**Important** : Remplacez toutes les valeurs par vos vraies valeurs de configuration.

## 🚀 Démarrage avec PM2

### Configuration PM2

Créer le fichier `ecosystem.config.js` :

```bash
nano ~/apps/bfs-api/api/ecosystem.config.js
```

Contenu :

```javascript
module.exports = {
  apps: [{
    name: 'bfs-api',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M',
    watch: false
  }]
};
```

Créer le dossier de logs :

```bash
mkdir -p ~/apps/bfs-api/api/logs
```

### Démarrer l'application

```bash
cd ~/apps/bfs-api/api
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🌐 Configuration Nginx (si nécessaire)

Si vous utilisez Nginx comme reverse proxy, créer la configuration :

```bash
sudo nano /etc/nginx/sites-available/bfs-api
```

Configuration Nginx :

```nginx
server {
    listen 80;
    server_name api.votre-domaine.com;

    # Redirection HTTPS (si SSL configuré)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activer le site :

```bash
sudo ln -s /etc/nginx/sites-available/bfs-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Configuration SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.votre-domaine.com
```

## ✅ Vérification

### Test de santé

```bash
curl http://localhost:3000/health
# ou
curl https://api.votre-domaine.com/health
```

Réponse attendue :
```json
{"status":"ok","timestamp":"2025-12-23T..."}
```

### Vérifier PM2

```bash
pm2 status
pm2 logs bfs-api
```

## 🔄 Commandes utiles PM2

```bash
# Voir les logs
pm2 logs bfs-api

# Redémarrer
pm2 restart bfs-api

# Arrêter
pm2 stop bfs-api

# Voir les métriques
pm2 monit

# Mettre à jour l'application
cd ~/apps/bfs-api/api
git pull  # ou uploader les nouveaux fichiers
npm install
npm run build
pm2 restart bfs-api
```

## 📊 Monitoring

### Vérifier les ressources

```bash
pm2 monit
htop
```

### Logs

```bash
# Logs PM2
pm2 logs bfs-api --lines 100

# Logs système
journalctl -u nginx -f
```

## 🐛 Dépannage

### L'API ne démarre pas

1. Vérifier les logs : `pm2 logs bfs-api`
2. Vérifier les variables d'environnement : `cat .env`
3. Vérifier la connexion à la base de données
4. Vérifier que le port n'est pas déjà utilisé : `sudo netstat -tulpn | grep 3000`

### Erreur de connexion à la base de données

1. Vérifier les credentials Supabase dans `.env`
2. Vérifier que l'IP du serveur est autorisée dans Supabase
3. Tester la connexion : `psql -h votre-hote -U votre-user -d votre-db`

### CORS errors

1. Vérifier `ALLOWED_ORIGINS` dans `.env`
2. Vérifier la configuration CORS dans `server.ts`

## 📝 Notes importantes

- **Sécurité** : Changez tous les secrets par défaut
- **Backup** : Configurez des sauvegardes régulières de la base de données
- **Monitoring** : Configurez des alertes pour les erreurs critiques
- **Updates** : Mettez à jour régulièrement les dépendances npm

## 🔗 URLs de production

Une fois déployé, votre API sera accessible à :

```
https://api.votre-domaine.com
```

Endpoints principaux :
- Health check : `GET /health`
- API publique : `GET /api/v1/public/*`
- API authentifiée : `POST /api/v1/*` (nécessite API key)

---

**Date de création** : 2025-12-23  
**Version** : 1.0.0  
**Environnement** : Production Hostinger Cloud Pro

