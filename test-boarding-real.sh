#!/bin/bash

echo "=========================================="
echo "TEST RÉEL: Boarding Sync Endpoint"
echo "=========================================="

# Données de test valides
API_URL="https://api.brsats.com/api/v1/boarding/sync-hash"

# UUID valide d'un passager existant (depuis les logs)
PASSENGER_ID="c32faa89-355d-4eca-bcee-62a41b37807a"
BOARDED_BY="4b060b1c-cce1-4f3f-aacc-6ee97b6295ac"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydHdrcGVndWJmanVjdHJlbnhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDMyMjEwMDAsImV4cCI6MTg2MDk4ODgwMH0.zxQzWJM7H-mGiOcsVF8H0K1WKPzIl2Jq2cC9P2y_dAI"

echo ""
echo "📡 Appel POST $API_URL"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "passenger_id": "'$PASSENGER_ID'",
    "boarded_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "boarded_by": "'$BOARDED_BY'",
    "airport_code": "FIH",
    "pnr": "YCECFQ",
    "full_name": "TEST USER",
    "flight_number": "KQ0555"
  }')

# Séparer le code HTTP du body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

echo ""
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ SUCCESS! Endpoint fonctionne correctement"
  exit 0
else
  echo "❌ ERREUR! Code HTTP: $HTTP_CODE"
  echo ""
  echo "Analysons l'erreur..."
  if echo "$BODY" | grep -q "uuid"; then
    echo "⚠️  Problème UUID détecté"
  fi
  if echo "$BODY" | grep -q "column"; then
    echo "⚠️  Problème colonne détecté"
  fi
  exit 1
fi
