# 🔧 Configurer Hostinger pour utiliser automatiquement .env (Sans PM2)

Ce guide vous explique comment arrêter PM2 et laisser Hostinger gérer automatiquement votre application Node.js avec les variables d'environnement du fichier `.env`.

## 📋 Situation actuelle

- ✅ Votre API fonctionne via le système `lsnode` de Hostinger
- ❌ PM2 n'est pas utilisé (liste vide)
- ❌ Les configurations de `ecosystem.config.js` ne sont pas appliquées
- ✅ Vous avez un fichier `.env` avec toutes vos configurations

## 🎯 Objectif

Faire en sorte que Hostinger utilise automatiquement le fichier `.env` pour démarrer votre application, sans passer par PM2.

## 📍 Étape 1 : Localiser votre application

Connectez-vous en SSH et vérifiez où se trouve votre API :

```bash
ssh -p 65002 u922527895@145.223.86.157
cd ~/domains/api.brsats.com/public_html
ls -la
```

Vérifiez la structure :
- Le fichier `.env` doit être dans `public_html/` ou `public_html/api/`
- Le fichier `package.json` doit être présent
- Le fichier `dist/server.js` doit exister (ou `server.js`)

## 🔍 Étape 2 : Vérifier le processus actuel

```bash
# Voir quel processus Node.js tourne
ps aux | grep node

# Voir quel port est utilisé
netstat -tulpn | grep 3000
# ou
ss -tulpn | grep 3000
```

## 🛑 Étape 3 : Arrêter PM2 complètement

```bash
# Arrêter tous les processus PM2
pm2 stop all
pm2 delete all

# Désactiver le démarrage automatique PM2 au boot
pm2 unstartup

# Vérifier que PM2 est vide
pm2 list
```

## 📝 Étape 4 : Vérifier/créer le fichier .env

Assurez-vous que le fichier `.env` est dans le bon répertoire :

```bash
cd ~/domains/api.brsats.com/public_html

# Si l'API est dans un sous-dossier api/
cd api

# Vérifier que .env existe
ls -la .env

# Si .env n'existe pas, le créer avec vos variables
nano .env
```

Contenu du `.env` (exemple avec vos valeurs) :

```env
PORT=3000
NODE_ENV=production

SUPABASE_URL=https://ncxnouvkjnqldhhrkjcq.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jeG5vdXZram5xbGRoaHJramNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxOTQzOSwiZXhwIjoyMDgwNTk1NDM5fQ.hMt19SK1KpQjJV92JWPHhv1cvGr2PanGRkguelDylT8

JWT_SECRET=votre_jwt_secret_ici

ALLOWED_ORIGINS=https://api.brsats.com,https://dashboard.brsats.com,https://brsats.com

API_KEY=bfs-api-key-secure-2025
```

## 📦 Étape 5 : Vérifier le package.json

Le fichier `package.json` doit avoir un script `start` qui charge le `.env` :

```bash
cd ~/domains/api.brsats.com/public_html/api
cat package.json
```

Le script `start` doit être :
```json
{
  "scripts": {
    "start": "node dist/server.js"
  }
}
```

**Important** : Le fichier `server.ts` charge déjà `dotenv.config()` au début, donc le `.env` sera automatiquement chargé.

## 🔄 Étape 6 : Redémarrer l'application via Hostinger

Hostinger détecte automatiquement les applications Node.js. Pour forcer un redémarrage :

### Option A : Via l'interface hPanel
1. Connectez-vous à hPanel
2. Allez dans "Node.js" ou "Applications"
3. Trouvez votre application `api.brsats.com`
4. Cliquez sur "Restart" ou "Reload"

### Option B : Via SSH (si Hostinger le permet)
```bash
# Redémarrer le service lsnode (si accessible)
# Note: Cette commande peut varier selon la configuration Hostinger
```

### Option C : Toucher le fichier pour forcer le redémarrage
```bash
cd ~/domains/api.brsats.com/public_html/api
touch dist/server.js
# ou
touch package.json
```

## ✅ Étape 7 : Vérifier que ça fonctionne

```bash
# Vérifier que le processus tourne
ps aux | grep node

# Tester l'API localement
curl http://localhost:3000/health

# Tester depuis l'extérieur
curl https://api.brsats.com/health

# Vérifier les logs (si disponibles)
# Les logs peuvent être dans :
# - ~/domains/api.brsats.com/logs/
# - Ou via hPanel dans la section Node.js
```

## 🔍 Étape 8 : Vérifier que les variables d'environnement sont chargées

Pour vérifier que le `.env` est bien chargé, vous pouvez temporairement ajouter un log dans `server.ts` :

```typescript
// Dans src/server.ts, après dotenv.config()
console.log('🔑 Variables d\'environnement chargées:');
console.log('   PORT:', process.env.PORT);
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Défini' : '❌ MANQUANT');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Défini' : '❌ MANQUANT');
```

Puis rebuild :
```bash
cd ~/domains/api.brsats.com/public_html/api
npm run build
```

## 🐛 Dépannage

### L'application ne démarre pas

1. **Vérifier les logs** :
   ```bash
   # Chercher les logs Hostinger
   find ~/domains/api.brsats.com -name "*.log" -type f
   ```

2. **Vérifier que dist/server.js existe** :
   ```bash
   cd ~/domains/api.brsats.com/public_html/api
   ls -la dist/server.js
   # Si n'existe pas :
   npm run build
   ```

3. **Vérifier les permissions** :
   ```bash
   chmod +x dist/server.js
   ```

### Les variables d'environnement ne sont pas chargées

1. **Vérifier le chemin du .env** :
   ```bash
   cd ~/domains/api.brsats.com/public_html/api
   pwd
   ls -la .env
   ```

2. **Vérifier que dotenv est installé** :
   ```bash
   npm list dotenv
   # Si pas installé :
   npm install dotenv
   ```

3. **Vérifier que server.ts charge dotenv** :
   ```bash
   head -n 5 src/server.ts
   # Doit contenir : import dotenv from 'dotenv'; et dotenv.config();
   ```

### Le port est déjà utilisé

```bash
# Voir quel processus utilise le port 3000
lsof -i :3000
# ou
netstat -tulpn | grep 3000

# Tuer le processus si nécessaire (remplacer PID par le numéro du processus)
kill -9 PID
```

## 📝 Notes importantes

1. **Hostinger gère automatiquement** : Une fois configuré, Hostinger redémarrera automatiquement votre application en cas de redémarrage du serveur.

2. **Le fichier .env est la source de vérité** : Toutes vos configurations doivent être dans `.env`, pas dans `ecosystem.config.js`.

3. **PM2 n'est plus nécessaire** : Vous pouvez complètement ignorer PM2 maintenant. Hostinger utilise son propre système (`lsnode`).

4. **Mise à jour du code** : Après chaque mise à jour :
   ```bash
   cd ~/domains/api.brsats.com/public_html/api
   git pull  # ou uploader les nouveaux fichiers
   npm install
   npm run build
   # Hostinger redémarrera automatiquement
   ```

## ✅ Checklist finale

- [ ] PM2 arrêté et désactivé (`pm2 list` est vide)
- [ ] Fichier `.env` présent dans `public_html/api/` avec toutes les variables
- [ ] `package.json` a un script `start` correct
- [ ] `dist/server.js` existe et est à jour
- [ ] L'application répond sur `https://api.brsats.com/health`
- [ ] Les variables d'environnement sont chargées (vérifier les logs)

---

**Date de création** : 2025-01-23  
**Environnement** : Hostinger Cloud Pro (sans PM2)





