#!/bin/bash

# Script pour pousser le code vers GitHub
# Usage: ./push-to-github.sh

set -e

echo "🚀 Préparation du push vers GitHub..."

# Vérifier que Git est initialisé
if [ ! -d .git ]; then
    echo "📦 Initialisation du dépôt Git..."
    git init
    git branch -M main
fi

# Vérifier le remote
if ! git remote | grep -q origin; then
    echo "🔗 Configuration du remote GitHub..."
    git remote add origin https://github.com/martinbitha5/api.git
else
    echo "✅ Remote déjà configuré"
    git remote set-url origin https://github.com/martinbitha5/api.git
fi

# Ajouter tous les fichiers (sauf ceux dans .gitignore)
echo "📝 Ajout des fichiers..."
git add .

# Vérifier s'il y a des changements
if git diff --staged --quiet; then
    echo "ℹ️  Aucun changement à commiter"
else
    echo "💾 Création du commit..."
    git commit -m "Initial commit: BFS API - Baggage Found Solution"
    
    echo "📤 Push vers GitHub..."
    echo "⚠️  Vous devrez peut-être vous authentifier avec GitHub"
    echo ""
    echo "Options d'authentification :"
    echo "1. Token GitHub (recommandé) : https://github.com/settings/tokens"
    echo "2. SSH key : Configurez votre clé SSH sur GitHub"
    echo ""
    read -p "Appuyez sur Entrée pour continuer le push..."
    
    git push -u origin main
    
    echo "✅ Push terminé !"
    echo ""
    echo "🌐 Vérifiez votre dépôt : https://github.com/martinbitha5/api"
fi

