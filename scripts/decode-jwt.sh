#!/bin/bash

# Script pour décoder un JWT et extraire le sub (user ID)

if [ -z "$1" ]; then
  echo "Usage: bash scripts/decode-jwt.sh <JWT_TOKEN>"
  exit 1
fi

JWT=$1

# Extraire le payload (2ème partie du JWT)
PAYLOAD=$(echo $JWT | cut -d'.' -f2)

# Ajouter le padding base64 si nécessaire
case $((${#PAYLOAD} % 4)) in
  2) PAYLOAD="${PAYLOAD}==" ;;
  3) PAYLOAD="${PAYLOAD}=" ;;
esac

# Décoder
echo "JWT Payload décodé:"
echo $PAYLOAD | base64 -d 2>/dev/null | jq '.'
echo ""
echo "User ID (sub):"
echo $PAYLOAD | base64 -d 2>/dev/null | jq -r '.sub'
