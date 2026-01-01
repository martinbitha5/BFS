#!/bin/bash
# Script de déploiement des portails BFS
# Usage: ./deploy-portals.sh

set -e

# Configuration SSH
SSH_HOST="154.56.60.119"
SSH_USER="u922527895"
SSH_PORT="65002"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Déploiement des portails BFS ===${NC}"

# 1. Build des portails
echo -e "${GREEN}[1/4] Build du dashboard...${NC}"
cd dashboard
npm run build
cd ..

echo -e "${GREEN}[2/4] Build du passenger-portal...${NC}"
cd passenger-portal
npm run build
cd ..

echo -e "${GREEN}[3/4] Build du airline-portal...${NC}"
cd airline-portal
npm run build
cd ..

# 2. Upload des fichiers
echo -e "${GREEN}[4/4] Upload vers le serveur...${NC}"

# Dashboard
echo "  → Upload dashboard..."
scp -P $SSH_PORT -r dashboard/dist/* ${SSH_USER}@${SSH_HOST}:~/domains/dashboard.brsats.com/public_html/

# Passenger Portal
echo "  → Upload passenger-portal..."
scp -P $SSH_PORT -r passenger-portal/dist/* ${SSH_USER}@${SSH_HOST}:~/domains/brsats.com/public_html/

# Airline Portal
echo "  → Upload airline-portal..."
scp -P $SSH_PORT -r airline-portal/dist/* ${SSH_USER}@${SSH_HOST}:~/airline-portal/

# 3. Créer .htaccess pour SPA routing (si pas de contrôle nginx)
echo -e "${GREEN}Création des .htaccess pour SPA routing...${NC}"

HTACCESS_CONTENT='# Redirect all requests to index.html for SPA routing
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>'

# Upload .htaccess
ssh -p $SSH_PORT ${SSH_USER}@${SSH_HOST} "echo '$HTACCESS_CONTENT' > ~/domains/dashboard.brsats.com/public_html/.htaccess"
ssh -p $SSH_PORT ${SSH_USER}@${SSH_HOST} "echo '$HTACCESS_CONTENT' > ~/domains/brsats.com/public_html/.htaccess"
ssh -p $SSH_PORT ${SSH_USER}@${SSH_HOST} "echo '$HTACCESS_CONTENT' > ~/airline-portal/.htaccess"

echo -e "${BLUE}=== Déploiement terminé ! ===${NC}"
echo "Dashboard: https://dashboard.brsats.com"
echo "Passenger: https://brsats.com"
echo "Airline:   https://airline-portal.brsats.com"
