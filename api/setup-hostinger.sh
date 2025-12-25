#!/bin/bash

# Script de configuration initiale sur Hostinger Cloud Pro
# À exécuter UNE SEULE FOIS lors de la première installation

set -e

echo "🔧 Configuration initiale Hostinger Cloud Pro..."

# Mettre à jour le système
echo "📦 Mise à jour du système..."
sudo apt update && sudo apt upgrade -y

# Installer Node.js 18+
if ! command -v node &> /dev/null; then
    echo "📦 Installation de Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Vérifier l'installation
echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Installer PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installation de PM2..."
    sudo npm install -g pm2
fi

# Configurer PM2 pour démarrer au boot
echo "⚙️ Configuration PM2 pour démarrage automatique..."
pm2 startup
# Suivre les instructions affichées

echo ""
echo "✅ Configuration terminée !"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Créez le fichier .env dans le dossier api/"
echo "   2. Exécutez: cd api && ./deploy.sh"
echo ""

