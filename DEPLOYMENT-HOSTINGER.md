# Guide de Déploiement sur Hostinger Cloud Pro

Ce guide vous explique comment déployer l'API BFS sur Hostinger Cloud Pro.

## Prérequis

- Compte Hostinger Cloud Pro
- Domaine configuré (ex: api.bfs.cd)
- Accès SSH à votre serveur Hostinger
- Node.js installé sur le serveur (version 18+)

## Configuration du Serveur

### 1. Connexion SSH

```bash
ssh root@votre-serveur.hostinger.com
```

### 2. Installation de Node.js (si nécessaire)

```bash
# Installer Node.js via nvm (recommandé)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 3. Installation de PM2 (Gestionnaire de processus)

```bash
npm install -g pm2
```

## Déploiement de l'API

### 1. Cloner le projet

```bash
cd /var/www
git clone https://github.com/votre-repo/BFS.git
cd BFS/api
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
nano .env
```

Remplissez les variables suivantes :

```env
PORT=3000
NODE_ENV=production

SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_cle_anon
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role

ALLOWED_ORIGINS=https://votre-domaine.hostinger.com,https://dashboard.votredomaine.com

API_KEY=votre_cle_api_secrete
```

### 4. Construire le projet (si TypeScript)

```bash
npm run build
```

### 5. Démarrer avec PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 6. Vérifier le statut

```bash
pm2 status
pm2 logs
```

## Configuration Nginx (Reverse Proxy)

### 1. Créer la configuration Nginx

```bash
sudo nano /etc/nginx/sites-available/bfs-api
```

### 2. Configuration Nginx

```nginx
server {
    listen 80;
    server_name api.votredomaine.com;  # Remplacez par votre domaine

    # Redirection HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.votredomaine.com;  # Remplacez par votre domaine

    # Certificat SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.votredomaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.votredomaine.com/privkey.pem;

    # Configuration SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Headers CORS
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, x-api-key, x-airport-code' always;

    # Gérer les requêtes preflight
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, x-api-key, x-airport-code' always;
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }

    # Proxy vers l'API Node.js
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

### 3. Activer la configuration

```bash
sudo ln -s /etc/nginx/sites-available/bfs-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Configuration SSL (Let's Encrypt)

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.votredomaine.com
```

## Configuration du Dashboard Frontend

### 1. Mettre à jour l'URL de l'API

Dans `dashboard/.env` :

```env
VITE_API_URL=https://api.votredomaine.com
VITE_API_KEY=votre_cle_api_secrete
```

### 2. Construire le dashboard

```bash
cd dashboard
npm install
npm run build
```

### 3. Déployer les fichiers build

Les fichiers dans `dashboard/dist` doivent être déployés sur votre serveur web (Nginx, Apache, ou CDN).

## Vérification

### Tester l'API

```bash
curl https://api.votredomaine.com/health
```

Devrait retourner :
```json
{"status":"ok","timestamp":"2025-01-XX..."}
```

### Tester depuis le dashboard

1. Ouvrez le dashboard dans votre navigateur
2. Essayez de vous connecter
3. Vérifiez la console du navigateur pour les erreurs

## Maintenance

### Redémarrer l'API

```bash
pm2 restart bfs-api
```

### Voir les logs

```bash
pm2 logs bfs-api
```

### Mettre à jour le code

```bash
cd /var/www/BFS
git pull
cd api
npm install
npm run build
pm2 restart bfs-api
```

## Support

En cas de problème, vérifiez :
- Les logs PM2 : `pm2 logs`
- Les logs Nginx : `sudo tail -f /var/log/nginx/error.log`
- Le statut du service : `pm2 status`
- La configuration Nginx : `sudo nginx -t`

