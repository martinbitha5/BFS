#!/bin/bash

# Script de test pour déboguer les problèmes de validation de vols en production
# Remplace les valeurs par les tiennes

API_URL="https://api.brsats.com"  # À remplacer par ton URL réelle
API_KEY="bfs-api-key-secure-2025"
AIRPORT="FIH"  # À remplacer par ton aéroport
FLIGHT_NUMBER="ET80"  # À remplacer par le vol que tu scans

echo "========================================"
echo "🔍 Test Validation Vol (Production)"
echo "========================================"
echo ""
echo "Configuration:"
echo "  API URL: $API_URL"
echo "  API Key: $API_KEY"
echo "  Aéroport: $AIRPORT"
echo "  Vol à tester: $FLIGHT_NUMBER"
echo ""

# Test 1: Vérifier la santé de l'API
echo "1️⃣ Test santé de l'API..."
curl -s -X GET "$API_URL/health" -H "x-api-key: $API_KEY" | jq '.' || echo "❌ API non accessible"
echo ""

# Test 2: Récupérer tous les vols d'aujourd'hui
echo "2️⃣ Récupérer tous les vols pour l'aéroport $AIRPORT..."
curl -s -X GET "$API_URL/api/v1/flights?airport=$AIRPORT" \
  -H "x-api-key: $API_KEY" | jq '.data | length as $count | "Vols trouvés: \($count)"' || echo "❌ Erreur"
echo ""

# Test 3: Récupérer les vols disponibles (aujourd'hui)
echo "3️⃣ Récupérer les vols disponibles pour l'aéroport $AIRPORT (aujourd'hui)..."
curl -s -X GET "$API_URL/api/v1/flights/available/$AIRPORT" \
  -H "x-api-key: $API_KEY" | jq '.' || echo "❌ Erreur"
echo ""

# Test 4: Tester le diagnostic
echo "4️⃣ Test diagnostic pour l'aéroport $AIRPORT..."
curl -s -X GET "$API_URL/api/v1/flights/diagnostic/$AIRPORT" \
  -H "x-api-key: $API_KEY" | jq '.' || echo "❌ Erreur"
echo ""

# Test 5: Vérifier le vol spécifique
echo "5️⃣ Vérifier si le vol $FLIGHT_NUMBER existe..."
curl -s -X GET "$API_URL/api/v1/flights/check/$FLIGHT_NUMBER?airport=$AIRPORT" \
  -H "x-api-key: $API_KEY" | jq '.' || echo "❌ Erreur"
echo ""

# Test 6: Valider le vol pour le boarding
echo "6️⃣ Valider le vol pour le boarding..."
curl -s -X POST "$API_URL/api/v1/flights/validate-boarding" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"flightNumber\": \"$FLIGHT_NUMBER\",
    \"airportCode\": \"$AIRPORT\"
  }" | jq '.' || echo "❌ Erreur"
echo ""

echo "========================================"
echo "✅ Tests terminés"
echo "========================================"
