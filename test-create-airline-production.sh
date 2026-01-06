#!/bin/bash

# ========================================
# Script de test : Création de compagnie aérienne en PRODUCTION
# ========================================

API_URL="https://api.brsats.com"
# API_URL="http://localhost:3000"  # Décommenter pour test local

echo "=========================================="
echo "TEST CRÉATION COMPAGNIE AÉRIENNE - PRODUCTION"
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
# ÉTAPE 1: Obtenir le token support
# ========================================
echo "${BLUE}ÉTAPE 1: Authentification support${NC}"
echo "Email: support@brsats.com"
read -sp "Mot de passe support: " SUPPORT_PASSWORD
echo ""

# Login support
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-api-key: bfs-api-key-secure-2025" \
  -d "{
    \"email\": \"support@brsats.com\",
    \"password\": \"${SUPPORT_PASSWORD}\"
  }")

LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)
LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -n 1)

if [ "$LOGIN_CODE" != "200" ]; then
    echo "${RED}❌ Échec de connexion support (HTTP $LOGIN_CODE)${NC}"
    echo "$LOGIN_BODY"
    exit 1
fi

SUPPORT_TOKEN=$(echo "$LOGIN_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$SUPPORT_TOKEN" ]; then
    echo "${RED}❌ Token non trouvé dans la réponse${NC}"
    echo "$LOGIN_BODY"
    exit 1
fi

echo "${GREEN}✅ Authentification réussie${NC}"
echo "Token: ${SUPPORT_TOKEN:0:20}..."
echo ""

# ========================================
# ÉTAPE 2: Créer une compagnie aérienne
# ========================================
echo "${BLUE}ÉTAPE 2: Création de la compagnie${NC}"

AIRLINE_NAME="Test Airline $(date +%H%M%S)"
AIRLINE_CODE="T$(date +%S | tail -c 2)"
AIRLINE_EMAIL="test$(date +%s)@airline.com"
AIRLINE_PASSWORD="TestPass123!"

echo "Nom: $AIRLINE_NAME"
echo "Code IATA: $AIRLINE_CODE"
echo "Email: $AIRLINE_EMAIL"
echo ""

CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/v1/airlines/create-by-support" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPPORT_TOKEN}" \
  -H "x-api-key: bfs-api-key-secure-2025" \
  -d "{
    \"name\": \"${AIRLINE_NAME}\",
    \"code\": \"${AIRLINE_CODE}\",
    \"email\": \"${AIRLINE_EMAIL}\",
    \"password\": \"${AIRLINE_PASSWORD}\"
  }")

CREATE_BODY=$(echo "$CREATE_RESPONSE" | head -n -1)
CREATE_CODE=$(echo "$CREATE_RESPONSE" | tail -n 1)

echo "Réponse HTTP: $CREATE_CODE"
echo ""

if [ "$CREATE_CODE" = "201" ] || [ "$CREATE_CODE" = "200" ]; then
    echo "${GREEN}✅ SUCCÈS: Compagnie créée${NC}"
    echo ""
    echo "Détails:"
    echo "$CREATE_BODY" | python3 -m json.tool 2>/dev/null || echo "$CREATE_BODY"
    echo ""
    
    AIRLINE_ID=$(echo "$CREATE_BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    
else
    echo "${RED}❌ ERREUR $CREATE_CODE: Échec de création${NC}"
    echo "$CREATE_BODY"
    echo ""
    exit 1
fi

# ========================================
# ÉTAPE 3: Vérifier dans Supabase
# ========================================
echo "${BLUE}ÉTAPE 3: Vérification dans Supabase${NC}"
echo ""
echo "Allez dans Supabase et vérifiez:"
echo "  1. Table 'airlines' → Cherchez: $AIRLINE_EMAIL"
echo "  2. Table 'airline_registration_requests' → Cherchez: $AIRLINE_EMAIL"
echo ""
echo "Les deux tables doivent contenir la compagnie."
echo ""
read -p "Appuyez sur Entrée après vérification..."

# ========================================
# ÉTAPE 4: Test de connexion
# ========================================
echo ""
echo "${BLUE}ÉTAPE 4: Test de connexion airline${NC}"
echo "Email: $AIRLINE_EMAIL"
echo "Password: $AIRLINE_PASSWORD"
echo ""

LOGIN_AIRLINE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/v1/airlines/login" \
  -H "Content-Type: application/json" \
  -H "x-api-key: bfs-api-key-secure-2025" \
  -d "{
    \"email\": \"${AIRLINE_EMAIL}\",
    \"password\": \"${AIRLINE_PASSWORD}\"
  }")

LOGIN_AIRLINE_BODY=$(echo "$LOGIN_AIRLINE_RESPONSE" | head -n -1)
LOGIN_AIRLINE_CODE=$(echo "$LOGIN_AIRLINE_RESPONSE" | tail -n 1)

echo "Réponse HTTP: $LOGIN_AIRLINE_CODE"
echo ""

if [ "$LOGIN_AIRLINE_CODE" = "200" ]; then
    echo "${GREEN}✅ ✅ ✅ SUCCÈS COMPLET ✅ ✅ ✅${NC}"
    echo ""
    echo "La compagnie a été créée ET peut se connecter !"
    echo ""
    echo "Détails de connexion:"
    echo "$LOGIN_AIRLINE_BODY" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_AIRLINE_BODY"
    echo ""
    
elif [ "$LOGIN_AIRLINE_CODE" = "401" ]; then
    echo "${RED}❌ ÉCHEC: Identifiants incorrects${NC}"
    echo ""
    echo "${YELLOW}PROBLÈME IDENTIFIÉ:${NC}"
    echo "  → La compagnie a été créée dans 'airline_registration_requests'"
    echo "  → Mais PAS dans la table 'airlines'"
    echo "  → Le code déployé sur Hostinger est l'ANCIEN code"
    echo ""
    echo "Réponse:"
    echo "$LOGIN_AIRLINE_BODY"
    
elif [ "$LOGIN_AIRLINE_CODE" = "403" ]; then
    echo "${RED}❌ ÉCHEC: Compte non approuvé${NC}"
    echo "$LOGIN_AIRLINE_BODY"
    
else
    echo "${RED}❌ ERREUR $LOGIN_AIRLINE_CODE${NC}"
    echo "$LOGIN_AIRLINE_BODY"
fi

echo ""
echo "=========================================="
echo "RÉSUMÉ DU TEST"
echo "=========================================="
echo ""
echo "Compagnie créée:"
echo "  - Nom: $AIRLINE_NAME"
echo "  - Code: $AIRLINE_CODE"
echo "  - Email: $AIRLINE_EMAIL"
echo "  - ID: ${AIRLINE_ID:-N/A}"
echo ""
echo "Résultats:"
echo "  - Création: $([ "$CREATE_CODE" = "201" ] && echo "${GREEN}✅${NC}" || echo "${RED}❌${NC}")"
echo "  - Connexion: $([ "$LOGIN_AIRLINE_CODE" = "200" ] && echo "${GREEN}✅${NC}" || echo "${RED}❌${NC}")"
echo ""

if [ "$LOGIN_AIRLINE_CODE" != "200" ]; then
    echo "${YELLOW}ACTION REQUISE:${NC}"
    echo "  1. Vérifier que le code sur Hostinger est à jour"
    echo "  2. Pusher le nouveau code: git push origin main"
    echo "  3. Attendre le redéploiement automatique"
    echo "  4. Relancer ce test"
fi

echo ""
echo "=========================================="
echo "FIN DU TEST"
echo "=========================================="
