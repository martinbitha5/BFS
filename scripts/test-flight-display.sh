#!/bin/bash

# Script de test pour vérifier l'affichage des vols dans le Dashboard
# Teste que les vols ajoutés apparaissent dans les statistiques

echo "=========================================="
echo "Test d'affichage des vols dans Dashboard"
echo "=========================================="
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
AIRPORT_CODE="${AIRPORT_CODE:-FIH}"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Configuration:"
echo "  API URL: $API_URL"
echo "  Airport: $AIRPORT_CODE"
echo ""

# 1. Vérifier les vols programmés dans flight_schedule
echo "1️⃣  Vérification des vols dans flight_schedule..."
TODAY=$(date +%Y-%m-%d)
echo "   Date: $TODAY"

FLIGHTS_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/flights?airport=$AIRPORT_CODE&date=$TODAY" \
  -H "x-api-key: bfs-api-key-secure-2025")

FLIGHTS_COUNT=$(echo $FLIGHTS_RESPONSE | jq -r '.count // 0')
echo "   ✅ Vols programmés: $FLIGHTS_COUNT"

if [ "$FLIGHTS_COUNT" -gt 0 ]; then
  echo "   Détails des vols:"
  echo $FLIGHTS_RESPONSE | jq -r '.data[] | "     - \(.flightNumber) (\(.airline)) \(.departure) → \(.arrival)"'
else
  echo -e "   ${YELLOW}⚠️  Aucun vol programmé pour aujourd'hui${NC}"
fi
echo ""

# 2. Vérifier les statistiques du Dashboard
echo "2️⃣  Vérification des statistiques Dashboard..."
STATS_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/stats/airport/$AIRPORT_CODE" \
  -H "x-api-key: bfs-api-key-secure-2025")

STATS_FLIGHTS_COUNT=$(echo $STATS_RESPONSE | jq -r '.data.flightsCount // 0')
UNIQUE_FLIGHTS=$(echo $STATS_RESPONSE | jq -r '.data.uniqueFlights[]?' 2>/dev/null | tr '\n' ', ' | sed 's/,$//')

echo "   Nombre de vols dans stats: $STATS_FLIGHTS_COUNT"
if [ -n "$UNIQUE_FLIGHTS" ]; then
  echo "   Vols listés: $UNIQUE_FLIGHTS"
else
  echo "   Vols listés: (aucun)"
fi
echo ""

# 3. Vérifier les vols avec statistiques détaillées
echo "3️⃣  Vérification des vols avec statistiques..."
FLIGHTS_STATS_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/stats/flights/$AIRPORT_CODE" \
  -H "x-api-key: bfs-api-key-secure-2025")

DETAILED_FLIGHTS_COUNT=$(echo $FLIGHTS_STATS_RESPONSE | jq -r '.data.totalFlights // 0')
echo "   Vols avec stats détaillées: $DETAILED_FLIGHTS_COUNT"

if [ "$DETAILED_FLIGHTS_COUNT" -gt 0 ]; then
  echo "   Détails:"
  echo $FLIGHTS_STATS_RESPONSE | jq -r '.data.flights[] | "     - \(.flightNumber): \(.stats.totalPassengers) pax, \(.stats.totalBaggages) bags"'
fi
echo ""

# 4. Résumé et diagnostic
echo "=========================================="
echo "📊 RÉSUMÉ"
echo "=========================================="
echo ""

if [ "$FLIGHTS_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ PROBLÈME: Aucun vol programmé dans flight_schedule${NC}"
  echo "   Solution: Ajouter un vol depuis le Dashboard (Gestion de Vols)"
  exit 1
elif [ "$STATS_FLIGHTS_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ PROBLÈME: Les vols existent mais n'apparaissent pas dans les stats${NC}"
  echo "   Vols programmés: $FLIGHTS_COUNT"
  echo "   Vols dans stats: $STATS_FLIGHTS_COUNT"
  echo "   Solution: Vérifier la correction du endpoint stats/airport"
  exit 1
else
  echo -e "${GREEN}✅ SUCCÈS: Les vols sont correctement affichés${NC}"
  echo "   Vols programmés: $FLIGHTS_COUNT"
  echo "   Vols dans stats: $STATS_FLIGHTS_COUNT"
  echo "   Vols détaillés: $DETAILED_FLIGHTS_COUNT"
  echo ""
  echo "Les vols devraient être visibles dans:"
  echo "  - Vue d'ensemble (flightsCount: $STATS_FLIGHTS_COUNT)"
  echo "  - Gestion de Vols (liste complète)"
  echo "  - Application mobile (pour aujourd'hui)"
  exit 0
fi
