#!/bin/bash

# ========================================
# Script de test : Création de compagnie aérienne via Dashboard
# ========================================

API_URL="http://localhost:3000"
# API_URL="https://api.brsats.com"  # Décommenter pour test en production

echo "=========================================="
echo "TEST CRÉATION COMPAGNIE AÉRIENNE"
echo "=========================================="
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ========================================
# IMPORTANT: Vous devez obtenir un token valide d'un utilisateur support
# ========================================
echo "⚠️  IMPORTANT: Ce script nécessite un token d'authentification valide"
echo "   Connectez-vous au dashboard en tant que support et récupérez le token"
echo ""
read -p "Entrez votre token Bearer (ou appuyez sur Entrée pour utiliser un token de test): " USER_TOKEN

if [ -z "$USER_TOKEN" ]; then
    echo "${YELLOW}⚠️  Utilisation d'un token de test (ne fonctionnera probablement pas)${NC}"
    USER_TOKEN="test-token-invalid"
fi

echo ""
echo "=========================================="
echo "TEST 1: Création d'une compagnie aérienne"
echo "=========================================="

# Données de test
AIRLINE_NAME="Turkish Airlines"
AIRLINE_CODE="TK"
AIRLINE_EMAIL="test@avion.com"
AIRLINE_PASSWORD="TestPass123!"

echo "Données de test:"
echo "  - Nom: $AIRLINE_NAME"
echo "  - Code IATA: $AIRLINE_CODE"
echo "  - Email: $AIRLINE_EMAIL"
echo ""

# Appel API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/v1/airlines/create-by-support" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -d "{
    \"name\": \"${AIRLINE_NAME}\",
    \"code\": \"${AIRLINE_CODE}\",
    \"email\": \"${AIRLINE_EMAIL}\",
    \"password\": \"${AIRLINE_PASSWORD}\"
  }")

# Séparer le body et le status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo "Réponse HTTP: $HTTP_CODE"
echo ""

# Analyser la réponse
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "${GREEN}✅ SUCCÈS: Compagnie aérienne créée${NC}"
    echo ""
    echo "Détails de la réponse:"
    echo "$HTTP_BODY" | python3 -m json.tool 2>/dev/null || echo "$HTTP_BODY"
    echo ""
    
elif [ "$HTTP_CODE" = "401" ]; then
    echo "${RED}❌ ERREUR 401: Authentification requise${NC}"
    echo "   → Votre token est invalide ou expiré"
    echo "   → Connectez-vous au dashboard et récupérez un nouveau token"
    echo ""
    echo "Réponse:"
    echo "$HTTP_BODY"
    
elif [ "$HTTP_CODE" = "403" ]; then
    echo "${RED}❌ ERREUR 403: Accès refusé${NC}"
    echo "   → Vous n'avez pas le rôle 'support'"
    echo "   → Seuls les utilisateurs support peuvent créer des compagnies"
    echo ""
    echo "Réponse:"
    echo "$HTTP_BODY"
    
elif [ "$HTTP_CODE" = "409" ]; then
    echo "${YELLOW}⚠️  ERREUR 409: Conflit${NC}"
    echo "   → Une compagnie avec cet email ou code IATA existe déjà"
    echo "   → C'est normal si vous avez déjà exécuté ce test"
    echo ""
    echo "Réponse:"
    echo "$HTTP_BODY"
    
elif [ "$HTTP_CODE" = "400" ]; then
    echo "${RED}❌ ERREUR 400: Requête invalide${NC}"
    echo "   → Vérifiez les données envoyées"
    echo ""
    echo "Réponse:"
    echo "$HTTP_BODY"
    
elif [ "$HTTP_CODE" = "000" ] || [ -z "$HTTP_CODE" ]; then
    echo "${RED}❌ ERREUR: Impossible de se connecter à l'API${NC}"
    echo "   → Vérifiez que l'API est démarrée sur $API_URL"
    echo "   → Vérifiez votre connexion réseau"
    
else
    echo "${RED}❌ ERREUR $HTTP_CODE: Erreur inattendue${NC}"
    echo ""
    echo "Réponse complète:"
    echo "$HTTP_BODY"
fi

echo ""
echo "=========================================="
echo "TEST 2: Vérification de la colonne approved_at"
echo "=========================================="
echo ""
echo "La migration SQL 'fix-airline-registration-schema.sql' doit être exécutée"
echo "pour ajouter la colonne 'approved_at' manquante."
echo ""
echo "Si vous obtenez une erreur concernant 'approved_at', exécutez:"
echo "  → migrations/fix-airline-registration-schema.sql dans Supabase SQL Editor"
echo ""

echo "=========================================="
echo "RÉSUMÉ"
echo "=========================================="
echo ""
echo "Pour que ce test fonctionne, vous devez:"
echo "  1. ✅ Avoir exécuté les migrations SQL:"
echo "     - fix-airline-registration-schema.sql"
echo "     - fix-support-role-and-rls.sql"
echo ""
echo "  2. ✅ Être connecté en tant qu'utilisateur support"
echo ""
echo "  3. ✅ Avoir un token Bearer valide"
echo "     Comment obtenir le token:"
echo "     - Ouvrez le dashboard dans votre navigateur"
echo "     - Connectez-vous avec support@brsats.com"
echo "     - Ouvrez la console développeur (F12)"
echo "     - Allez dans Application > Local Storage"
echo "     - Copiez la valeur de 'sb-<project>-auth-token'"
echo ""
echo "=========================================="
echo "TEST TERMINÉ"
echo "=========================================="
