#!/bin/bash

# Vérifier si l'ID du compte support correspond entre users et auth.users

API_URL="https://api.brsats.com"
API_KEY="bfs-api-key-secure-2025"

echo "🔍 Vérification de l'ID du compte support"
echo "=========================================="
echo ""

# Connexion
read -p "Email support [support@brsats.com]: " SUPPORT_EMAIL
SUPPORT_EMAIL=${SUPPORT_EMAIL:-support@brsats.com}
read -sp "Mot de passe: " SUPPORT_PASSWORD
echo ""
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{
    \"email\": \"$SUPPORT_EMAIL\",
    \"password\": \"$SUPPORT_PASSWORD\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // .token // empty')
USER_DATA=$(echo $LOGIN_RESPONSE | jq -r '.data.user // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Échec de connexion"
  exit 1
fi

echo "✅ Connecté"
echo ""

# Extraire l'ID de l'utilisateur depuis la réponse de login
USER_ID=$(echo $USER_DATA | jq -r '.id // empty')

echo "📋 Informations du compte support:"
echo "   ID dans users table: $USER_ID"
echo ""

# Décoder le JWT pour voir l'ID dans le token
echo "🔑 Décodage du JWT..."
JWT_PAYLOAD=$(echo $TOKEN | cut -d'.' -f2)
# Ajouter le padding nécessaire pour base64
JWT_PAYLOAD_PADDED="${JWT_PAYLOAD}$(printf '%*s' $((4 - ${#JWT_PAYLOAD} % 4)) '' | tr ' ' '=')"
JWT_DECODED=$(echo $JWT_PAYLOAD_PADDED | base64 -d 2>/dev/null | jq '.')

if [ $? -eq 0 ]; then
  echo "$JWT_DECODED"
  AUTH_UID=$(echo $JWT_DECODED | jq -r '.sub // empty')
  echo ""
  echo "📋 ID dans le JWT (auth.uid()):"
  echo "   $AUTH_UID"
  echo ""
  
  if [ "$USER_ID" = "$AUTH_UID" ]; then
    echo "✅ Les IDs correspondent!"
    echo "   Le problème n'est PAS un ID mismatch"
    echo ""
    echo "⚠️  Le problème doit être ailleurs:"
    echo "   1. La politique RLS n'existe pas ou est mal configurée"
    echo "   2. Le compte support n'est pas marqué is_approved=true"
    echo "   3. Un autre problème de configuration"
  else
    echo "❌ Les IDs NE correspondent PAS!"
    echo "   ID dans users:     $USER_ID"
    echo "   ID dans auth.uid(): $AUTH_UID"
    echo ""
    echo "🔧 SOLUTION: Exécutez la migration fix-support-user-id-mismatch.sql"
  fi
else
  echo "⚠️  Impossible de décoder le JWT"
fi
