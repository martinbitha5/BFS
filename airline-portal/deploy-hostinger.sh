#!/bin/bash

# Script de déploiement du Portail Airline sur Hostinger
# Usage: ./deploy-hostinger.sh

set -e

echo "🚀 Déploiement du Portail Airline sur Hostinger"
echo "================================================"

# Configuration
SSH_USER="u922527895"
SSH_HOST="145.223.86.157"
SSH_PORT="65002"
REMOTE_DIR="~/airline-portal"
LOCAL_DIST_DIR="dist"

# Vérifier que le build existe
if [ ! -d "$LOCAL_DIST_DIR" ]; then
    echo "❌ Erreur: Le dossier $LOCAL_DIST_DIR n'existe pas."
    echo "   Exécutez d'abord: npm run build"
    exit 1
fi

# Vérifier que les fichiers essentiels existent
if [ ! -f "$LOCAL_DIST_DIR/index.html" ]; then
    echo "❌ Erreur: index.html n'existe pas dans $LOCAL_DIST_DIR"
    echo "   Le build semble incomplet. Exécutez: npm run build"
    exit 1
fi

echo "✅ Build trouvé dans $LOCAL_DIST_DIR"
echo ""

# Demander confirmation
read -p "Voulez-vous uploader les fichiers vers Hostinger? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Déploiement annulé"
    exit 1
fi

echo ""
echo "📤 Upload des fichiers vers Hostinger..."
echo "   Serveur: $SSH_USER@$SSH_HOST:$SSH_PORT"
echo "   Destination: $REMOTE_DIR"
echo ""

# Uploader les fichiers
scp -P $SSH_PORT -r $LOCAL_DIST_DIR/* $SSH_USER@$SSH_HOST:$REMOTE_DIR/

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Déploiement réussi!"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "   1. Vérifiez que Nginx est configuré pour airline-portal.brsats.com"
    echo "   2. Testez l'accès: https://airline-portal.brsats.com"
    echo "   3. Vérifiez la console du navigateur pour confirmer l'URL API"
    echo ""
    echo "🔍 Pour vérifier les logs Nginx:"
    echo "   ssh -p $SSH_PORT $SSH_USER@$SSH_HOST"
    echo "   sudo tail -f /var/log/nginx/airline-portal-error.log"
else
    echo ""
    echo "❌ Erreur lors de l'upload"
    exit 1
fi

