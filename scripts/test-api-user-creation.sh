#!/bin/bash

# Script de test pour la création d'utilisateurs via l'API
# Teste les deux types: supervisor et baggage_dispute

API_URL="https://api.brsats.com"
API_KEY="bfs-api-key-secure-2025"

echo "🔍 Test de création d'utilisateurs Dashboard via API"
echo "=================================================="
echo ""

# 1. Se connecter en tant que support
echo "1️⃣ Connexion en tant que support@brsats.com..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "email": "support@brsats.com",
    "password": "Support@2025"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Échec de connexion"
  echo "Réponse: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Connecté avec succès"
echo ""

# 2. Test création superviseur (aéroport spécifique)
echo "2️⃣ Test création SUPERVISEUR (aéroport FIH)..."
TIMESTAMP=$(date +%s)
SUPERVISOR_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/users/create-by-support" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"email\": \"supervisor-test-$TIMESTAMP@test.com\",
    \"password\": \"Test123456\",
    \"full_name\": \"Test Superviseur FIH\",
    \"role\": \"supervisor\",
    \"airport_code\": \"FIH\"
  }")

echo "Réponse:"
echo "$SUPERVISOR_RESPONSE" | jq '.'

SUCCESS=$(echo $SUPERVISOR_RESPONSE | jq -r '.success // false')
if [ "$SUCCESS" = "true" ]; then
  echo "✅ Superviseur créé avec succès"
else
  echo "❌ Échec création superviseur"
  ERROR=$(echo $SUPERVISOR_RESPONSE | jq -r '.error // "Erreur inconnue"')
  echo "Erreur: $ERROR"
fi
echo ""

# 3. Test création baggage_dispute (tous les aéroports)
echo "3️⃣ Test création BAGGAGE_DISPUTE (tous aéroports)..."
TIMESTAMP=$(date +%s)
DISPUTE_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/users/create-by-support" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"email\": \"dispute-test-$TIMESTAMP@test.com\",
    \"password\": \"Test123456\",
    \"full_name\": \"Test Litige Bagages\",
    \"role\": \"baggage_dispute\",
    \"airport_code\": \"ALL\"
  }")

echo "Réponse:"
echo "$DISPUTE_RESPONSE" | jq '.'

SUCCESS=$(echo $DISPUTE_RESPONSE | jq -r '.success // false')
if [ "$SUCCESS" = "true" ]; then
  echo "✅ Baggage_dispute créé avec succès"
else
  echo "❌ Échec création baggage_dispute"
  ERROR=$(echo $DISPUTE_RESPONSE | jq -r '.error // "Erreur inconnue"')
  DETAILS=$(echo $DISPUTE_RESPONSE | jq -r '.details // ""')
  echo "Erreur: $ERROR"
  if [ ! -z "$DETAILS" ]; then
    echo "Détails: $DETAILS"
  fi
fi
echo ""

echo "=================================================="
echo "📊 RÉSUMÉ"
echo "=================================================="
echo ""

# Analyser les erreurs
if echo "$SUPERVISOR_RESPONSE" | grep -q "violates check constraint"; then
  echo "❌ PROBLÈME: Contrainte CHECK manque des rôles"
  echo "   → La migration fix-baggage-dispute-role-constraint.sql n'a pas été exécutée"
  echo ""
fi

if echo "$DISPUTE_RESPONSE" | grep -q "violates check constraint"; then
  echo "❌ PROBLÈME: Contrainte CHECK manque le rôle baggage_dispute"
  echo "   → La migration fix-baggage-dispute-role-constraint.sql n'a pas été exécutée"
  echo ""
fi

if echo "$SUPERVISOR_RESPONSE" | grep -q "policy"; then
  echo "❌ PROBLÈME: Politique RLS bloque l'insertion"
  echo "   → Vérifiez que le compte support existe dans la table users"
  echo "   → Exécutez: migrations/ensure-support-user-in-table.sql"
  echo ""
fi

if echo "$DISPUTE_RESPONSE" | grep -q "policy"; then
  echo "❌ PROBLÈME: Politique RLS bloque l'insertion"
  echo "   → Vérifiez que le compte support existe dans la table users"
  echo "   → Exécutez: migrations/ensure-support-user-in-table.sql"
  echo ""
fi

echo "✅ Pour corriger, exécutez dans le SQL Editor de Supabase:"
echo "   1. migrations/ensure-support-user-in-table.sql"
echo "   2. migrations/fix-baggage-dispute-role-constraint.sql"
