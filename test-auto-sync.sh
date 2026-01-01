#!/bin/bash

# Test script pour vérifier l'auto-sync des données
# Ce script vérifie que les routes passengers et baggages retournent des données
# quand des raw_scans existent

API_URL="https://api.brsats.com"
# API_URL="http://localhost:3000"  # Décommenter pour test local
API_KEY="bfs-api-key-secure-2025"
AIRPORT="FIH"

echo "=========================================="
echo "TEST AUTO-SYNC BFS DASHBOARD"
echo "=========================================="
echo ""

# 1. Vérifier les raw_scans stats
echo "1. Vérification des raw_scans stats..."
RAW_SCANS_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/raw-scans/stats?airport=${AIRPORT}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json")

echo "   Raw Scans Stats: $RAW_SCANS_RESPONSE"
echo ""

# 2. Vérifier le nombre de raw_scans
echo "2. Vérification des raw_scans..."
RAW_SCANS=$(curl -s -X GET "${API_URL}/api/v1/raw-scans?airport=${AIRPORT}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json")

RAW_COUNT=$(echo "$RAW_SCANS" | grep -o '"count":[0-9]*' | head -1 | cut -d':' -f2)
echo "   Nombre de raw_scans: ${RAW_COUNT:-0}"
echo ""

# 3. Vérifier les passagers (devrait déclencher auto-sync si vide)
echo "3. Vérification des passagers (avec auto-sync)..."
PASSENGERS=$(curl -s -X GET "${API_URL}/api/v1/passengers?airport=${AIRPORT}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json")

PASS_COUNT=$(echo "$PASSENGERS" | grep -o '"count":[0-9]*' | head -1 | cut -d':' -f2)
echo "   Nombre de passagers: ${PASS_COUNT:-0}"
echo ""

# 4. Vérifier les bagages (devrait déclencher auto-sync si vide)
echo "4. Vérification des bagages (avec auto-sync)..."
BAGGAGES=$(curl -s -X GET "${API_URL}/api/v1/baggage?airport=${AIRPORT}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json")

BAG_COUNT=$(echo "$BAGGAGES" | grep -o '"count":[0-9]*' | head -1 | cut -d':' -f2)
echo "   Nombre de bagages: ${BAG_COUNT:-0}"
echo ""

# 5. Vérifier les stats globales
echo "5. Vérification des stats globales..."
STATS=$(curl -s -X GET "${API_URL}/api/v1/stats/airport/${AIRPORT}" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json")

echo "   Stats: $STATS"
echo ""

# 6. Résumé
echo "=========================================="
echo "RÉSUMÉ"
echo "=========================================="
echo "Raw Scans: ${RAW_COUNT:-0}"
echo "Passagers: ${PASS_COUNT:-0}"
echo "Bagages: ${BAG_COUNT:-0}"
echo ""

if [ "${RAW_COUNT:-0}" -gt 0 ] && [ "${PASS_COUNT:-0}" -eq 0 ]; then
    echo "⚠️  ATTENTION: Il y a des raw_scans mais aucun passager."
    echo "   L'auto-sync devrait créer des passagers au prochain appel."
    echo ""
    echo "   Relancer le test dans quelques secondes pour vérifier..."
elif [ "${RAW_COUNT:-0}" -gt 0 ] && [ "${PASS_COUNT:-0}" -gt 0 ]; then
    echo "✅ OK: Les raw_scans ont été synchronisés en passagers."
else
    echo "ℹ️  INFO: Pas de raw_scans disponibles pour cet aéroport."
fi

echo ""
echo "=========================================="
echo "TEST TERMINÉ"
echo "=========================================="
