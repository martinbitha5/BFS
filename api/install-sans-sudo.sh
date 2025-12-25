#!/bin/bash

# Installation sans sudo pour Hostinger Cloud Pro
# Utilise NVM (Node Version Manager) qui ne nécessite pas sudo

set -e

echo "🚀 Installation Node.js et PM2 sans sudo..."

# Installer NVM (Node Version Manager)
echo "📦 Installation de NVM..."
if [ ! -d "$HOME/.nvm" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    
    # Charger NVM dans la session actuelle
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    echo "✅ NVM installé"
else
    echo "✅ NVM déjà installé"
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Installer Node.js 18
echo "📦 Installation de Node.js 18..."
nvm install 18
nvm use 18
nvm alias default 18

echo "✅ Node.js $(node --version) installé"
echo "✅ npm $(npm --version) installé"

# Installer PM2 globalement (sans sudo)
echo "📦 Installation de PM2..."
npm install -g pm2

echo "✅ PM2 installé"

# Ajouter NVM au .bashrc pour les prochaines sessions
if ! grep -q "NVM_DIR" ~/.bashrc; then
    echo '' >> ~/.bashrc
    echo '# NVM' >> ~/.bashrc
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
    echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
    echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.bashrc
fi

echo ""
echo "✅ Installation terminée !"
echo ""
echo "📝 Pour utiliser Node.js dans cette session, exécutez:"
echo "   export NVM_DIR=\"\$HOME/.nvm\""
echo "   [ -s \"\$NVM_DIR/nvm.sh\" ] && \. \"\$NVM_DIR/nvm.sh\""
echo "   nvm use 18"
echo ""
echo "   Ou reconnectez-vous simplement en SSH"
echo ""

