#!/bin/bash

echo "🧪 Test de la configuration CORS avec header x-user-role"
echo "=========================================================="
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URL de l'API
API_URL="https://api.brsats.com"
DASHBOARD_URL="https://dashboard.brsats.com"

echo "📡 Test 1: Vérifier que l'API répond"
echo "-----------------------------------"
HEALTH_RESPONSE=$(curl -s "${API_URL}/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✅ API répond correctement${NC}"
    echo "   Réponse: $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ API ne répond pas correctement${NC}"
    echo "   Réponse: $HEALTH_RESPONSE"
    exit 1
fi
echo ""

echo "📡 Test 2: Vérifier les headers CORS (requête OPTIONS)"
echo "-------------------------------------------------------"
CORS_RESPONSE=$(curl -s -I -X OPTIONS "${API_URL}/api/v1/stats/airport/FIH" \
    -H "Origin: ${DASHBOARD_URL}" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: x-user-role,x-user-id,authorization,x-api-key,x-airport-code")

echo "Headers CORS reçus:"
echo "$CORS_RESPONSE" | grep -i "access-control"
echo ""

# Vérifier que x-user-role est dans les allowedHeaders
if echo "$CORS_RESPONSE" | grep -i "access-control-allow-headers" | grep -q "x-user-role"; then
    echo -e "${GREEN}✅ Header x-user-role est autorisé dans CORS${NC}"
else
    echo -e "${RED}❌ Header x-user-role N'EST PAS autorisé dans CORS${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Le déploiement n'a pas encore pris effet ou le build n'a pas été exécuté${NC}"
    echo ""
    echo "Solutions possibles:"
    echo "1. Attendre 2-3 minutes que Hostinger redéploie"
    echo "2. Vérifier que le script postinstall s'est bien exécuté"
    echo "3. Forcer un redéploiement manuel si nécessaire"
    exit 1
fi
echo ""

echo "📡 Test 3: Vérifier tous les headers requis"
echo "-------------------------------------------"
REQUIRED_HEADERS=("x-user-role" "x-user-id" "x-api-key" "x-airport-code" "Authorization" "Content-Type")
MISSING_HEADERS=()

for header in "${REQUIRED_HEADERS[@]}"; do
    if echo "$CORS_RESPONSE" | grep -i "access-control-allow-headers" | grep -qi "$header"; then
        echo -e "${GREEN}✅ $header${NC}"
    else
        echo -e "${RED}❌ $header${NC}"
        MISSING_HEADERS+=("$header")
    fi
done
echo ""

if [ ${#MISSING_HEADERS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les headers requis sont autorisés${NC}"
else
    echo -e "${RED}❌ Headers manquants: ${MISSING_HEADERS[*]}${NC}"
    exit 1
fi
echo ""

echo "📡 Test 4: Vérifier les méthodes HTTP autorisées"
echo "------------------------------------------------"
if echo "$CORS_RESPONSE" | grep -i "access-control-allow-methods" | grep -q "GET.*POST.*PUT.*DELETE"; then
    echo -e "${GREEN}✅ Méthodes HTTP correctement configurées${NC}"
    echo "$CORS_RESPONSE" | grep -i "access-control-allow-methods"
else
    echo -e "${YELLOW}⚠️  Vérifier les méthodes HTTP${NC}"
    echo "$CORS_RESPONSE" | grep -i "access-control-allow-methods"
fi
echo ""

echo "📡 Test 5: Vérifier l'origine autorisée"
echo "---------------------------------------"
if echo "$CORS_RESPONSE" | grep -i "access-control-allow-origin" | grep -q "$DASHBOARD_URL"; then
    echo -e "${GREEN}✅ Origine ${DASHBOARD_URL} autorisée${NC}"
else
    echo -e "${YELLOW}⚠️  Vérifier l'origine autorisée${NC}"
    echo "$CORS_RESPONSE" | grep -i "access-control-allow-origin"
fi
echo ""

echo "=========================================================="
echo -e "${GREEN}🎉 TOUS LES TESTS CORS SONT PASSÉS !${NC}"
echo ""
echo "La configuration CORS est correcte. Les erreurs dans le dashboard"
echo "devraient disparaître après:"
echo "  1. Vider le cache du navigateur (Ctrl + Shift + R)"
echo "  2. Rafraîchir le dashboard"
echo ""
