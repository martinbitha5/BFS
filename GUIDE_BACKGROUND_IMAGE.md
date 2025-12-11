# 🖼️ Guide : Ajouter l'image de fond d'aéroport

## ✅ Modifications effectuées dans le code

J'ai modifié **3 pages** pour utiliser l'image d'avion comme fond :

1. ✅ **Portail Airlines - Login** (`/airline-portal/src/pages/Login.tsx`)
2. ✅ **Portail Airlines - Signup** (`/airline-portal/src/pages/Signup.tsx`)
3. ✅ **Dashboard Superviseur - Login** (`/dashboard/src/pages/Login.tsx`)

## 📥 Étapes pour ajouter l'image

### Option 1 : Via l'interface (RECOMMANDÉ)

#### Pour le Portail Airlines :
1. Sauvegardez l'image 1 (avion sur le tarmac) sur votre ordinateur
2. Nommez-la `airport-bg.jpg`
3. Placez-la dans : `/home/goblaire/Documents/BFS/airline-portal/public/images/airport-bg.jpg`

#### Pour le Dashboard Superviseur :
1. Copiez la même image
2. Placez-la dans : `/home/goblaire/Documents/BFS/dashboard/public/images/airport-bg.jpg`

### Option 2 : Via terminal

```bash
# Créer les dossiers si nécessaire
mkdir -p /home/goblaire/Documents/BFS/airline-portal/public/images
mkdir -p /home/goblaire/Documents/BFS/dashboard/public/images

# Copier votre image (remplacez /path/to/votre/image.jpg par le chemin réel)
cp /path/to/votre/image.jpg /home/goblaire/Documents/BFS/airline-portal/public/images/airport-bg.jpg
cp /path/to/votre/image.jpg /home/goblaire/Documents/BFS/dashboard/public/images/airport-bg.jpg
```

## 🎨 Résultat attendu

### Avant :
- ❌ Fond bleu uni gradient

### Après :
- ✅ Image d'avion sur le tarmac avec coucher de soleil
- ✅ Overlay noir semi-transparent (50% opacité)
- ✅ Flou léger (backdrop-blur) pour améliorer la lisibilité
- ✅ Formulaire blanc en avant-plan bien visible

## 🧪 Tester localement

### Portail Airlines :
```bash
cd /home/goblaire/Documents/BFS/airline-portal
npm run dev
# Ouvrir http://localhost:3002/login
```

### Dashboard Superviseur :
```bash
cd /home/goblaire/Documents/BFS/dashboard
npm run dev
# Ouvrir http://localhost:3001/login
```

## 📤 Déployer les changements

### 1. Commiter le code (déjà fait)
```bash
git add .
git commit -m "UI: Ajouter image d'aéroport en background des pages login/signup"
git push origin main
```

### 2. Placer l'image en production

**Pour Netlify (portail airlines) :**
- L'image doit être dans `airline-portal/public/images/`
- Netlify va automatiquement l'inclure lors du build

**Pour le dashboard (si hébergé) :**
- L'image doit être dans `dashboard/public/images/`
- Sera copiée automatiquement dans le build

## 🎯 Chemin d'accès dans le code

```typescript
// Les 3 pages utilisent maintenant :
style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}

// Avec overlay :
<div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
```

## ⚠️ Important

- L'image doit s'appeler **exactement** `airport-bg.jpg`
- Elle doit être dans le dossier `public/images/`
- Format recommandé : JPG (meilleure compression pour photos)
- Taille optimale : 1920x1080px ou plus
- Poids : < 500KB pour de bonnes performances

## 🔧 Personnalisation (optionnel)

Si vous voulez ajuster l'overlay :

```tsx
// Plus sombre (70% noir)
<div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

// Plus clair (30% noir)
<div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>

// Sans flou
<div className="absolute inset-0 bg-black/50"></div>

// Flou plus fort
<div className="absolute inset-0 bg-black/50 backdrop-blur-md"></div>
```

---

**Créé le** : 11 décembre 2025  
**Auteur** : Martin Bitha Moponda
