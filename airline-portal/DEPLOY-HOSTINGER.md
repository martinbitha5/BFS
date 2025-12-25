# 🚀 Déploiement du Portail Airline sur Hostinger

## 📋 Prérequis

- Compte Hostinger Cloud Pro
- Domaine configuré : `airline-portal.brsats.com`
- Accès SSH ou FTP/SFTP à votre serveur Hostinger
- Build de production prêt dans `dist/`

## 🔧 Méthode 1 : Déploiement via SSH (Recommandé)

### Étape 1 : Connexion SSH

```bash
ssh -p 65002 u922527895@145.223.86.157
```

### Étape 2 : Créer le répertoire pour le portail

```bash
# Créer le répertoire
mkdir -p ~/airline-portal
cd ~/airline-portal
```

### Étape 3 : Uploader les fichiers depuis votre machine locale

Depuis votre machine locale, dans le dossier `airline-portal/` :

```bash
# Uploader tout le contenu du dossier dist/
scp -P 65002 -r dist/* u922527895@145.223.86.157:~/airline-portal/
```

**OU** si vous avez déjà le projet sur le serveur :

```bash
# Sur le serveur, aller dans le projet
cd ~/BFS/airline-portal
npm run build

# Copier les fichiers vers le répertoire de déploiement
cp -r dist/* ~/airline-portal/
```

### Étape 4 : Configurer Nginx

Créer la configuration Nginx pour `airline-portal.brsats.com` :

```bash
sudo nano /etc/nginx/sites-available/airline-portal.brsats.com
```

Contenu de la configuration :

```nginx
server {
    listen 80;
    server_name airline-portal.brsats.com;

    # Redirection HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name airline-portal.brsats.com;

    # Certificat SSL (ajustez les chemins selon votre configuration)
    ssl_certificate /etc/letsencrypt/live/airline-portal.brsats.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/airline-portal.brsats.com/privkey.pem;

    # Répertoire racine
    root ~/airline-portal;
    index index.html;

    # Logs
    access_log /var/log/nginx/airline-portal-access.log;
    error_log /var/log/nginx/airline-portal-error.log;

    # Configuration pour SPA (Single Page Application)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache pour les assets statiques
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cache pour les images
    location /images/ {
        expires 1y;
        add_header Cache-Control "public";
    }

    # Sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Étape 5 : Activer la configuration Nginx

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/airline-portal.brsats.com /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### Étape 6 : Configurer SSL (si pas déjà fait)

```bash
sudo certbot --nginx -d airline-portal.brsats.com
```

### Étape 7 : Vérifier le déploiement

```bash
# Tester depuis le serveur
curl https://airline-portal.brsats.com

# Vérifier les logs en cas de problème
sudo tail -f /var/log/nginx/airline-portal-error.log
```

## 🔧 Méthode 2 : Déploiement via FTP/SFTP (hPanel)

### Étape 1 : Accéder à hPanel

1. Connectez-vous à votre compte Hostinger
2. Allez dans **File Manager** ou utilisez un client FTP (FileZilla, WinSCP)

### Étape 2 : Naviguer vers le répertoire du domaine

- Chemin typique : `/home/u922527895/domains/airline-portal.brsats.com/public_html`
- Ou : `/home/u922527895/airline-portal`

### Étape 3 : Uploader les fichiers

1. Supprimez tous les fichiers existants dans le répertoire (sauf `.htaccess` si présent)
2. Uploader **tout le contenu** du dossier `dist/` :
   - `index.html`
   - `favicon.svg`
   - Dossier `assets/` (avec tous les fichiers JS et CSS)
   - Dossier `images/` (avec toutes les images)

### Étape 4 : Créer le fichier `.htaccess` (si Apache)

Si votre serveur utilise Apache au lieu de Nginx, créez un fichier `.htaccess` :

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Cache pour les assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>
```

## 🔄 Mise à jour du déploiement

Pour mettre à jour le portail après des modifications :

```bash
# Sur votre machine locale
cd airline-portal
npm run build

# Uploader les nouveaux fichiers
scp -P 65002 -r dist/* u922527895@145.223.86.157:~/airline-portal/

# Ou sur le serveur directement
cd ~/BFS/airline-portal
git pull
npm run build
cp -r dist/* ~/airline-portal/
```

## ✅ Vérification

Après le déploiement, vérifiez :

1. **Accès au site** : `https://airline-portal.brsats.com`
2. **Console du navigateur** : Ouvrez la console (F12) et vérifiez :
   - `[API Config] Final API URL: https://api.brsats.com`
   - Pas d'erreurs CORS
   - Pas d'erreurs 404 pour les assets
3. **Test de connexion** : Essayez de vous connecter ou de vous inscrire

## 🐛 Dépannage

### Erreur 404 sur les routes

- Vérifiez que Nginx est configuré avec `try_files $uri $uri/ /index.html;`
- Vérifiez que le fichier `index.html` est bien présent

### Erreurs CORS

- Vérifiez que `airline-portal.brsats.com` est dans `ALLOWED_ORIGINS` de l'API
- Vérifiez la console du navigateur pour voir quelle URL API est utilisée

### Assets non chargés (404)

- Vérifiez que le dossier `assets/` est bien uploadé
- Vérifiez les permissions des fichiers : `chmod -R 755 ~/airline-portal`

### SSL non configuré

```bash
sudo certbot --nginx -d airline-portal.brsats.com
```

## 📝 Notes importantes

- Le portail est une **Single Page Application (SPA)** React
- Toutes les routes doivent rediriger vers `index.html` pour le routing côté client
- Les fichiers dans `dist/` sont optimisés pour la production (minifiés, hashés)
- Après chaque build, les noms de fichiers dans `assets/` changent (hash), donc il faut toujours uploader tout le dossier `dist/`

