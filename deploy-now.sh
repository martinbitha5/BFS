#!/bin/bash

# 🚀 ONE-LINER DEPLOY SCRIPT
# Tout ce qu'il faut faire pour déployer après les corrections

echo \"\"
echo \"════════════════════════════════════════════════════════════════\"
echo \"🎯 DEPLOY PRODUCTION BOARDING FIX\"
echo \"════════════════════════════════════════════════════════════════\"
echo \"\"

# 1. Vérifier que tout est OK
echo \"📋 STEP 1: Vérification des variables...\"
echo \"\"
echo \"✅ .env:\"
grep EXPO_PUBLIC_API .env | head -2
echo \"\"
echo \"✅ .env.production:\"
grep EXPO_PUBLIC_API .env.production | head -2
echo \"\"

# 2. Clean build
echo \"🧹 STEP 2: Clean build...\"
rm -rf node_modules .expo dist
npm install --legacy-peer-deps 2>&1 | grep -E \"^added|^up to|^removed\"

echo \"\"
echo \"🔨 STEP 3: Building for Android...\"
eas build --platform android --release

echo \"\"
echo \"════════════════════════════════════════════════════════════════\"
echo \"✅ BUILD TERMINÉ!\"
echo \"════════════════════════════════════════════════════════════════\"
echo \"\"
echo \"📲 Prochaines étapes:\"
echo \"\"
echo \"1. Télécharger l'APK: https://expo.dev/accounts/*/projects/BFS/builds\"
echo \"\"
echo \"2. Installer sur device: adb install-multiple app-release.apk\"
echo \"\"
echo \"3. Tester Check-in:\"
echo \"   - Login\"
echo \"   - Aller à Check-in\"
echo \"   - Scanner boarding pass\"
echo \"   - Vérifier: ✅ Check-in enregistré!\"
echo \"\"
echo \"4. Tester Boarding:\"
echo \"   - Aller à Boarding\"
echo \"   - Scanner même boarding pass\"
echo \"   - Vérifier: ✅ Embarquement confirmé!\"
echo \"\"
echo \"5. Vérifier les logs:\"
echo \"   - [App] ✅ Variables d'environnement initialisées\"
echo \"   - [FlightService] ✅ Vol validé via API\"
echo \"\"
echo \"════════════════════════════════════════════════════════════════\"
echo \"\"
