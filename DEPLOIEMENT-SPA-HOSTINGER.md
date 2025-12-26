# Guide de déploiement SPA sur Hostinger

## Problème résolu
Les erreurs 404 lors de l'actualisation des pages (comme `/user-approval`) sont causées par le fait que le serveur ne connaît pas les routes du React Router. Ce guide explique comment configurer le serveur pour rediriger toutes les routes vers `index.html`.

## Fichiers créés

### Pour chaque portail :
| Portail | Fichiers ajoutés |
|---------|------------------|
| Dashboard | `nginx-dashboard.conf`, `.htaccess`, `_redirects`, `netlify.toml` |
| Airline Portal | `.htaccess` (nginx-airline-portal.conf existait déjà) |
| Passenger Portal | `nginx-passenger-portal.conf`, `.htaccess` |

---

## Option 1: Hostinger avec Apache (le plus commun)

Hostinger utilise généralement Apache. Il suffit de s'assurer que le fichier `.htaccess` est présent dans le dossier racine de chaque site.

### Étapes :

1. **Rebuild chaque portail** pour inclure le `.htaccess` dans `dist/` :

```bash
# Dashboard
cd dashboard
npm run build

# Airline Portal
cd ../airline-portal
npm run build

# Passenger Portal
cd ../passenger-portal
npm run build
```

2. **Déployer les fichiers** (le `.htaccess` sera automatiquement inclus depuis `public/`)

3. **Vérifier sur Hostinger** que le fichier `.htaccess` est bien présent :
   - dashboard.brsats.com → doit avoir `.htaccess` à la racine
   - airline-portal.brsats.com → doit avoir `.htaccess` à la racine
   - brsats.com → doit avoir `.htaccess` à la racine

---

## Option 2: Hostinger avec Nginx (VPS)

Si vous avez un VPS Hostinger avec Nginx, copiez les fichiers de configuration :

### Dashboard (dashboard.brsats.com)

```bash
# Sur le serveur Hostinger
sudo nano /etc/nginx/sites-available/dashboard.brsats.com
```

Collez le contenu de `dashboard/nginx-dashboard.conf`, puis :

```bash
# Créer le lien symbolique
sudo ln -sf /etc/nginx/sites-available/dashboard.brsats.com /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### Airline Portal (airline-portal.brsats.com)

```bash
sudo nano /etc/nginx/sites-available/airline-portal.brsats.com
```

Collez le contenu de `airline-portal/nginx-airline-portal.conf`, puis :

```bash
sudo ln -sf /etc/nginx/sites-available/airline-portal.brsats.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Passenger Portal (brsats.com)

```bash
sudo nano /etc/nginx/sites-available/brsats.com
```

Collez le contenu de `passenger-portal/nginx-passenger-portal.conf`, puis :

```bash
sudo ln -sf /etc/nginx/sites-available/brsats.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Option 3: Déploiement rapide via SSH

### Commandes rapides pour copier .htaccess sur le serveur :

```bash
# Connexion SSH à Hostinger
ssh u922527895@srv123.hostinger.com

# Aller dans le dossier du dashboard
cd ~/domains/dashboard.brsats.com/public_html

# Créer/éditer le .htaccess
cat > .htaccess << 'EOF'
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.html [QSA,L]
</IfModule>
EOF

# Répéter pour airline-portal
cd ~/domains/airline-portal.brsats.com/public_html
cat > .htaccess << 'EOF'
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.html [QSA,L]
</IfModule>
EOF

# Répéter pour passenger-portal (brsats.com)
cd ~/domains/brsats.com/public_html
cat > .htaccess << 'EOF'
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.html [QSA,L]
</IfModule>
EOF
```

---

## Vérification

Après déploiement, testez ces URLs en les chargeant directement (pas via navigation) :

- ✅ `https://dashboard.brsats.com/user-approval` → doit charger l'app
- ✅ `https://dashboard.brsats.com/baggages` → doit charger l'app
- ✅ `https://airline-portal.brsats.com/dashboard` → doit charger l'app
- ✅ `https://brsats.com/track` → doit charger l'app

Si vous obtenez toujours une erreur 404, vérifiez :
1. Que le `.htaccess` est bien présent à la racine du site
2. Que le module `mod_rewrite` est activé sur Apache
3. Que le fichier `.htaccess` n'est pas ignoré (certains hébergeurs le bloquent)

---

## Support Hostinger

Si le `.htaccess` ne fonctionne pas, contactez le support Hostinger pour :
1. Activer `mod_rewrite` si ce n'est pas fait
2. Autoriser les fichiers `.htaccess` dans la configuration Apache
3. Ou passer à une configuration Nginx avec `try_files`

