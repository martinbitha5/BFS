#!/bin/bash

# Test script pour vérifier l'upload BIRS API
# Simule exactement ce que le airline-portal envoie

API_URL="https://api.brsats.com"
API_KEY="bfs-api-key-secure-2025"

echo "=========================================="
echo "Test 1: Vérifier la santé de l'API"
echo "=========================================="
curl -s -X GET "$API_URL/health" | jq . || echo "Health check failed"

echo ""
echo "=========================================="
echo "Test 2: Upload sans clé API (doit échouer)"
echo "=========================================="
curl -s -X POST "$API_URL/api/v1/birs/upload" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.txt",
    "fileContent": "test content",
    "reportType": "birs"
  }' | jq . || echo "Request failed"

echo ""
echo "=========================================="
echo "Test 3: Upload avec clé API correcte"
echo "=========================================="
curl -s -X POST "$API_URL/api/v1/birs/upload" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "fileName": "test.txt",
    "fileContent": "test content",
    "reportType": "birs",
    "flightNumber": "TK540",
    "flightDate": "2025-12-31",
    "origin": "CDG",
    "destination": "ORY",
    "airportCode": "CDG"
  }' | jq . || echo "Request failed"

echo ""
echo "=========================================="
echo "Test 4: Upload avec clé API incorrecte"
echo "=========================================="
curl -s -X POST "$API_URL/api/v1/birs/upload" \
  -H "Content-Type: application/json" \
  -H "x-api-key: wrong-key" \
  -d '{
    "fileName": "test.txt",
    "fileContent": "test content",
    "reportType": "birs"
  }' | jq . || echo "Request failed"

echo ""
echo "=========================================="
echo "Test 5: Vérifier les headers envoyés"
echo "=========================================="
curl -s -v -X POST "$API_URL/api/v1/birs/upload" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"fileName":"test.txt","fileContent":"test","reportType":"birs"}' 2>&1 | grep -E "(< HTTP|x-api-key|Authorization)" || echo "No headers found"

echo ""
echo "=========================================="
echo "Test 6: Test en localhost (si API locale)"
echo "=========================================="
curl -s -X POST "http://localhost:3000/api/v1/birs/upload" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "fileName": "test.txt",
    "fileContent": "test content",
    "reportType": "birs"
  }' 2>&1 | jq . || echo "Localhost not available"

echo ""
echo "=========================================="
echo "Tests terminés"
echo "=========================================="
