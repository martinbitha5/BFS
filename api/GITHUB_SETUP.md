# 🚀 Configuration GitHub pour Hostinger

Ce guide vous explique comment configurer le dépôt GitHub pour le déploiement automatique sur Hostinger.

## 📋 Étapes de configuration

### 1. Push initial vers GitHub

Exécutez le script de push :

```bash
cd api
./push-to-github.sh
```

Ou manuellement :

```bash
cd api
git add .
git commit -m "Initial commit: BFS API"
git push -u origin main
```

### 2. Authentification GitHub

Si vous êtes demandé de vous authentifier, vous avez deux options :

#### Option A : Token GitHub (Recommandé)

1. Créez un token sur : https://github.com/settings/tokens
2. Sélectionnez les permissions : `repo` (accès complet aux dépôts)
3. Utilisez le token comme mot de passe lors du push

#### Option B : SSH Key

1. Générez une clé SSH : `ssh-keygen -t ed25519 -C "votre_email@example.com"`
2. Ajoutez la clé publique sur GitHub : https://github.com/settings/keys
3. Configurez Git pour utiliser SSH : `git remote set-url origin git@github.com:martinbitha5/api.git`

### 3. Configuration Hostinger

Sur votre serveur Hostinger, clonez le dépôt :

```bash
cd ~
git clone https://github.com/martinbitha5/api.git
cd api
```

### 4. Configuration des variables d'environnement

Créez le fichier `.env` sur Hostinger :

```bash
nano .env
```

Ajoutez vos variables :

```env
PORT=3000
NODE_ENV=production
SUPABASE_URL=votre_url
SUPABASE_SERVICE_KEY=votre_key
ALLOWED_ORIGINS=https://api.brsats.com,https://dashboard.brsats.com
API_KEY=votre_api_key
JWT_SECRET=votre_jwt_secret
```

### 5. Installation et démarrage

```bash
npm install
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
```

### 6. Déploiement automatique (Optionnel)

Pour activer le déploiement automatique à chaque push :

1. Configurez un webhook GitHub vers votre serveur Hostinger
2. Ou utilisez GitHub Actions (voir `.github/workflows/deploy.yml`)

## 🔄 Mise à jour du code

Pour mettre à jour le code sur Hostinger après un push :

```bash
# Sur Hostinger
cd ~/api
git pull origin main
npm install
npm run build
pm2 restart bfs-api
```

## 📁 Structure du dépôt

```
api/
├── src/                    # Code source TypeScript
├── dist/                   # Code compilé (généré, ignoré par git)
├── scripts/                # Scripts utilitaires
├── .github/                # GitHub Actions workflows
├── .gitignore             # Fichiers ignorés par Git
├── package.json           # Dépendances Node.js
├── tsconfig.json          # Configuration TypeScript
├── ecosystem.config.js    # Configuration PM2
└── README.md             # Documentation
```

## ⚠️ Fichiers exclus de Git

Les fichiers suivants sont exclus (voir `.gitignore`) :
- `node_modules/` - Dépendances (installées via npm)
- `dist/` - Code compilé (généré via npm run build)
- `.env` - Variables d'environnement (sécurité)
- `*.log` - Fichiers de logs

## 🔐 Sécurité

⚠️ **Important** : Ne jamais commiter :
- Fichiers `.env` avec des vraies clés
- Tokens d'accès
- Mots de passe
- Clés privées

Utilisez `.env.example` pour documenter les variables nécessaires.

