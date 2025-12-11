# Portail Compagnies Aériennes - BFS

Portail web pour les compagnies aériennes internationales permettant l'upload de fichiers BIRS et le suivi de l'historique.

## 🎯 Fonctionnalités

### ✅ Pour les compagnies aériennes
- **Authentification** : Inscription et connexion sécurisée
- **Upload BIRS** : Téléchargement de fichiers (TXT, CSV, TSV, XLSX)
- **Historique** : Consultation de tous les uploads (lecture seule)
- **Pas de réconciliation** : Réservée au dashboard superviseur

### ❌ Restrictions
- Pas d'accès à la réconciliation des bagages
- Pas de modification des données après upload
- Vue lecture seule de l'historique

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm ou yarn

### Installation locale

```bash
cd airline-portal
npm install
```

### Configuration

Créez un fichier `.env` :

```bash
cp .env.example .env
```

Modifiez `.env` pour pointer vers votre API :

```env
VITE_API_URL=http://localhost:3000
```

### Démarrage en développement

```bash
npm run dev
```

Le portail sera accessible sur `http://localhost:3002`

### Build pour production

```bash
npm run build
```

Les fichiers de production seront dans le dossier `dist/`

## 📦 Déploiement

### Netlify (recommandé)

1. Connectez votre repo GitHub à Netlify
2. Configurez le build :
   - **Build command** : `npm run build`
   - **Publish directory** : `dist`
   - **Base directory** : `airline-portal`
3. Ajoutez les variables d'environnement :
   - `VITE_API_URL=https://votre-api.onrender.com`

### Vercel

```bash
cd airline-portal
vercel
```

## 🔐 Première utilisation

### Inscription d'une compagnie

1. Accédez à `/signup`
2. Remplissez le formulaire :
   - **Nom** : Ethiopian Airlines
   - **Code IATA** : ET (2 lettres)
   - **Email** : contact@ethiopianairlines.com
   - **Mot de passe** : minimum 6 caractères
3. Cliquez sur "S'inscrire"

### Upload d'un fichier BIRS

1. Connectez-vous
2. Allez sur "Upload BIRS"
3. Sélectionnez un fichier (formats acceptés : TXT, CSV, TSV, XLSX)
4. Cliquez sur "Uploader"
5. Attendez la confirmation

### Consultation de l'historique

1. Allez sur "Historique"
2. Visualisez tous vos uploads
3. Consultez les statistiques de chaque vol

## 🔗 API Endpoints utilisés

- `POST /api/v1/airlines/signup` - Inscription
- `POST /api/v1/airlines/login` - Connexion
- `GET /api/v1/airlines/me` - Profil compagnie
- `POST /api/v1/birs/upload` - Upload fichier BIRS
- `GET /api/v1/birs/history` - Historique des uploads

## 🏗️ Structure du projet

```
airline-portal/
├── src/
│   ├── components/
│   │   ├── Layout.tsx        # Layout principal
│   │   └── PrivateRoute.tsx  # Protection des routes
│   ├── contexts/
│   │   └── AuthContext.tsx   # Gestion authentification
│   ├── pages/
│   │   ├── Login.tsx         # Page de connexion
│   │   ├── Signup.tsx        # Page d'inscription
│   │   ├── Dashboard.tsx     # Upload BIRS
│   │   └── History.tsx       # Historique (lecture seule)
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── README.md
```

## 🎨 Design

- **Framework CSS** : Tailwind CSS
- **Icônes** : Lucide React
- **Thème** : Bleu professionnel
- **Responsive** : Mobile-first

## 📝 Notes importantes

### Sécurité
- Mots de passe hashés avec bcrypt (10 rounds)
- Tokens JWT avec expiration 7 jours
- Validation des formats de fichiers côté client et serveur

### Formats BIRS acceptés
- **TXT** : Format Shipping (recommandé)
- **CSV** : Valeurs séparées par virgules
- **TSV** : Valeurs séparées par tabulations
- **XLSX** : Excel (extraction à améliorer)

### Différence avec le dashboard superviseur
Le portail compagnies est **read-only** pour l'historique. Seul le dashboard superviseur peut :
- Réconcilier les bagages
- Déclarer les bagages en RUSH
- Modifier les statuts
- Générer des rapports avancés

## 🐛 Troubleshooting

### Le portail ne se connecte pas à l'API

Vérifiez que :
1. L'API est démarrée
2. `VITE_API_URL` est correct dans `.env`
3. CORS est activé sur l'API

### Erreur lors de l'upload

Vérifiez que :
1. Le fichier est dans un format accepté
2. La compagnie est bien inscrite
3. Le token JWT est valide

## 📞 Support

Pour toute question, contactez l'équipe BFS à l'aéroport de Kinshasa.

## 🔄 Mises à jour

Le portail est automatiquement mis à jour lors des push sur la branche `main` si déployé sur Netlify/Vercel.
