# 🚀 Guide Complet: Implémentation du Scan d'Embarquement

## 📚 Table des Matières
1. [Vue d'Ensemble](#-vue-densemble)
2. [Architecture](#-architecture)
3. [Installation Étape par Étape](#-installation-étape-par-étape)
4. [Intégration Mobile](#-intégration-mobile)
5. [Tests](#-tests)
6. [Dépannage](#-dépannage)

---

## 🎯 Vue d'Ensemble

Ce guide vous montre comment implémenter le **scan et la confirmation d'embarquement des passagers** en adaptant le pattern du **RushScreen**.

### Avant (État Actuel)
- ❌ Pas de système de confirmation d'embarquement
- ❌ Les passagers sont vérifiés au check-in seulement

### Après (Objectif)
- ✅ Scan du boarding pass → Confirmation immédiate
- ✅ Historique des embarquements en temps réel
- ✅ Synchronisation serveur asynchrone
- ✅ Gestion hors ligne

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Mobile (React Native)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐        ┌──────────────────────┐       │
│  │  BoardingScreen      │        │  BoardingService     │       │
│  │  ├─ Scanner          │───────▶│  ├─ confirmBoarding  │       │
│  │  ├─ Validation       │        │  ├─ syncToServer     │       │
│  │  └─ Confirmation     │        │  └─ getHistory       │       │
│  └──────────────────────┘        └──────────────────────┘       │
│           │                                │                      │
│           ▼                                ▼                      │
│  ┌──────────────────────┐        ┌──────────────────────┐       │
│  │  raw_scans (SQLite)  │        │  api.service         │       │
│  │  ├─ id               │        │  └─ POST /boarding   │       │
│  │  ├─ status_boarding  │        │                      │       │
│  │  ├─ boarding_at      │        └──────────────────────┘       │
│  │  └─ boarding_by      │               │                        │
│  └──────────────────────┘               ▼                        │
│                                  ┌──────────────────────┐        │
│                                  │  API Backend (Node)  │        │
│                                  ├─ POST /boarding      │        │
│                                  ├─ GET /stats          │        │
│                                  └─ GET /history        │        │
│                                         │                         │
└─────────────────────────────────────────┼─────────────────────────┘
                                          │
                                          ▼
                                  ┌──────────────────────┐
                                  │  Supabase (PostgreSQL)
                                  ├─ passengers          │
                                  ├─ boarding_confirmations
                                  └─ audit_logs          │
                                  └──────────────────────┘
```

---

## 📋 Installation Étape par Étape

### Étape 1: Migrer la Base de Données

#### 1.1 Appliquer les migrations SQL
```bash
# Lancer la migration pour créer les tables
psql -U postgres -d bfs_database -f migrations/001_add_boarding_confirmations.sql
```

#### 1.2 Vérifier les tables créées
```sql
-- Vérifie les tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'boarding%';
```

**Résultat attendu:**
- `boarding_confirmations`
- `boarding_sessions`
- Colonnes ajoutées à `raw_scans`

---

### Étape 2: Installer les Types TypeScript

1. **Copier le fichier de types:**
```bash
cp src/types/boarding-new.types.ts src/types/boarding-enhanced.types.ts
```

2. **Mettre à jour le fichier d'export `src/types/index.ts`:**
```typescript
export * from './boarding-enhanced.types';
```

---

### Étape 3: Installer le Service de Boarding

1. **Copier le service:**
```bash
cp src/services/boarding.service.ts src/services/boarding.service.ts
```

2. **Mettre à jour `src/services/index.ts`:**
```typescript
export { boardingService } from './boarding.service';
```

3. **Vérifier les imports:**
```bash
# Assurez-vous que tous les imports existent:
- generateUUID from '../utils/uuid.util'
- logAudit from '../utils/audit.util'
- databaseService from './database.service'
```

---

### Étape 4: Ajouter le Composant UI

1. **Copier le composant:**
```bash
cp src/components/BoardingConfirmationCard.tsx src/components/
```

2. **Mettre à jour `src/components/index.ts`:**
```typescript
export { BoardingConfirmationCard } from './BoardingConfirmationCard';
```

---

### Étape 5: Créer l'API Backend

1. **Copier les routes:**
```bash
cp api/src/routes/boarding.ts api/src/routes/
```

2. **Enregistrer dans `api/src/index.ts` ou `api/src/app.ts`:**
```typescript
import boardingRoutes from './routes/boarding';

// ... dans l'app setup
app.use('/api/v1/boarding', boardingRoutes);
```

3. **Vérifier les dépendances:**
```bash
# Assurez-vous que vous avez:
npm list express zod supabase
```

---

### Étape 6: Modifier l'Écran de Boarding

**Fichier:** `src/screens/BoardingScreen.tsx`

#### 6.1 Ajouter les imports
```typescript
import { boardingService } from '../services/boarding.service';
import { 
  BoardingConfirmation, 
  BoardingConfirmationResponse 
} from '../types/boarding-enhanced.types';
import { BoardingConfirmationCard } from '../components/BoardingConfirmationCard';
```

#### 6.2 Ajouter les états
```typescript
const [confirmationDetails, setConfirmationDetails] = useState<BoardingConfirmation | null>(null);
const [recentBoardings, setRecentBoardings] = useState<BoardingConfirmation[]>([]);
const [showManualEntry, setShowManualEntry] = useState(false);
const [manualFlightNumber, setManualFlightNumber] = useState('');
```

#### 6.3 Remplacer la fonction handleBarCodeScanned
**Voir le fichier détaillé dans `BOARDING_IMPLEMENTATION_EXAMPLE.tsx`**

#### 6.4 Ajouter l'affichage de confirmation
Dans le JSX, remplacer la section d'affichage actuelle:

```tsx
{!showScanner && confirmationDetails && (
  <BoardingConfirmationCard
    confirmation={confirmationDetails}
    onScanAgain={handleScanAgain}
    onViewHistory={() => {
      // Ouvrir l'historique
    }}
  />
)}
```

---

## 📱 Intégration Mobile

### Flux Utilisateur Complet

```
1. Utilisateur ouvre BoardingScreen
    ▼
2. Scanner prêt - Instruction affichée
    ▼
3. Scanner le boarding pass ✅
    ▼
4. Validation:
   - ✅ Check-in fait?
   - ✅ Vol valide?
   - ✅ Pas déjà embarqué?
    ▼
5. CONFIRMATION AFFICHÉE:
   - Nom du passager
   - Numéro du vol
   - Siège (si disponible)
   - Porte (si disponible)
    ▼
6. Sync asynchrone:
   - Envoyer au serveur
   - Mettre à jour le statut
   - Logging d'audit
    ▼
7. Bouton "Scanner Suivant" pour répéter
```

### Gestion des Erreurs

```typescript
const errors = {
  'not_checked_in': '❌ Passager pas au check-in',
  'already_boarded': '⚠️ Déjà embarqué',
  'invalid_flight': '❌ Vol invalide',
  'wrong_airport': '❌ Mauvais aéroport',
  'scan_not_found': '❌ Scan introuvable'
};
```

---

## 🧪 Tests

### Test 1: Migration DB
```bash
# Connectez-vous à la DB
psql -U postgres -d bfs_database

# Vérifiez les tables
\dt boarding*
\d boarding_confirmations

# Vérifiez les index
\di boarding*
```

**✅ Expected:** Toutes les tables créées avec les index

---

### Test 2: Service Boarding (Côté Mobile)

```typescript
// Dans BoardingScreen ou un composant de test
import { boardingService } from '../services/boarding.service';

async function testBoarding() {
  try {
    const result = await boardingService.confirmBoarding(
      'test-raw-data-123',
      'ET456',
      'A12',
      '2'
    );
    console.log('✅ Boarding confirmé:', result);
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}
```

---

### Test 3: API Backend

```bash
# Test avec cURL
curl -X POST http://localhost:3000/api/v1/boarding/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "confirmationId": "uuid-here",
    "flightNumber": "ET456",
    "passengerId": "passenger-uuid",
    "seatNumber": "A12",
    "gate": "2",
    "boardedAt": "2024-01-19T10:30:00Z",
    "boardedBy": "user-uuid",
    "airportCode": "AAE"
  }'
```

**✅ Expected:** 
```json
{
  "success": true,
  "message": "Embarquement confirmé avec succès",
  "confirmationId": "uuid",
  "boardedAt": "2024-01-19T10:30:00Z",
  "syncStatus": "synced"
}
```

---

### Test 4: Hors Ligne

1. **Déconnecter le réseau** (Mode Avion)
2. **Scanner le boarding pass**
3. **Vérifier:** Confirmation affichée localement
4. **Vérifier:** Sync status = 'pending'
5. **Reconnecter le réseau**
6. **Vérifier:** Sync status devient 'synced'

---

## 🔧 Dépannage

### Problème: "Table boarding_confirmations not found"

**Cause:** La migration n'a pas été appliquée

**Solution:**
```bash
# 1. Vérifiez si la table existe
psql -U postgres -d bfs_database -c "\dt boarding_confirmations"

# 2. Appliquez la migration
psql -U postgres -d bfs_database -f migrations/001_add_boarding_confirmations.sql

# 3. Vérifiez à nouveau
psql -U postgres -d bfs_database -c "\dt boarding_confirmations"
```

---

### Problème: "Service not found"

**Cause:** Le fichier `boarding.service.ts` n'est pas au bon endroit ou les imports sont mauvais

**Solution:**
```bash
# 1. Vérifiez le chemin
ls -la src/services/boarding.service.ts

# 2. Vérifiez l'export
grep -n "export.*boardingService" src/services/index.ts

# 3. Vérifiez les imports dans le fichier
grep -n "import.*from" src/services/boarding.service.ts
```

---

### Problème: "confirmBoarding is not a function"

**Cause:** Le service n'a pas été importé correctement

**Solution:**
```typescript
// ✅ Correct
import { boardingService } from '../services';

// ❌ Incorrect
import { boardingService } from '../services/boarding.service';
```

---

### Problème: Confirmation n'apparaît pas après scan

**Cause:** Possible erreur dans le flow de scan ou pas assez de validations

**Solution:**
1. Vérifiez le console.log des logs
2. Vérifiez que le scan est bien enregistré dans `raw_scans`
3. Vérifiez que le check-in est marqué (`status_checkin = 1`)
4. Retest avec un boarding pass valide du jour

---

## 📊 Monitoring & Statistiques

### Récupérer les stats d'embarquement

```typescript
// Depuis l'API
const stats = await apiService.get(`/api/v1/boarding/stats/ET456`);
console.log(stats);
// {
//   flightNumber: 'ET456',
//   totalBoarded: 150,
//   syncedCount: 150,
//   failedCount: 0,
//   pendingCount: 0
// }
```

### Historique d'embarquement

```typescript
// Depuis le service mobile
const history = await boardingService.getRecentBoardings(20);
history.forEach(boarding => {
  console.log(`${boarding.passagerName} - ${boarding.flightNumber} @ ${boarding.boardedAt}`);
});
```

---

## 🎓 Bonnes Pratiques

### ✅ À Faire

- [ ] Valider les données côté client ET serveur
- [ ] Enregistrer tous les embarquements (audit trail)
- [ ] Gérer les erreurs de synchronisation
- [ ] Afficher le statut de sync à l'utilisateur
- [ ] Tester en mode hors ligne
- [ ] Tester avec plusieurs utilisateurs
- [ ] Monitorer les erreurs en production

### ❌ À Éviter

- ❌ Conserver les mots de passe en cache
- ❌ Envoyer les données sensibles sans chiffrement
- ❌ Bloquer l'UI pendant la sync
- ❌ Supprimer les confirmations locales avant sync réussie
- ❌ Faire confiance uniquement aux timestamps clients

---

## 📝 Checklist d'Implémentation

- [ ] Migration SQL appliquée
- [ ] Types TypeScript copiés et importés
- [ ] Service boarding.service.ts implémenté
- [ ] Composant BoardingConfirmationCard copié
- [ ] Routes API /boarding/confirm créées
- [ ] BoardingScreen modifié pour utiliser le service
- [ ] Tests DB réussis
- [ ] Tests mobile réussis
- [ ] Tests API réussis
- [ ] Tests hors ligne réussis
- [ ] Documentation mise à jour
- [ ] Lint et format appliqués

---

## 🚀 Prochaines Étapes

Après l'implémentation:

1. **Ajouter les graphiques** d'embarquement en temps réel
2. **Notifications push** pour les passagers
3. **Liste d'embarquement finale** (final boarding call)
4. **Intégration avec le système de portes** (automate)
5. **Rapports d'embarquement** par vol

---

## 📞 Support

Pour des questions:
1. Consultez les logs: `console.log` en mobile, `console.error` en API
2. Vérifiez la DB: `SELECT * FROM boarding_confirmations LIMIT 5`
3. Testez l'API avec cURL
4. Testez la sync avec Network tab en DevTools

---

**Version:** 1.0  
**Dernière mise à jour:** 2024-01-19  
**Auteur:** AI Assistant
