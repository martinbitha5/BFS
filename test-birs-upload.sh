#!/bin/bash

# ========================================
# Script de test : Upload BIRS
# ========================================

API_URL="https://api.brsats.com"
# API_URL="http://localhost:3000"  # Décommenter pour test local

echo "=========================================="
echo "TEST UPLOAD BIRS"
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
# ÉTAPE 1: Login airline
# ========================================
echo "${BLUE}ÉTAPE 1: Connexion airline${NC}"
read -p "Email airline: " AIRLINE_EMAIL
read -sp "Mot de passe: " AIRLINE_PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/v1/airlines/login" \
  -H "Content-Type: application/json" \
  -H "x-api-key: bfs-api-key-secure-2025" \
  -d "{
    \"email\": \"${AIRLINE_EMAIL}\",
    \"password\": \"${AIRLINE_PASSWORD}\"
  }")

LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)
LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -n 1)

if [ "$LOGIN_CODE" != "200" ]; then
    echo "${RED}❌ Échec de connexion (HTTP $LOGIN_CODE)${NC}"
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
# ÉTAPE 2: Créer un fichier BIRS de test
# ========================================
echo "${BLUE}ÉTAPE 2: Création fichier BIRS de test${NC}"

# Créer un fichier CSV simple
TEST_FILE="/tmp/test_birs_$(date +%s).csv"
cat > "$TEST_FILE" << 'EOF'
Bag ID,Passenger Name,PNR,Seat,Class,Weight,Route
TAG001,JOHN DOE,ABC123,12A,Y,23,FIH-KIN
TAG002,JANE SMITH,DEF456,15B,Y,20,FIH-KIN
TAG003,BOB MARTIN,GHI789,18C,Y,25,FIH-KIN
EOF

echo "Fichier créé: $TEST_FILE"
# Encoder le contenu en base64 pour éviter les problèmes avec les newlines dans JSON
FILE_CONTENT=$(cat "$TEST_FILE" | base64 -w 0)
FILE_NAME=$(basename "$TEST_FILE")
echo ""

# ========================================
# ÉTAPE 3: Informations du vol
# ========================================
echo "${BLUE}ÉTAPE 3: Informations du vol${NC}"
read -p "Numéro de vol (ex: 9U123): " FLIGHT_NUMBER
read -p "Date du vol (YYYY-MM-DD): " FLIGHT_DATE
read -p "Origine (ex: FIH): " ORIGIN
read -p "Destination (ex: KIN): " DESTINATION
read -p "Code aéroport (ex: FIH): " AIRPORT_CODE
echo ""

# ========================================
# ÉTAPE 4: Upload du fichier
# ========================================
echo "${BLUE}ÉTAPE 4: Upload BIRS${NC}"
echo "Fichier: $FILE_NAME"
echo "Vol: $FLIGHT_NUMBER ($ORIGIN → $DESTINATION)"
echo "Date: $FLIGHT_DATE"
echo "Aéroport: $AIRPORT_CODE"
echo ""

UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/v1/birs/upload" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-api-key: bfs-api-key-secure-2025" \
  -d "{
    \"fileName\": \"${FILE_NAME}\",
    \"fileContent\": \"${FILE_CONTENT}\",
    \"reportType\": \"birs\",
    \"flightNumber\": \"${FLIGHT_NUMBER}\",
    \"flightDate\": \"${FLIGHT_DATE}\",
    \"origin\": \"${ORIGIN}\",
    \"destination\": \"${DESTINATION}\",
    \"airportCode\": \"${AIRPORT_CODE}\"
  }")

UPLOAD_BODY=$(echo "$UPLOAD_RESPONSE" | head -n -1)
UPLOAD_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n 1)

echo "Réponse HTTP: $UPLOAD_CODE"
echo ""

if [ "$UPLOAD_CODE" = "201" ] || [ "$UPLOAD_CODE" = "200" ]; then
    echo "${GREEN}✅ ✅ ✅ SUCCÈS ✅ ✅ ✅${NC}"
    echo ""
    echo "Détails:"
    echo "$UPLOAD_BODY" | python3 -m json.tool 2>/dev/null || echo "$UPLOAD_BODY"
else
    echo "${RED}❌ ERREUR $UPLOAD_CODE${NC}"
    echo ""
    echo "Réponse complète:"
    echo "$UPLOAD_BODY" | python3 -m json.tool 2>/dev/null || echo "$UPLOAD_BODY"
    echo ""
    
    # Extraire le message d'erreur
    ERROR_MSG=$(echo "$UPLOAD_BODY" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    ERROR_DETAILS=$(echo "$UPLOAD_BODY" | grep -o '"details":"[^"]*' | cut -d'"' -f4)
    
    if [ ! -z "$ERROR_MSG" ]; then
        echo "${YELLOW}Message d'erreur:${NC} $ERROR_MSG"
    fi
    
    if [ ! -z "$ERROR_DETAILS" ]; then
        echo "${YELLOW}Détails:${NC} $ERROR_DETAILS"
    fi
fi

echo ""
echo "=========================================="
echo "FIN DU TEST"
echo "=========================================="

# Nettoyer
rm -f "$TEST_FILE"
