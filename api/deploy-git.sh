#!/bin/bash

# Script de déploiement via Git sur Hostinger
# Usage: ./deploy-git.sh

set -e

echo "🚀 Déploiement via Git..."

# Charger NVM si disponible
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 18 2>/dev/null || true
fi

# Vérifier que Git est installé
if ! command -v git &> /dev/null; then
    echo "📦 Installation de Git..."
    # Sur Hostinger, Git devrait être installé, sinon:
    # wget https://github.com/git/git/archive/refs/heads/main.zip
    echo "❌ Git n'est pas installé. Contactez le support Hostinger."
    exit 1
fi

# Vérifier que le fichier .env existe
if [ ! -f .env ]; then
    echo "📝 Création du fichier .env..."
    cat > .env << 'ENVEOF'
PORT=3000
NODE_ENV=production

SUPABASE_URL=https://ncxnouvkjnqldhhrkjcq.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jeG5vdXZram5xbGRoaHJramNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxOTQzOSwiZXhwIjoyMDgwNTk1NDM5fQ.hMt19SK1KpQjJV92JWPHhv1cvGr2PanGRkguelDylT8

ALLOWED_ORIGINS=https://api.brsats.com,https://dashboard.brsats.com,https://brsats.com,http://localhost:3001,http://localhost:3000

API_KEY=bfs-api-key-secure-2025
ENVEOF
    echo "✅ Fichier .env créé"
fi

echo "📦 Pull des dernières modifications..."
git pull

echo "📦 Installation des dépendances..."
npm install

echo "🔨 Construction du projet..."
npm run build

# Créer le dossier logs si nécessaire
mkdir -p logs

echo "🔄 Redémarrage de l'API avec PM2..."
pm2 delete bfs-api 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

echo "✅ Déploiement terminé !"
pm2 status

