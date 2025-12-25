#!/bin/bash

# Script de réparation automatique de l'API sur Hostinger
# Usage: ./repair-api.sh

set -e

echo "🔧 Réparation de l'API BFS sur Hostinger"
echo "=========================================="
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

# Étape 1: Vérifier PM2
echo "📊 Étape 1: Vérification de PM2..."
if command -v pm2 &> /dev/null; then
    info "PM2 est installé"
    pm2 list
else
    error "PM2 n'est pas installé!"
    echo "Installez PM2 avec: npm install -g pm2"
    exit 1
fi

# Étape 2: Trouver le chemin de l'API
echo ""
echo "🔍 Étape 2: Recherche de l'API..."

API_PATH=""
PM2_INFO=$(pm2 info bfs-api 2>/dev/null || echo "")

if [ ! -z "$PM2_INFO" ]; then
    API_PATH=$(pm2 info bfs-api | grep "script path" | awk '{print $4}' | head -1)
    if [ ! -z "$API_PATH" ]; then
        API_PATH=$(dirname "$API_PATH")
        info "API trouvée via PM2: $API_PATH"
    fi
fi

# Si pas trouvé via PM2, chercher ecosystem.config.js
if [ -z "$API_PATH" ]; then
    ECOSYSTEM=$(find ~ -name "ecosystem.config.js" -type f 2>/dev/null | head -1)
    if [ ! -z "$ECOSYSTEM" ]; then
        API_PATH=$(dirname "$ECOSYSTEM")
        info "API trouvée via ecosystem.config.js: $API_PATH"
    fi
fi

# Si toujours pas trouvé, chercher dans domains
if [ -z "$API_PATH" ]; then
    if [ -d ~/domains/api.brsats.com ]; then
        API_PATH=~/domains/api.brsats.com
        info "API trouvée dans domains: $API_PATH"
    fi
fi

if [ -z "$API_PATH" ]; then
    error "Impossible de trouver l'API automatiquement!"
    echo ""
    echo "Cherchez manuellement avec:"
    echo "  find ~ -name 'ecosystem.config.js' 2>/dev/null"
    echo "  pm2 info bfs-api"
    exit 1
fi

# Aller dans le dossier de l'API
cd "$API_PATH"
info "Dossier de travail: $(pwd)"

# Étape 3: Vérifier les fichiers essentiels
echo ""
echo "📁 Étape 3: Vérification des fichiers..."

if [ ! -f "package.json" ]; then
    error "package.json non trouvé!"
    exit 1
fi
info "package.json trouvé"

if [ ! -f "ecosystem.config.js" ]; then
    error "ecosystem.config.js non trouvé!"
    exit 1
fi
info "ecosystem.config.js trouvé"

# Étape 4: Vérifier dist/server.js
echo ""
echo "🔨 Étape 4: Vérification du build..."

if [ ! -f "dist/server.js" ]; then
    warn "dist/server.js non trouvé, rebuild nécessaire..."
    echo "Exécution de npm run build..."
    npm run build
    
    if [ ! -f "dist/server.js" ]; then
        error "Le build a échoué!"
        exit 1
    fi
    info "Build réussi"
else
    info "dist/server.js existe"
fi

# Étape 5: Vérifier .env
echo ""
echo "🔐 Étape 5: Vérification des variables d'environnement..."

if [ -f ".env" ]; then
    info ".env trouvé"
    MISSING_VARS=()
    
    if ! grep -q "JWT_SECRET" .env; then
        MISSING_VARS+=("JWT_SECRET")
    fi
    if ! grep -q "SUPABASE_URL" .env; then
        MISSING_VARS+=("SUPABASE_URL")
    fi
    if ! grep -q "SUPABASE_SERVICE_KEY" .env; then
        MISSING_VARS+=("SUPABASE_SERVICE_KEY")
    fi
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        warn "Variables manquantes dans .env: ${MISSING_VARS[*]}"
        echo "Assurez-vous qu'elles sont définies dans hPanel → Environment Variables"
    else
        info "Variables essentielles présentes"
    fi
else
    warn ".env non trouvé, vérifiez les variables dans hPanel"
fi

# Étape 6: Redémarrer avec PM2
echo ""
echo "🚀 Étape 6: Redémarrage de l'API..."

# Arrêter si déjà en cours
pm2 delete bfs-api 2>/dev/null || true

# Démarrer
pm2 start ecosystem.config.js --env production
pm2 save

info "API démarrée avec PM2"

# Étape 7: Attendre un peu et vérifier
echo ""
echo "⏳ Attente de 3 secondes..."
sleep 3

# Vérifier le statut
echo ""
echo "📊 Étape 7: Vérification du statut..."

PM2_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="bfs-api") | .pm2_env.status' 2>/dev/null || echo "unknown")

if [ "$PM2_STATUS" = "online" ]; then
    info "✅ API en ligne!"
else
    warn "⚠️  Statut PM2: $PM2_STATUS"
    echo "Vérifiez les logs avec: pm2 logs bfs-api"
fi

# Test de santé
echo ""
echo "🏥 Test de santé..."

HEALTH=$(curl -s http://localhost:3000/health 2>/dev/null || echo "error")

if [[ "$HEALTH" == *"status"* ]] && [[ "$HEALTH" == *"ok"* ]]; then
    info "✅ Health check réussi: $HEALTH"
else
    warn "⚠️  Health check échoué ou API non accessible"
    echo "Réponse: $HEALTH"
    echo "Vérifiez les logs: pm2 logs bfs-api --lines 50"
fi

# Résumé
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📋 RÉSUMÉ"
echo "═══════════════════════════════════════════════════════════"
echo "Dossier API: $API_PATH"
echo "Statut PM2: $PM2_STATUS"
echo ""
echo "Commandes utiles:"
echo "  pm2 logs bfs-api          # Voir les logs"
echo "  pm2 restart bfs-api       # Redémarrer"
echo "  pm2 status                # Voir le statut"
echo "  curl http://localhost:3000/health  # Tester localement"
echo "  curl https://api.brsats.com/health  # Tester depuis l'extérieur"
echo "═══════════════════════════════════════════════════════════"

