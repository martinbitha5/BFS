#!/bin/bash

# Script pour appliquer les corrections au lien passager-bagages
# Correction 2: Ajouter validation re-fetch après création passager

echo "🔧 Applicatio de la Correction 2..."

# Trouver et remplacer dans BaggageScreen.tsx
BAGGAGE_SCREEN="./src/screens/BaggageScreen.tsx"

# Correction 2: Ajouter validation après getPassengerById
if grep -q 'passenger = await databaseServiceInstance.getPassengerById(passengerId);' "$BAGGAGE_SCREEN"; then
    echo "✅ Point d'insertion trouvé pour correction 2"
    
    # Créer un fichier patch temporaire
    cat > /tmp/patch2.txt << 'EOF'
              passenger = await databaseServiceInstance.getPassengerById(passengerId);
              
              // 🔴 VALIDATION CRITIQUE P0: Vérifier le re-fetch
              if (!passenger) {
                console.error('[BAGGAGE] 🔴 CRITICAL P0: Passager créé mais non trouvé au re-fetch!', {
                  passengerId,
                  pnr: result.data.pnr,
                  fullName: result.data.full_name,
                });
                
                await playErrorSound();
                setProcessing(false);
                
                Alert.alert(
                  'ERREUR SYSTÈME',
                  'Le passager a été créé mais ne peut pas être chargé.\\n\\nVeuillez recommencer le scan.',
                  [
                    {
                      text: 'Nouveau scan',
                      onPress: () => {
                        isProcessingRef.current = false;
                        setScanned(false);
                        setShowScanner(true);
                      },
                    },
                  ],
                  { cancelable: false }
                );
                return;
              }
EOF
    
    echo "✅ Correction 2 préparée"
else
    echo "❌ Point d'insertion pour correction 2 non trouvé"
fi

echo ""
echo "📝 Pour appliquer manuellement:"
echo "1. Ouvrir src/screens/BaggageScreen.tsx"
echo "2. Chercher ligne 263: 'passenger = await databaseServiceInstance.getPassengerById(passengerId);'"
echo "3. Ajouter le code de validation après (voir CORRECTIONS-BAGGAGE-PASSENGER-LINK.md)"
echo ""
echo "✅ Correction 1 déjà appliquée (passenger.id validation)"
