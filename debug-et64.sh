#!/bin/bash

# Test rapide de l'API pour déboguer ET64

API_URL="https://api.brsats.com"
API_KEY="bfs-api-key-secure-2025"
AIRPORT="FIH"
FLIGHT="ET64"

echo "🔍 Test API Production"
echo "====================="
echo ""
echo "1️⃣ Diagnostic aéroport FIH:"
curl -s -X GET "$API_URL/api/v1/flights/diagnostic/FIH" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "2️⃣ Validation vol ET64:"
curl -s -X POST "$API_URL/api/v1/flights/validate-boarding" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"flightNumber":"ET64","airportCode":"FIH"}' | jq '.'

echo ""
echo "3️⃣ Test variante ET064:"
curl -s -X POST "$API_URL/api/v1/flights/validate-boarding" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"flightNumber":"ET064","airportCode":"FIH"}' | jq '.'
