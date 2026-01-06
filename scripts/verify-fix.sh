#!/bin/bash

# Script de vérification après exécution des migrations

echo "🔍 Vérification de la correction"
echo "================================="
echo ""

# Demander les identifiants support
read -p "Email du compte support [support@brsats.com]: " SUPPORT_EMAIL
SUPPORT_EMAIL=${SUPPORT_EMAIL:-support@brsats.com}

read -sp "Mot de passe: " SUPPORT_PASSWORD
echo ""
echo ""

API_URL="https://api.brsats.com"
API_KEY="bfs-api-key-secure-2025"

# 1. Connexion
echo "1️⃣ Connexion en tant que $SUPPORT_EMAIL..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{
    \"email\": \"$SUPPORT_EMAIL\",
    \"password\": \"$SUPPORT_PASSWORD\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // .token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Échec de connexion"
  echo "Réponse: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Connecté"
echo ""

# 2. Test création baggage_dispute
echo "2️⃣ Test création utilisateur BAGGAGE_DISPUTE..."
TIMESTAMP=$(date +%s)
TEST_EMAIL="test-dispute-$TIMESTAMP@test.com"

RESPONSE=$(curl -s -X POST "$API_URL/api/v1/users/create-by-support" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"Test123456\",
    \"full_name\": \"Test Litige Bagages\",
    \"role\": \"baggage_dispute\"
  }")

echo "$RESPONSE" | jq '.'
echo ""

SUCCESS=$(echo $RESPONSE | jq -r '.success // false')

if [ "$SUCCESS" = "true" ]; then
  echo "✅ SUCCÈS - La création d'utilisateurs fonctionne!"
  echo ""
  echo "Vous pouvez maintenant créer des utilisateurs depuis le Dashboard:"
  echo "  - Superviseur (aéroport spécifique)"
  echo "  - Litige Bagages (tous les aéroports)"
else
  echo "❌ ÉCHEC - Il y a encore un problème"
  ERROR=$(echo $RESPONSE | jq -r '.error // "Erreur inconnue"')
  echo "Erreur: $ERROR"
  
  if echo "$RESPONSE" | grep -q "check constraint"; then
    echo ""
    echo "⚠️  La contrainte CHECK n'a pas été mise à jour correctement"
    echo "   Vérifiez que vous avez bien exécuté la migration 2"
  fi
  
  if echo "$RESPONSE" | grep -q "policy"; then
    echo ""
    echo "⚠️  Le compte support n'existe pas dans la table users"
    echo "   Vérifiez que vous avez bien exécuté la migration 1"
  fi
fi
