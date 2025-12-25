#!/bin/bash

# Script d'installation complète sur Hostinger Cloud Pro vierge
# À exécuter sur le serveur Hostinger

set -e

echo "🚀 Installation complète API BFS sur Hostinger Cloud Pro"
echo "=========================================================="

# Créer le répertoire de travail
echo "📁 Création du répertoire de travail..."
mkdir -p ~/bfs-api
cd ~/bfs-api

# Mettre à jour le système
echo "📦 Mise à jour du système..."
sudo apt update && sudo apt upgrade -y

# Installer Node.js 18+
echo "📦 Installation de Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js $(node --version) installé"
echo "✅ npm $(npm --version) installé"

# Installer PM2
echo "📦 Installation de PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Installer Git (si nécessaire)
if ! command -v git &> /dev/null; then
    echo "📦 Installation de Git..."
    sudo apt-get install -y git
fi

echo ""
echo "✅ Prérequis installés !"
echo ""
echo "📝 PROCHAINES ÉTAPES:"
echo ""
echo "1. Uploader les fichiers de l'API dans ~/bfs-api/"
echo "   Vous pouvez utiliser:"
echo "   - FTP/SFTP (FileZilla, WinSCP)"
echo "   - SCP depuis votre machine locale:"
echo "     scp -P 65002 -r api/* u922527895@145.223.86.157:~/bfs-api/"
echo ""
echo "2. Une fois les fichiers uploadés, exécutez:"
echo "   cd ~/bfs-api"
echo "   chmod +x deploy.sh"
echo "   ./deploy.sh"
echo ""

