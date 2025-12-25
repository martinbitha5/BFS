# 🚀 Guide pour démarrer l'application mobile Expo

## ✅ Configuration effectuée

- ✅ URL API mise à jour : `https://api.brsats.com` (au lieu de Render)
- ✅ Variables d'environnement configurées dans `.env`
- ✅ Expo démarré

## 📱 Comment accéder à l'application

### Option 1 : Via Expo Go (sur votre téléphone)

1. **Installer Expo Go** sur votre téléphone :
   - Android : [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS : [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **Scanner le QR code** :
   - Dans le terminal où Expo tourne, vous verrez un QR code
   - Sur Android : Ouvrez Expo Go et scannez le QR code
   - Sur iOS : Utilisez l'appareil photo et cliquez sur la notification

3. **Ou utiliser l'URL** :
   - Expo affichera une URL comme : `exp://192.168.x.x:8081`
   - Vous pouvez la partager ou la scanner

### Option 2 : Via le navigateur web

```bash
# Dans le terminal où Expo tourne, appuyez sur :
w  # Pour ouvrir dans le navigateur web
```

Ou ouvrez directement : `http://localhost:8081`

### Option 3 : Via un émulateur Android/iOS

```bash
# Pour Android
npm run android

# Pour iOS (sur Mac uniquement)
npm run ios
```

## 🔧 Commandes utiles dans Expo

Quand Expo est démarré, vous pouvez utiliser ces raccourcis :

- `w` : Ouvrir dans le navigateur web
- `a` : Ouvrir sur Android (émulateur ou appareil connecté)
- `i` : Ouvrir sur iOS (simulateur ou appareil connecté)
- `r` : Recharger l'application
- `m` : Ouvrir le menu développeur
- `j` : Ouvrir le debugger
- `c` : Effacer le cache et redémarrer
- `q` : Quitter Expo

## 🐛 Si Expo ne démarre pas

### Vérifier que le port 8081 est libre

```bash
lsof -ti:8081 | xargs kill -9
```

### Redémarrer Expo avec cache effacé

```bash
cd "/home/goblaire/Bureau/Nouveau dossier/BFS"
npx expo start --clear
```

### Vérifier les dépendances

```bash
npm install
```

### Vérifier la configuration

```bash
cat .env | grep EXPO_PUBLIC
```

Vous devriez voir :
- `EXPO_PUBLIC_SUPABASE_URL=...`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY=...`
- `EXPO_PUBLIC_API_URL=https://api.brsats.com`

## 📝 Notes importantes

1. **L'application mobile** utilise l'API de production (`https://api.brsats.com`)
2. **Les agents opérationnels** (checkin, baggage, boarding, arrival) utilisent cette app mobile
3. **Le Dashboard web** est réservé aux supervisors et support uniquement

## 🔗 URLs importantes

- **API Production** : `https://api.brsats.com`
- **Dashboard** : `https://dashboard.brsats.com`
- **Airline Portal** : `https://airline-portal.brsats.com`
- **Expo Dev Server** : `http://localhost:8081`

