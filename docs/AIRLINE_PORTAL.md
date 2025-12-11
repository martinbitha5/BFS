# 🛫 Portail Compagnies Aériennes - Documentation Complète

## 📋 Vue d'ensemble

Le **Portail Compagnies Aériennes** est une application web séparée permettant aux compagnies aériennes internationales de :
- ✅ **S'inscrire et se connecter** de manière sécurisée
- ✅ **Uploader des fichiers BIRS** (Baggage Irregularity Report System)
- ✅ **Consulter l'historique** de leurs uploads en mode lecture seule
- ❌ **PAS de réconciliation** - réservée au dashboard superviseur

## 🎯 Différences avec le Dashboard Superviseur

| Fonctionnalité | Portail Compagnies | Dashboard Superviseur |
|----------------|--------------------|-----------------------|
| Authentification | Login/Signup propre | Auth Supabase |
| Upload BIRS | ✅ Oui | ✅ Oui |
| Historique BIRS | ✅ Lecture seule | ✅ Lecture/Écriture |
| Réconciliation | ❌ Non | ✅ Oui |
| Déclaration RUSH | ❌ Non | ✅ Oui |
| Modification statuts | ❌ Non | ✅ Oui |
| Statistiques avancées | ❌ Non | ✅ Oui |

## 🏗️ Architecture

### Frontend (airline-portal/)
```
airline-portal/
├── src/
│   ├── components/
│   │   ├── Layout.tsx              # Sidebar + Header
│   │   └── PrivateRoute.tsx        # Protection routes
│   ├── contexts/
│   │   └── AuthContext.tsx         # Auth compagnies
│   ├── pages/
│   │   ├── Login.tsx               # Connexion
│   │   ├── Signup.tsx              # Inscription
│   │   ├── Dashboard.tsx           # Upload BIRS
│   │   └── History.tsx             # Historique (readonly)
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

### Backend (api/src/routes/)
```
api/src/routes/
├── airlines.routes.ts              # Auth compagnies (signup/login)
└── birs-history.routes.ts          # Historique BIRS readonly
```

### Base de données
```sql
-- Table airlines
CREATE TABLE airlines (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(2) UNIQUE NOT NULL,  -- Code IATA (ET, TK, AF...)
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,   -- Hashé bcrypt
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔐 Système d'authentification

### Inscription (POST /api/v1/airlines/signup)
```json
{
  "name": "Ethiopian Airlines",
  "code": "ET",
  "email": "contact@ethiopianairlines.com",
  "password": "securePassword123"
}
```

**Réponse :**
```json
{
  "success": true,
  "airline": {
    "id": "uuid",
    "name": "Ethiopian Airlines",
    "code": "ET",
    "email": "contact@ethiopianairlines.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Connexion (POST /api/v1/airlines/login)
```json
{
  "email": "contact@ethiopianairlines.com",
  "password": "securePassword123"
}
```

### Token JWT
- **Durée** : 7 jours
- **Contenu** : `{ id, code, email }`
- **Stockage** : localStorage (`airline_token`)

## 📤 Upload de fichiers BIRS

### Endpoint : POST /api/v1/birs/upload

**FormData :**
```javascript
formData.append('file', fileObject);
formData.append('airline_code', 'ET');
formData.append('airline_name', 'Ethiopian Airlines');
```

**Formats acceptés :**
- `.txt` - Format Shipping (recommandé)
- `.csv` - Valeurs séparées virgules
- `.tsv` - Valeurs séparées tabulations
- `.xlsx` - Excel (extraction basique)

**Réponse :**
```json
{
  "success": true,
  "message": "Fichier traité avec succès",
  "processedCount": 357,
  "report": {
    "id": "uuid",
    "flight_number": "TK0540",
    "total_baggages": 357
  }
}
```

## 📊 Historique (GET /api/v1/birs/history?airline_code=ET)

**Réponse :**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "uuid",
      "flight_number": "TK0540",
      "airline_code": "TK",
      "airline_name": "Turkish Airlines",
      "uploaded_at": "2025-12-11T13:00:00Z",
      "file_name": "TK0540_2025-12-11.txt",
      "total_baggages": 357,
      "reconciled_count": 0,
      "missing_count": 357,
      "status": "À vérifier (0%)"
    }
  ]
}
```

## 🎨 Interface utilisateur

### Page Login
- Fond dégradé bleu
- Icône avion
- Email + mot de passe
- Lien vers inscription

### Page Signup
- Formulaire complet :
  - Nom compagnie
  - Code IATA (2 lettres)
  - Email
  - Mot de passe (confirmation)
- Validation côté client

### Dashboard (Upload)
- Zone drag & drop
- Aperçu fichier sélectionné
- Bouton upload avec loader
- Messages succès/erreur
- Info-box sur BIRS

### Historique
- Table avec filtres
- Colonnes : Vol, Date, Compagnie, Route, Bagages, Statut
- Badge de statut coloré
- Bouton actualiser
- ⚠️ Avertissement "Mode lecture seule"

## 🚀 Déploiement

### 1. Backend (API)
Les routes sont déjà intégrées dans l'API existante :
```typescript
app.use('/api/v1/airlines', airlinesRoutes);
app.use('/api/v1/birs/history', birsHistoryRoutes);
```

### 2. Base de données
Exécuter la migration :
```bash
psql -U postgres -d bfs_database -f migrations/create-airlines-table.sql
```

### 3. Frontend (Netlify)

**Méthode 1 : Via interface Netlify**
1. New site from Git
2. Sélectionner le repo
3. Configuration :
   - **Base directory** : `airline-portal`
   - **Build command** : `npm run build`
   - **Publish directory** : `airline-portal/dist`
4. Variables d'environnement :
   - `VITE_API_URL` = `https://votre-api.onrender.com`

**Méthode 2 : Via Netlify CLI**
```bash
cd airline-portal
npm install
npm run build
netlify deploy --prod
```

### 4. Variables d'environnement

**API (.env)** :
```env
JWT_SECRET=votre-secret-super-securise-changez-moi
```

**Frontend (.env)** :
```env
VITE_API_URL=https://bfs-api.onrender.com
```

## 📝 Workflow complet

### Inscription compagnie
1. Compagnie accède à `https://airlines.bfs.com/signup`
2. Remplit formulaire (nom, code IATA, email, password)
3. Backend hash le password (bcrypt)
4. Création dans table `airlines`
5. Génération token JWT
6. Redirection vers Dashboard

### Upload BIRS
1. Compagnie sélectionne fichier local
2. Validation format côté client
3. Upload via FormData
4. Backend parse le fichier
5. Création entrées `international_baggages`
6. Création entrée `birs_international`
7. Message de confirmation

### Consultation historique
1. Compagnie accède à `/history`
2. Récupération uploads via `airline_code`
3. Calcul statistiques (réconciliés/manquants)
4. Affichage tableau readonly
5. Pas d'actions possibles

### Réconciliation (Dashboard Superviseur uniquement)
1. Superviseur ouvre dashboard
2. Page BIRS International
3. Compare fichier BIRS vs scans arrivée
4. Marque bagages réconciliés/RUSH
5. Génère rapports

## 🔒 Sécurité

### Authentification
- Passwords hashés bcrypt (10 rounds)
- Tokens JWT signés
- Expiration 7 jours
- Validation email unique

### Validation fichiers
- Extension whitelist
- Taille max (via API)
- Parsing sécurisé
- Pas d'exécution code

### Isolation données
- Chaque compagnie voit uniquement ses uploads
- Filtrage par `airline_code`
- Pas d'accès données superviseur

## 🛠️ Maintenance

### Ajout nouvelle compagnie
Option 1 : Auto-inscription (recommandé)
Option 2 : Création manuelle en base

### Reset password
À implémenter : endpoint `/api/v1/airlines/reset-password`

### Logs
Tous les uploads sont loggés dans `birs_international.uploaded_at`

## 📞 Support

### Pour les compagnies
- Email : support@bfs-kinshasa.com
- Guide utilisateur : README.md du portail

### Pour les superviseurs
- Dashboard principal
- Documentation technique complète

## 🔄 Évolutions futures

### Phase 2 (optionnel)
- [ ] Reset password par email
- [ ] API keys pour upload automatisé
- [ ] Webhooks notifications
- [ ] Export PDF historique
- [ ] Multi-utilisateurs par compagnie
- [ ] Dashboard statistiques compagnie
- [ ] Upload par FTP/SFTP

### Intégrations possibles
- [ ] API SITA (standard aviation)
- [ ] WorldTracer (bagages perdus)
- [ ] IATA BagMessage standard

## ✅ Checklist de déploiement

**Backend :**
- [ ] Migration SQL exécutée
- [ ] Routes airlines ajoutées
- [ ] JWT_SECRET configuré
- [ ] bcrypt et jsonwebtoken installés
- [ ] API redéployée

**Frontend :**
- [ ] `npm install` exécuté
- [ ] `.env` configuré
- [ ] Build testé localement
- [ ] Déployé sur Netlify
- [ ] VITE_API_URL pointant vers API production

**Tests :**
- [ ] Signup fonctionne
- [ ] Login fonctionne
- [ ] Upload BIRS fonctionne
- [ ] Historique s'affiche
- [ ] Pas d'erreurs console

## 🎓 Formation utilisateurs

### Pour Ethiopian Airlines (exemple)
1. Créer compte : ET, contact@et.com
2. Télécharger BIRS du vol ET0080
3. Vérifier historique
4. Note : Réconciliation faite par superviseur FIH

---

**Créé le** : 11 décembre 2025  
**Dernière mise à jour** : 11 décembre 2025  
**Développeur** : Martin Bitha Moponda
