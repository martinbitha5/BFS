#!/bin/bash

# Script de déploiement API sur Hostinger Cloud Pro
# Usage: ./deploy.sh

set -e

echo "🚀 Déploiement API BFS sur Hostinger..."

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Exécutez d'abord: ./install-hostinger.sh"
    exit 1
fi

# Charger NVM si disponible
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 18 2>/dev/null || true
fi

# Vérifier que PM2 est installé
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installation de PM2..."
    npm install -g pm2
fi

# Vérifier que le fichier .env existe
if [ ! -f .env ]; then
    echo "⚠️  Le fichier .env n'existe pas."
    echo "📝 Création du fichier .env..."
    cat > .env << 'ENVEOF'
PORT=3000
NODE_ENV=production

SUPABASE_URL=https://ncxnouvkjnqldhhrkjcq.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jeG5vdXZram5xbGRoaHJramNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxOTQzOSwiZXhwIjoyMDgwNTk1NDM5fQ.hMt19SK1KpQjJV92JWPHhv1cvGr2PanGRkguelDylT8

ALLOWED_ORIGINS=https://api.brsats.com,https://dashboard.brsats.com,https://brsats.com,http://localhost:3001,http://localhost:3000

API_KEY=bfs-api-key-secure-2025
ENVEOF
    echo "✅ Fichier .env créé avec les valeurs par défaut"
fi

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

# Configurer PM2 pour démarrer au boot (si pas déjà fait)
pm2 startup | grep -v "PM2" | bash || true

echo "✅ Déploiement terminé !"
echo ""
echo "📊 Statut:"
pm2 status

echo ""
echo "🌐 Testez l'API:"
echo "   curl http://localhost:3000/health"
echo ""
echo "📝 Commandes utiles:"
echo "   pm2 logs bfs-api          # Voir les logs"
echo "   pm2 restart bfs-api       # Redémarrer"
echo "   pm2 stop bfs-api          # Arrêter"
echo ""

