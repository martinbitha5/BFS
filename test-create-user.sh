#!/bin/bash

# ========================================
# Script de test : Création utilisateur Dashboard
# ========================================

API_URL="https://api.brsats.com"
# API_URL="http://localhost:3000"  # Décommenter pour test local

echo "=========================================="
echo "TEST CRÉATION UTILISATEUR DASHBOARD"
echo "API: $API_URL"
echo "=========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ========================================
# ÉTAPE 1: Login support
# ========================================
echo "${BLUE}ÉTAPE 1: Connexion support${NC}"
read -p "Email support: " SUPPORT_EMAIL
read -sp "Mot de passe support: " SUPPORT_PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-api-key: bfs-api-key-secure-2025" \
  -d "{
    \"email\": \"${SUPPORT_EMAIL}\",
    \"password\": \"${SUPPORT_PASSWORD}\"
  }")

LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)
LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -n 1)

if [ "$LOGIN_CODE" != "200" ]; then
    echo "${RED}❌ Échec de connexion support (HTTP $LOGIN_CODE)${NC}"
    echo "$LOGIN_BODY"
    exit 1
fi

TOKEN=$(echo "$LOGIN_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "${RED}❌ Token non trouvé${NC}"
    echo "$LOGIN_BODY"
    exit 1
fi

echo "${GREEN}✅ Connexion réussie${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# ========================================
# ÉTAPE 2: Informations utilisateur
# ========================================
echo "${BLUE}ÉTAPE 2: Informations du nouvel utilisateur${NC}"
read -p "Nom complet: " USER_NAME
read -p "Email: " USER_EMAIL
read -sp "Mot de passe: " USER_PASSWORD
echo ""
read -p "Rôle (supervisor/baggage_dispute): " USER_ROLE
read -p "Code aéroport (ex: FIH, ou ALL pour baggage_dispute): " AIRPORT_CODE
echo ""

# ========================================
# ÉTAPE 3: Créer l'utilisateur
# ========================================
echo "${BLUE}ÉTAPE 3: Création de l'utilisateur${NC}"
echo "Nom: $USER_NAME"
echo "Email: $USER_EMAIL"
echo "Rôle: $USER_ROLE"
echo "Aéroport: $AIRPORT_CODE"
echo ""

CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/v1/users/create-by-support" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-api-key: bfs-api-key-secure-2025" \
  -d "{
    \"full_name\": \"${USER_NAME}\",
    \"email\": \"${USER_EMAIL}\",
    \"password\": \"${USER_PASSWORD}\",
    \"role\": \"${USER_ROLE}\",
    \"airport_code\": \"${AIRPORT_CODE}\"
  }")

CREATE_BODY=$(echo "$CREATE_RESPONSE" | head -n -1)
CREATE_CODE=$(echo "$CREATE_RESPONSE" | tail -n 1)

echo "Réponse HTTP: $CREATE_CODE"
echo ""

if [ "$CREATE_CODE" = "201" ] || [ "$CREATE_CODE" = "200" ]; then
    echo "${GREEN}✅ ✅ ✅ SUCCÈS ✅ ✅ ✅${NC}"
    echo ""
    echo "Détails:"
    echo "$CREATE_BODY" | python3 -m json.tool 2>/dev/null || echo "$CREATE_BODY"
else
    echo "${RED}❌ ERREUR $CREATE_CODE${NC}"
    echo ""
    echo "Réponse complète:"
    echo "$CREATE_BODY" | python3 -m json.tool 2>/dev/null || echo "$CREATE_BODY"
    echo ""
    
    # Extraire le message d'erreur
    ERROR_MSG=$(echo "$CREATE_BODY" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    
    if [ ! -z "$ERROR_MSG" ]; then
        echo "${YELLOW}Message d'erreur:${NC} $ERROR_MSG"
    fi
fi

echo ""
echo "=========================================="
echo "FIN DU TEST"
echo "=========================================="
