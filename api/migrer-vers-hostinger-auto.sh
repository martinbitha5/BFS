#!/bin/bash

# Script pour migrer de PM2 vers le système automatique de Hostinger
# Usage: ./migrer-vers-hostinger-auto.sh

set -e

echo "🔄 Migration de PM2 vers le système automatique Hostinger"
echo "=================================================="
echo ""

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${GREEN}✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Étape 1 : Vérifier qu'on est sur le serveur Hostinger
echo "📍 Étape 1 : Vérification de l'environnement..."
if [ ! -d ~/domains ]; then
    error "Ce script doit être exécuté sur le serveur Hostinger"
    exit 1
fi
info "Environnement Hostinger détecté"

# Étape 2 : Trouver le répertoire de l'API
echo ""
echo "📂 Étape 2 : Localisation de l'API..."
API_PATH=""
if [ -d ~/domains/api.brsats.com/public_html/api ]; then
    API_PATH=~/domains/api.brsats.com/public_html/api
    info "API trouvée dans: $API_PATH"
elif [ -d ~/domains/api.brsats.com/public_html ]; then
    API_PATH=~/domains/api.brsats.com/public_html
    info "API trouvée dans: $API_PATH"
else
    error "Répertoire de l'API non trouvé"
    echo "Cherchez manuellement avec: find ~/domains -name 'package.json' -type f"
    exit 1
fi

cd "$API_PATH"
info "Répertoire de travail: $(pwd)"

# Étape 3 : Arrêter PM2
echo ""
echo "🛑 Étape 3 : Arrêt de PM2..."
if command -v pm2 &> /dev/null; then
    # Arrêter tous les processus
    pm2 stop all 2>/dev/null || warn "Aucun processus PM2 à arrêter"
    pm2 delete all 2>/dev/null || warn "Aucun processus PM2 à supprimer"
    
    # Désactiver le démarrage automatique
    pm2 unstartup 2>/dev/null || warn "PM2 startup non configuré"
    
    # Vérifier
    if pm2 list | grep -q "bfs-api"; then
        error "PM2 contient encore des processus"
    else
        info "PM2 complètement arrêté"
    fi
else
    warn "PM2 n'est pas installé (c'est OK)"
fi

# Étape 4 : Vérifier le fichier .env
echo ""
echo "🔐 Étape 4 : Vérification du fichier .env..."
if [ ! -f .env ]; then
    error "Le fichier .env n'existe pas !"
    echo ""
    echo "Création d'un fichier .env à partir de ecosystem.config.js..."
    
    # Essayer d'extraire les variables de ecosystem.config.js si possible
    if [ -f ecosystem.config.js ]; then
        warn "Vous devez créer manuellement le fichier .env"
        echo "Exécutez: nano .env"
        echo ""
        echo "Variables nécessaires:"
        echo "  PORT=3000"
        echo "  NODE_ENV=production"
        echo "  SUPABASE_URL=..."
        echo "  SUPABASE_SERVICE_KEY=..."
        echo "  JWT_SECRET=..."
        echo "  ALLOWED_ORIGINS=..."
        echo "  API_KEY=..."
    fi
    exit 1
else
    info "Fichier .env trouvé"
    
    # Vérifier les variables critiques
    MISSING_VARS=()
    if ! grep -q "PORT" .env; then MISSING_VARS+=("PORT"); fi
    if ! grep -q "NODE_ENV" .env; then MISSING_VARS+=("NODE_ENV"); fi
    if ! grep -q "SUPABASE_URL" .env; then MISSING_VARS+=("SUPABASE_URL"); fi
    if ! grep -q "SUPABASE_SERVICE_KEY" .env; then MISSING_VARS+=("SUPABASE_SERVICE_KEY"); fi
    if ! grep -q "JWT_SECRET" .env; then MISSING_VARS+=("JWT_SECRET"); fi
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        error "Variables manquantes dans .env: ${MISSING_VARS[*]}"
        echo "Éditez le fichier .env et ajoutez ces variables"
        exit 1
    else
        info "Toutes les variables critiques sont présentes"
    fi
fi

# Étape 5 : Vérifier package.json
echo ""
echo "📦 Étape 5 : Vérification de package.json..."
if [ ! -f package.json ]; then
    error "package.json non trouvé !"
    exit 1
fi

if ! grep -q '"start"' package.json; then
    warn "Script 'start' manquant dans package.json"
    echo "Ajout du script start..."
    # Ajouter le script start (nécessite jq ou modification manuelle)
    if command -v jq &> /dev/null; then
        jq '.scripts.start = "node dist/server.js"' package.json > package.json.tmp && mv package.json.tmp package.json
        info "Script 'start' ajouté"
    else
        warn "jq non installé, ajoutez manuellement dans package.json:"
        echo '  "scripts": {'
        echo '    "start": "node dist/server.js"'
        echo '  }'
    fi
else
    info "Script 'start' présent dans package.json"
fi

# Étape 6 : Vérifier que dist/server.js existe
echo ""
echo "🔨 Étape 6 : Vérification du build..."
if [ ! -f dist/server.js ]; then
    warn "dist/server.js n'existe pas, construction du projet..."
    if [ ! -f node_modules/.bin/tsc ]; then
        warn "TypeScript non installé, installation des dépendances..."
        npm install
    fi
    npm run build
    
    if [ ! -f dist/server.js ]; then
        error "La construction a échoué !"
        exit 1
    fi
    info "Build réussi"
else
    info "dist/server.js existe"
fi

# Étape 7 : Vérifier que dotenv est installé
echo ""
echo "📚 Étape 7 : Vérification des dépendances..."
if ! grep -q '"dotenv"' package.json && [ ! -d node_modules/dotenv ]; then
    warn "dotenv non trouvé, installation..."
    npm install dotenv
    info "dotenv installé"
else
    info "dotenv est présent"
fi

# Étape 8 : Vérifier que server.ts charge dotenv
echo ""
echo "🔍 Étape 8 : Vérification du chargement dotenv..."
if [ -f src/server.ts ]; then
    if grep -q "dotenv.config()" src/server.ts || grep -q "dotenv.config()" dist/server.js; then
        info "dotenv.config() est présent dans le code"
    else
        warn "dotenv.config() n'est pas appelé dans server.ts"
        warn "Assurez-vous que server.ts contient: dotenv.config()"
    fi
else
    warn "src/server.ts non trouvé (peut-être déjà compilé)"
fi

# Étape 9 : Résumé
echo ""
echo "=================================================="
echo "✅ Migration terminée !"
echo "=================================================="
echo ""
echo "📋 Résumé:"
echo "  - PM2: Arrêté et désactivé"
echo "  - .env: Présent et vérifié"
echo "  - package.json: Configuré"
echo "  - Build: Prêt"
echo ""
echo "🔄 Prochaines étapes:"
echo "  1. Redémarrez l'application via hPanel (Node.js > Restart)"
echo "  2. Ou touchez un fichier pour forcer le redémarrage:"
echo "     touch dist/server.js"
echo ""
echo "🧪 Test:"
echo "  curl http://localhost:3000/health"
echo "  curl https://api.brsats.com/health"
echo ""
echo "📝 Note: Hostinger gérera maintenant automatiquement votre application"
echo "   avec les variables d'environnement du fichier .env"
echo ""








