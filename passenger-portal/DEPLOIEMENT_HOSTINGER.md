# 🚀 Guide de Déploiement Hostinger - BFS Passenger Portal

## 📦 Fichiers prêts pour le déploiement

Le dossier `dist/` contient tous les fichiers buildés et optimisés :
```
dist/
├── .htaccess           ✅ Configuration Apache (routing SPA)
├── index.html          ✅ Page principale
├── manifest.json       ✅ PWA manifest
├── sw.js              ✅ Service Worker
├── _redirects         ✅ Redirections Netlify (bonus)
├── assets/
│   ├── index--RSBFDgo.css  ✅ Styles (17 KB)
│   └── index-7HjNAMNH.js   ✅ JavaScript (271 KB)
└── images/
    └── airport-bg.jpg      ✅ Background (525 KB)
```

**Taille totale : ~814 KB (optimisé)**

---

## 📋 Prérequis

1. ✅ Compte Hostinger actif
2. ✅ Domaine configuré (ou sous-domaine)
3. ✅ Accès File Manager ou FTP

---

## 🔧 Méthode 1 : File Manager Hostinger (Recommandé)

### Étape 1 : Se connecter à Hostinger
1. Connexion → https://hpanel.hostinger.com
2. Allez dans **File Manager**
3. Naviguez vers `public_html/` (ou le dossier de votre domaine)

### Étape 2 : Nettoyer le dossier
```bash
# Supprimer les fichiers par défaut Hostinger
- index.html (si existant)
- default.php
- .htaccess (ancien)
```

### Étape 3 : Upload des fichiers
1. Cliquez sur **Upload**
2. Sélectionnez **TOUS** les fichiers du dossier `dist/`
3. Ou uploadez le fichier `bfs-passenger-portal.zip` et extrayez-le

**Fichiers à uploader :**
```
✅ .htaccess
✅ index.html
✅ manifest.json
✅ sw.js
✅ _redirects
✅ assets/ (dossier complet)
✅ images/ (dossier complet)
```

### Étape 4 : Vérifier les permissions
```bash
Fichiers : 644
Dossiers : 755
```

### Étape 5 : Tester
```
https://votre-domaine.com
```

---

## 🔧 Méthode 2 : FTP (FileZilla)

### Configuration FTP
```
Host: ftp.votre-domaine.com
Username: u123456789
Password: votre-mot-de-passe
Port: 21
```

### Upload
1. Connectez-vous via FileZilla
2. Allez dans `public_html/`
3. Glissez-déposez **TOUT** le contenu de `dist/`
4. Attendez la fin du transfert

---

## 🌐 Configuration du domaine

### Option A : Domaine principal
```
public_html/
└── [tous les fichiers dist/]
```
**URL** : `https://votre-domaine.com`

### Option B : Sous-domaine
```
public_html/
└── tracking/
    └── [tous les fichiers dist/]
```
**URL** : `https://tracking.votre-domaine.com`

Créer le sous-domaine dans hPanel → **Domains** → **Subdomains**

---

## ⚙️ Configuration .htaccess (déjà inclus)

Le fichier `.htaccess` est automatiquement inclus et configure :
- ✅ Routing React (SPA)
- ✅ Compression GZIP
- ✅ Cache navigateur
- ✅ Headers sécurité
- ✅ (Optionnel) Force HTTPS

Pour activer HTTPS :
```apache
# Décommenter ces lignes dans .htaccess
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## 🔐 SSL/HTTPS

### Activer SSL gratuit
1. hPanel → **SSL**
2. Choisir **Let's Encrypt Free SSL**
3. Activer pour votre domaine
4. Attendre 10-15 minutes

### Forcer HTTPS
- Décommenter les lignes HTTPS dans `.htaccess`

---

## 🚀 Variables d'environnement

### API URL configurée
```javascript
// .env.production (déjà dans le build)
VITE_API_URL=https://bfs-api-d2l3.onrender.com
```

**✅ L'API est déjà configurée et fonctionnelle !**

---

## ✅ Vérifications post-déploiement

### 1. Page principale
```
✅ https://votre-domaine.com
   → Doit afficher le formulaire de tracking
```

### 2. Navigation
```
✅ https://votre-domaine.com/about
✅ https://votre-domaine.com/faq
✅ https://votre-domaine.com/support
   → Toutes les pages doivent charger (pas de 404)
```

### 3. Images
```
✅ Background aéroport visible
✅ Pas d'erreurs console (F12)
```

### 4. API
```
✅ Tester avec un PNR
✅ Vérifier que les données s'affichent
```

### 5. Multi-langue
```
✅ Cliquer FR | EN dans le header
✅ Vérifier que le texte change
```

### 6. PWA
```
✅ Mobile : "Installer l'application"
✅ manifest.json chargé
✅ Service Worker enregistré
```

---

## 🐛 Résolution de problèmes

### Problème 1 : 404 sur les pages
**Cause** : `.htaccess` pas uploadé ou mal configuré  
**Solution** :
1. Vérifier que `.htaccess` existe dans public_html/
2. Vérifier `mod_rewrite` activé (contact Hostinger support)

### Problème 2 : Images ne chargent pas
**Cause** : Dossier `images/` manquant  
**Solution** :
1. Vérifier `public_html/images/airport-bg.jpg`
2. Permissions : 644

### Problème 3 : CSS pas appliqué
**Cause** : Dossier `assets/` manquant  
**Solution** :
1. Vérifier `public_html/assets/`
2. Upload complet du dossier

### Problème 4 : API ne répond pas
**Cause** : CORS ou API down  
**Solution** :
1. Vérifier https://bfs-api-d2l3.onrender.com/health
2. Attendre réveil API Render (si en mode gratuit)

### Problème 5 : Service Worker erreur
**Cause** : HTTP au lieu de HTTPS  
**Solution** :
1. Activer SSL
2. Forcer HTTPS dans .htaccess

---

## 📊 Performance

### Tailles optimisées
```
HTML:       1.2 KB  (0.6 KB gzipped)
CSS:       17.4 KB  (4.0 KB gzipped)
JS:       271.1 KB (82.6 KB gzipped)
Image:    525.0 KB
Total:    ~815 KB
```

### Scores attendus
- **Lighthouse Performance** : 90+
- **First Contentful Paint** : < 1.5s
- **Time to Interactive** : < 3s
- **PWA Score** : 100

---

## 🎯 Checklist finale

Avant de considérer le déploiement terminé :

```
✅ Upload complet dist/ vers public_html/
✅ .htaccess présent et actif
✅ Page d'accueil accessible
✅ Navigation fonctionne (pas de 404)
✅ Images affichées
✅ Styles appliqués
✅ API répond (test avec PNR)
✅ Multi-langue fonctionne
✅ SSL activé (HTTPS)
✅ PWA installable
✅ Responsive mobile OK
✅ Console sans erreurs
```

---

## 📞 Support

### Support Hostinger
- Chat : https://www.hostinger.com/support
- Email : support@hostinger.com
- Docs : https://support.hostinger.com

### Problèmes API
- Vérifier status : https://bfs-api-d2l3.onrender.com/health
- Render Dashboard : https://dashboard.render.com

---

## 🚀 DÉPLOIEMENT PRÊT !

**Tout est optimisé et prêt pour Hostinger !**

1. Uploadez le contenu de `dist/` vers `public_html/`
2. Activez SSL
3. Testez l'application
4. C'est en ligne ! 🎉

---

**Date de build** : $(date)  
**Version** : 1.0.0  
**Environnement** : Production  
**API** : https://bfs-api-d2l3.onrender.com
