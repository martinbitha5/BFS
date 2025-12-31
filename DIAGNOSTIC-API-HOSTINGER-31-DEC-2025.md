# 🔧 Diagnostic API - Erreur 503 Service Indisponible

**Date**: 31 Décembre 2025  
**Statut**: API ne démarre pas correctement sur Hostinger  
**Erreur**: 503 Service non disponible sur https://api.brsats.com

---

## 📋 Résumé du Problème

L'API BFS ne répond pas sur le domaine de production. Le serveur retourne une erreur 503, indiquant que le service n'est pas disponible ou que PM2 n'a pas démarré correctement.

---

## 🔍 Checklist de Diagnostic pour Hostinger

### Étape 1: Vérifier l'état de PM2

```bash
# Connectez-vous en SSH
ssh -p 65002 u922527895@145.223.86.157

# Vérifier tous les processus PM2
pm2 list

# Vérifier l'état spécifique de bfs-api
pm2 info bfs-api

# Voir les logs d'erreur
pm2 logs bfs-api --err --lines 100
```

**Résultats attendus:**
- `pm2 list` doit montrer `bfs-api` avec le statut `online`
- `pm2 info bfs-api` doit montrer le chemin du script et le statut
- Les logs ne doivent pas contenir d'erreurs critiques

---

### Étape 2: Localiser le répertoire de l'API

```bash
# Trouver le chemin exact via PM2
pm2 describe bfs-api | grep "script path"

# Ou chercher les fichiers
find ~/domains -name "ecosystem.config.js" -type f 2>/dev/null
find ~ -name "package.json" -path "*/api/*" -type f 2>/dev/null
```

**Chemins possibles:**
- `~/domains/api.brsats.com/public_html/api/`
- `~/BFS/api/`
- Autre chemin personnalisé

---

### Étape 3: Vérifier les fichiers essentiels

Une fois le chemin trouvé, vérifiez:

```bash
cd /chemin/vers/api  # Remplacez par le chemin trouvé

# Vérifier que dist/server.js existe
ls -la dist/server.js

# Si dist/ n'existe pas, il faut rebuild
npm run build

# Vérifier ecosystem.config.js
ls -la ecosystem.config.js

# Vérifier .env
ls -la .env
cat .env | grep -E "PORT|NODE_ENV|JWT_SECRET|SUPABASE"
```

**Résultats attendus:**
- `dist/server.js` doit exister
- `.env` doit contenir au minimum:
  - `NODE_ENV=production`
  - `PORT=3000`
  - `JWT_SECRET=<valeur>`
  - `SUPABASE_URL=https://ncxnouvkjnqldhhrkjcq.supabase.co`
  - `SUPABASE_SERVICE_KEY=<valeur>`

---

### Étape 4: Vérifier le port 3000

```bash
# Vérifier si le port 3000 est déjà utilisé
netstat -tulpn | grep 3000
# ou
ss -tulpn | grep 3000

# Si un processus l'utilise, noter le PID et vérifier si c'est l'API
ps aux | grep -E "node|pm2" | grep -v grep
```

---

### Étape 5: Redémarrer l'API

```bash
# Si PM2 montre bfs-api mais elle est arrêtée
pm2 restart bfs-api

# Si PM2 ne montre pas bfs-api du tout
cd /chemin/vers/api
npm run build  # Si dist/ n'existe pas
pm2 start ecosystem.config.js --env production
pm2 save

# Vérifier le statut
pm2 status
```

---

### Étape 6: Tester l'API

```bash
# Test local (depuis le serveur Hostinger)
curl http://localhost:3000/health

# Résultat attendu:
# {"status":"ok","timestamp":"2025-12-31T..."}

# Test depuis l'extérieur
curl https://api.brsats.com/health
```

---

## 🛠️ Commandes Rapides de Redémarrage

Si vous trouvez que l'API est arrêtée:

```bash
# Redémarrer simplement
pm2 restart bfs-api

# Ou si ça ne marche pas, supprimer et recréer
cd /chemin/vers/api
pm2 delete bfs-api
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 logs bfs-api --lines 30
```

---

## 🔐 Variables d'Environnement Requises

Le fichier `.env` doit contenir **au minimum**:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<votre_jwt_secret_sécurisé>
SUPABASE_URL=https://ncxnouvkjnqldhhrkjcq.supabase.co
SUPABASE_SERVICE_KEY=<votre_service_key_supabase>
ALLOWED_ORIGINS=https://api.brsats.com,https://dashboard.brsats.com,https://brsats.com
API_KEY=bfs-api-key-secure-2025
```

**⚠️ IMPORTANT**: Si `JWT_SECRET` ou `SUPABASE_SERVICE_KEY` sont manquants, l'API ne démarrera pas correctement.

---

## 📊 Configuration Nginx (Vérification)

Vérifiez que Nginx est configuré pour proxifier vers l'API:

```bash
# Vérifier la configuration Nginx
cat /etc/nginx/sites-enabled/api.brsats.com
# ou
cat /etc/nginx/conf.d/api.brsats.com.conf

# Doit contenir quelque chose comme:
# upstream bfs_api {
#   server localhost:3000;
# }
# server {
#   server_name api.brsats.com;
#   location / {
#     proxy_pass http://bfs_api;
#   }
# }

# Tester la configuration Nginx
nginx -t

# Redémarrer Nginx si nécessaire
systemctl restart nginx
```

---

## 🐛 Dépannage Avancé

### Si l'API démarre mais retourne 503

```bash
# Vérifier les logs détaillés
pm2 logs bfs-api --err --lines 200

# Vérifier que Supabase est accessible
curl https://ncxnouvkjnqldhhrkjcq.supabase.co/rest/v1/

# Vérifier les variables d'environnement chargées
pm2 describe bfs-api | grep -A 20 "env:"
```

### Si PM2 ne trouve pas le fichier dist/server.js

```bash
cd /chemin/vers/api
npm install
npm run build
pm2 restart bfs-api
```

### Si le port 3000 est déjà utilisé

```bash
# Trouver le processus qui utilise le port
lsof -i :3000

# Tuer le processus (remplacez PID par le numéro)
kill -9 <PID>

# Redémarrer l'API
pm2 restart bfs-api
```

---

## ✅ Checklist Finale

- [ ] Connecté en SSH à Hostinger
- [ ] `pm2 list` montre `bfs-api`
- [ ] Chemin de l'API trouvé
- [ ] `dist/server.js` existe
- [ ] `.env` contient toutes les variables requises
- [ ] Port 3000 n'est pas utilisé par un autre processus
- [ ] `pm2 restart bfs-api` exécuté
- [ ] `curl http://localhost:3000/health` retourne `{"status":"ok",...}`
- [ ] `curl https://api.brsats.com/health` retourne `{"status":"ok",...}`
- [ ] `pm2 save` exécuté pour persister la configuration

---

## 📞 Informations de Connexion Hostinger

**Serveur**: 145.223.86.157  
**Port SSH**: 65002  
**Utilisateur**: u922527895  
**Domaine API**: api.brsats.com  
**Port API**: 3000

---

## 📝 Notes

- L'API utilise **PM2** pour la gestion des processus
- Le fichier de configuration est `ecosystem.config.js`
- Les logs sont dans `./logs/pm2-error.log` et `./logs/pm2-out.log`
- La configuration est persistée avec `pm2 save`
- L'API doit être en mode `production` avec `NODE_ENV=production`

---

**Généré le**: 31 Décembre 2025  
**Pour**: Hostinger (accès root)  
**Objectif**: Redémarrer l'API BFS et résoudre l'erreur 503
