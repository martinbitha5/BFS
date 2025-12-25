# 🔧 Réparer l'API sur Hostinger - Guide complet

## 📋 Étape 1 : Connexion SSH

### Depuis votre machine locale (Windows/Mac/Linux)

Ouvrez un terminal et exécutez :

```bash
ssh -p 65002 u922527895@145.223.86.157
```

Entrez votre mot de passe si demandé.

## 🔍 Étape 2 : Vérifier l'état de l'API

Une fois connecté, vérifiez l'état de PM2 :

```bash
# Voir tous les processus PM2
pm2 list

# Voir les détails de l'API
pm2 info bfs-api

# Voir les logs récents
pm2 logs bfs-api --lines 50
```

## 📂 Étape 3 : Trouver où se trouve l'API

```bash
# Option 1: Via PM2 (le plus fiable)
pm2 info bfs-api | grep "script path"

# Option 2: Chercher les fichiers
find ~ -name "ecosystem.config.js" -type f 2>/dev/null
find ~/domains -name "package.json" -type f 2>/dev/null

# Option 3: Vérifier dans api.brsats.com
cd ~/domains/api.brsats.com
ls -la
```

Notez le chemin trouvé (ex: `~/domains/api.brsats.com/` ou `~/BFS/api/`)

## 🔄 Étape 4 : Redémarrer l'API

### Si l'API est déjà dans PM2 mais arrêtée :

```bash
# Redémarrer
pm2 restart bfs-api

# Ou si ça ne marche pas, supprimer et recréer
pm2 delete bfs-api
cd /chemin/vers/api  # Remplacez par le chemin trouvé à l'étape 3
pm2 start ecosystem.config.js --env production
pm2 save
```

### Si l'API n'existe pas dans PM2 :

```bash
# Aller dans le dossier de l'API
cd /chemin/vers/api  # Remplacez par le chemin trouvé

# Vérifier que les fichiers existent
ls -la
ls -la dist/

# Si dist/ n'existe pas, rebuild
npm run build

# Démarrer avec PM2
pm2 start ecosystem.config.js --env production
pm2 save
```

## 🛠️ Étape 5 : Vérifier que tout fonctionne

```bash
# Vérifier le statut
pm2 status

# Voir les logs en temps réel
pm2 logs bfs-api --lines 30

# Tester l'API
curl http://localhost:3000/health
# Devrait retourner: {"status":"ok","timestamp":"..."}

# Tester depuis l'extérieur
curl https://api.brsats.com/health
```

## 🐛 Si ça ne fonctionne toujours pas

### Vérifier les erreurs :

```bash
# Logs détaillés
pm2 logs bfs-api --err --lines 100

# Vérifier les variables d'environnement
cd /chemin/vers/api
cat .env | grep -E "PORT|NODE_ENV|JWT_SECRET|SUPABASE"

# Vérifier que le port n'est pas déjà utilisé
netstat -tulpn | grep 3000
# ou
ss -tulpn | grep 3000
```

### Vérifier les fichiers essentiels :

```bash
cd /chemin/vers/api

# Vérifier que dist/server.js existe
ls -la dist/server.js

# Si non, rebuild
npm run build

# Vérifier ecosystem.config.js
cat ecosystem.config.js
```

## 📝 Commandes rapides de référence

```bash
# Redémarrer l'API
pm2 restart bfs-api

# Arrêter l'API
pm2 stop bfs-api

# Démarrer l'API
pm2 start bfs-api

# Voir les logs
pm2 logs bfs-api

# Voir le statut
pm2 status

# Sauvegarder la configuration PM2
pm2 save
```

## 🔐 Si vous avez oublié le chemin exact

Exécutez ces commandes pour trouver rapidement :

```bash
# Trouver via PM2
pm2 describe bfs-api | grep "script path"

# Trouver via les processus
ps aux | grep "node.*server" | grep -v grep

# Trouver les fichiers ecosystem.config.js
find ~ -name "ecosystem.config.js" 2>/dev/null
```

## ✅ Checklist de vérification

- [ ] Connecté en SSH
- [ ] PM2 list montre bfs-api (ou pas)
- [ ] Trouvé le chemin de l'API
- [ ] dist/server.js existe
- [ ] .env contient les variables nécessaires
- [ ] API redémarrée avec PM2
- [ ] curl http://localhost:3000/health fonctionne
- [ ] curl https://api.brsats.com/health fonctionne

