# Plan d'Implémentation: Scan d'Embarquement (Boarding Confirmation)

## 📋 Analyse Comparative: RushScreen vs BoardingScreen

### RushScreen - Flux Actuel
**Objectif:** Déclarer un bagage comme prioritaire (RUSH)

**Flux:**
1. Scanner l'étiquette du bagage via caméra
2. Afficher le numéro scanné
3. Remplir un formulaire (Raison + Prochain vol optionnel)
4. Envoyer vers API `/api/v1/rush/declare`

**Caractéristiques clés:**
- ✅ Interface intuitive avec 2 étapes: scanner puis formulaire
- ✅ Gestion des permissions caméra
- ✅ Toast notifications (succès/erreur)
- ✅ Réflectance visuelle (bannière rouge RUSH, sons)
- ✅ Données minimales requises
- ✅ Bouton pour scanner à nouveau facilement

### BoardingScreen - Flux Actuel
**Objectif:** Enregistrer l'embarquement d'un passager

**Flux:**
1. Scanner le boarding pass du passager
2. Parser les données (PNR, nom, vol, route)
3. Valider le vol pour la date/aéroport
4. Vérifier le check-in antérieur
5. Mettre à jour le statut boarding dans `raw_scans`
6. Synchroniser avec le serveur
7. Afficher confirmation

**Caractéristiques clés:**
- ✅ Validation multi-étapes (vol, check-in, doublon)
- ✅ Parsing automatique du boarding pass
- ✅ Enregistrement dans la base de données locale
- ✅ Synchronisation serveur asynchrone
- ✅ Affichage des détails du passager après succès

---

## 🎯 Architecture Proposée pour le Scan d'Embarquement

### Option 1: Intégrer dans BoardingScreen (Recommandée ⭐)
**Avantage:** Les données sont déjà correctement parsées et validées

**Modifications requises:**
```
BoardingScreen.tsx
├── État: scanned, processing, showScanner, boardingStatus
├── Scanner le boarding pass
├── Parser les données (déjà fait)
├── Valider le vol (déjà fait)
├── Créer/Mettre à jour raw_scans avec statut boarding
└── ✅ Déjà retourne l'état de confirmation

AJOUTER:
├── Améliorer l'affichage du résultat
├── Ajouter un champ de saisie manuelle en fallback
└── Historique des embarquements récents
```

### Option 2: Créer BoardingScanScreen Séparé (Alternative)
**Avantage:** Écran dédié plus simple (comme RushScreen)

**À créer:**
```
BoardingScanScreen.tsx
├── Scanner le boarding pass OR numéro de passager
├── Afficher le détail extrait
├── Confirmer (bouton simple, pas de formulaire)
└── Marquer comme embarqué
```

---

## 📱 Implémentation Détaillée: Option 1 (Recommandée)

### 1. Type de Données - Amélioration

**Fichier:** `src/types/boarding.types.ts`

```typescript
export interface BoardingStatus {
  id: string;
  passengerId: string;
  boarded: boolean;
  boardedAt?: string;
  boardedBy?: string;
  gate?: string;
  seatNumber?: string;           // ✨ NOUVEAU
  flightNumber?: string;          // ✨ NOUVEAU
  confirmationCode?: string;      // ✨ NOUVEAU
  synced: boolean;
  createdAt: string;
}

export interface BoardingConfirmation {
  id: string;
  scanId: string;
  scannedAt: string;
  passengerId: string;
  passagerName: string;
  flightNumber: string;
  seatNumber?: string;
  boardedAt: string;
  boardedBy: string;
  syncStatus: 'pending' | 'synced' | 'failed';
}
```

### 2. Service - Ajouter les Fonctions de Boarding

**Fichier:** `src/services/raw-scan.service.ts`

**AJOUTER une méthode:**
```typescript
/**
 * Marquer un passager comme embarqué
 */
async confirmBoarding(
  rawData: string,
  userId: string,
  airportCode: string,
  gate?: string
): Promise<BoardingConfirmation> {
  try {
    // 1. Trouver le scan existant
    const existingScan = await this.findByRawData(rawData);
    if (!existingScan || !existingScan.statusCheckin) {
      throw new Error('Passager non trouvé ou pas de check-in enregistré');
    }

    // 2. Vérifier que pas déjà embarqué
    if (existingScan.statusBoarding) {
      throw new Error('Passager déjà embarqué');
    }

    // 3. Mettre à jour le statut boarding
    const stmt = await this.db?.prepare(
      `UPDATE raw_scans 
       SET status_boarding = 1, 
           boarding_at = ?,
           boarding_by = ?,
           sync_status = 'pending'
       WHERE id = ?`
    );
    
    const now = new Date().toISOString();
    await stmt?.execute([now, userId, existingScan.id]);

    // 4. Créer l'enregistrement de confirmation
    const confirmationId = generateUUID();
    const confirmStmt = await this.db?.prepare(
      `INSERT INTO boarding_confirmations 
       (id, scan_id, scanned_at, passager_id, flightNumber, gate, boarded_at, boarded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    await confirmStmt?.execute([
      confirmationId,
      existingScan.id,
      new Date().toISOString(),
      existingScan.passengerId,
      existingScan.flightNumber || 'TBD',
      gate || null,
      now,
      userId
    ]);

    return {
      id: confirmationId,
      scanId: existingScan.id,
      scannedAt: new Date().toISOString(),
      passengerId: existingScan.passengerId,
      passagerName: existingScan.passengerName || 'N/A',
      flightNumber: existingScan.flightNumber || 'N/A',
      seatNumber: existingScan.seatNumber,
      boardedAt: now,
      boardedBy: userId,
      syncStatus: 'pending'
    };
  } catch (error) {
    console.error('[BOARDING] Erreur confirmation:', error);
    throw error;
  }
}
```

### 3. Service API - Endpoint Boarding

**Fichier:** `api/src/routes/boarding.ts` (Créer si n'existe pas)

```typescript
// POST /api/v1/boarding/confirm
router.post('/confirm', async (req, res) => {
  const { rawData, userId, airportCode, gate } = req.body;

  try {
    // 1. Trouver le scan dans raw_scans
    const scan = await db.query(
      `SELECT * FROM raw_scans WHERE raw_data = ?`,
      [rawData]
    );

    if (!scan || !scan.status_checkin) {
      return res.status(400).json({
        error: 'Passager non trouvé ou pas de check-in'
      });
    }

    // 2. Vérifier doublon
    if (scan.status_boarding) {
      return res.status(400).json({
        error: 'Passager déjà embarqué'
      });
    }

    // 3. Mettre à jour raw_scans
    await db.query(
      `UPDATE raw_scans 
       SET status_boarding = 1, boarding_at = NOW(), boarding_by = ?
       WHERE id = ?`,
      [userId, scan.id]
    );

    // 4. Enregistrer l'action
    const confirmationId = uuid();
    await db.query(
      `INSERT INTO boarding_confirmations (id, scan_id, passager_id, gate, boarded_at, boarded_by)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [confirmationId, scan.id, scan.passager_id, gate || null, userId]
    );

    // 5. Envoyer vers Supabase passengers table si sync requis
    await supabase.from('passengers').update({
      boarded_at: new Date().toISOString(),
      boarded_by: userId,
      gate: gate || null,
      status: 'boarded'
    }).eq('id', scan.passager_id);

    res.json({
      success: true,
      confirmationId,
      message: 'Embarquement confirmé',
      boardedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[BOARDING API] Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 4. Interface Mobile - Améliorer BoardingScreen

**Fichier:** `src/screens/BoardingScreen.tsx`

**AJOUTER dans le composant:**

```typescript
// État supplémentaire
const [confirmationDetails, setConfirmationDetails] = useState<BoardingConfirmation | null>(null);
const [recentBoardings, setRecentBoardings] = useState<BoardingConfirmation[]>([]);
const [showManualEntry, setShowManualEntry] = useState(false);
const [manualPassengerId, setManualPassengerId] = useState('');

// Fonction améliorée de confirmation
const handleBoardingConfirm = async (data: string, passenger: Passenger) => {
  try {
    const user = await authServiceInstance.getCurrentUser();
    if (!user) throw new Error('Utilisateur non connecté');

    // Confirmation locale
    const confirmation: BoardingConfirmation = {
      id: generateUUID(),
      scanId: passenger.id,
      scannedAt: new Date().toISOString(),
      passengerId: passenger.id,
      passagerName: passenger.fullName,
      flightNumber: passenger.flightNumber,
      seatNumber: passenger.seat,
      boardedAt: new Date().toISOString(),
      boardedBy: user.id,
      syncStatus: 'pending'
    };

    setConfirmationDetails(confirmation);
    setRecentBoardings([confirmation, ...recentBoardings.slice(0, 9)]);

    // Sync serveur asynchrone
    try {
      await apiService.post('/api/v1/boarding/confirm', {
        rawData: data,
        userId: user.id,
        airportCode: user.airportCode
      });

      setConfirmationDetails(prev => 
        prev ? { ...prev, syncStatus: 'synced' } : null
      );
    } catch (syncError) {
      console.warn('[BOARDING] Erreur sync:', syncError);
      setConfirmationDetails(prev => 
        prev ? { ...prev, syncStatus: 'failed' } : null
      );
    }
  } catch (error) {
    await playErrorSound();
    Alert.alert('Erreur', error.message);
  }
};
```

**Vue Confirmation Améliorée:**
```tsx
{!showScanner && confirmationDetails && (
  <ScrollView style={styles.confirmationContainer}>
    <Card style={styles.confirmationCard}>
      {/* En-tête succès */}
      <View style={styles.successHeader}>
        <Ionicons name="checkmark-circle" size={64} color={colors.success.main} />
        <Text style={[styles.successTitle, { color: colors.text.primary }]}>
          Embarquement Confirmé
        </Text>
      </View>

      {/* Détails passager */}
      <View style={[styles.detail, { borderBottomColor: colors.border.light }]}>
        <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Passager</Text>
        <Text style={[styles.detailValue, { color: colors.text.primary }]}>
          {confirmationDetails.passagerName}
        </Text>
      </View>

      <View style={[styles.detail, { borderBottomColor: colors.border.light }]}>
        <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Vol</Text>
        <Text style={[styles.detailValue, { color: colors.primary.main }]}>
          {confirmationDetails.flightNumber}
        </Text>
      </View>

      {confirmationDetails.seatNumber && (
        <View style={[styles.detail, { borderBottomColor: colors.border.light }]}>
          <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Siège</Text>
          <Text style={[styles.detailValue, { color: colors.text.primary }]}>
            {confirmationDetails.seatNumber}
          </Text>
        </View>
      )}

      <View style={[styles.detail, { borderBottomColor: colors.border.light }]}>
        <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Heure</Text>
        <Text style={[styles.detailValue, { color: colors.text.primary }]}>
          {new Date(confirmationDetails.boardedAt).toLocaleTimeString()}
        </Text>
      </View>

      {/* Statut sync */}
      <View style={[styles.syncStatus, { 
        backgroundColor: confirmationDetails.syncStatus === 'synced' 
          ? colors.success.light 
          : confirmationDetails.syncStatus === 'failed'
          ? colors.error.light
          : colors.warning.light
      }]}>
        <Ionicons 
          name={confirmationDetails.syncStatus === 'synced' ? 'cloud-done' : 'cloud-offline'}
          size={20}
          color={confirmationDetails.syncStatus === 'synced' ? colors.success.main : colors.warning.main}
        />
        <Text style={{ color: colors.text.secondary, fontSize: FontSizes.sm }}>
          {confirmationDetails.syncStatus === 'synced' 
            ? 'Synchronisé'
            : confirmationDetails.syncStatus === 'failed'
            ? 'Erreur sync'
            : 'En cours...'}
        </Text>
      </View>

      {/* Boutons */}
      <TouchableOpacity
        style={[styles.scanAgainBtn, { backgroundColor: colors.primary.main }]}
        onPress={handleScanAgain}>
        <Ionicons name="scan" size={20} color="#fff" />
        <Text style={styles.scanAgainBtnText}>Scanner Suivant</Text>
      </TouchableOpacity>
    </Card>

    {/* Historique récent */}
    {recentBoardings.length > 1 && (
      <Card style={styles.historyCard}>
        <Text style={[styles.historyTitle, { color: colors.text.primary }]}>
          Embarquements Récents
        </Text>
        {recentBoardings.slice(1, 5).map((boarding) => (
          <View key={boarding.id} style={styles.historyItem}>
            <Text style={[styles.historyName, { color: colors.text.primary }]}>
              {boarding.passagerName}
            </Text>
            <Badge 
              text={boarding.syncStatus === 'synced' ? '✓' : '!'}
              color={boarding.syncStatus === 'synced' ? 'success' : 'warning'}
            />
          </View>
        ))}
      </Card>
    )}
  </ScrollView>
)}
```

### 5. Saisie Manuelle (Fallback)

**Pour les cas où le code QR ne scannerait pas:**

```typescript
const handleManualBoarding = async () => {
  if (!manualPassengerId.trim()) {
    Alert.alert('Erreur', 'Veuillez entrer l\'ID du passager');
    return;
  }

  try {
    const user = await authServiceInstance.getCurrentUser();
    await handleBoardingConfirm(manualPassengerId, {
      // Récupérer les détails du serveur
      id: manualPassengerId,
      fullName: 'À déterminer',
      flightNumber: 'À déterminer',
      // ...
    });
    setManualPassengerId('');
  } catch (error) {
    Alert.alert('Erreur', 'Passager introuvable');
  }
};
```

---

## 🗄️ Migration Base de Données

**Fichier:** `migrations/add_boarding_confirmations.sql`

```sql
-- Créer la table boarding_confirmations si elle n'existe pas
CREATE TABLE IF NOT EXISTS boarding_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES raw_scans(id) ON DELETE CASCADE,
  scanned_at TIMESTAMP DEFAULT NOW(),
  passager_id UUID,
  flightNumber VARCHAR(10),
  gate VARCHAR(5),
  seat_number VARCHAR(5),
  boarded_at TIMESTAMP NOT NULL,
  boarded_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_boarding_confirmations_scan ON boarding_confirmations(scan_id);
CREATE INDEX idx_boarding_confirmations_passager ON boarding_confirmations(passager_id);
CREATE INDEX idx_boarding_confirmations_boarded_at ON boarding_confirmations(boarded_at DESC);

-- Ajouter colonnes manquantes à raw_scans si nécessaire
ALTER TABLE raw_scans ADD COLUMN IF NOT EXISTS gate VARCHAR(5);
ALTER TABLE raw_scans ADD COLUMN IF NOT EXISTS boarding_by UUID;
ALTER TABLE raw_scans ADD COLUMN IF NOT EXISTS boarding_at TIMESTAMP;
```

---

## 🎨 Design UI Spécifique pour le Boarding

### Bannière d'Embarquement (couleur vert succès)

```typescript
const styles = StyleSheet.create({
  boardingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(40, 167, 69, 0.95)',  // Vert succès
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  boardingBannerText: {
    color: '#fff',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  confirmationCard: {
    backgroundColor: colors.background.paper,
    borderTopWidth: 4,
    borderTopColor: colors.success.main,
    padding: Spacing.lg,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  }
});
```

---

## 📊 Statut de Synchronisation

Le système doit être capable de fonctionner hors ligne:

```typescript
// Localement: Marquer comme embarqué immédiatement
setConfirmationDetails(confirmation);

// Asynchrone: Synchroniser avec le serveur
syncBoardingToServer(rawData, userId)
  .then(() => updateSyncStatus('synced'))
  .catch(() => updateSyncStatus('failed'));
```

---

## ✅ Checklist d'Implémentation

- [ ] Ajouter les types `BoardingConfirmation` dans `src/types/boarding.types.ts`
- [ ] Ajouter méthode `confirmBoarding()` dans `src/services/raw-scan.service.ts`
- [ ] Créer/Mettre à jour endpoint `/api/v1/boarding/confirm` dans l'API
- [ ] Améliorer `BoardingScreen.tsx` avec historique et confirmation
- [ ] Ajouter interface de saisie manuelle (fallback)
- [ ] Créer migration DB pour table `boarding_confirmations`
- [ ] Tester en mode hors ligne
- [ ] Implémenter synchronisation en arrière-plan
- [ ] Ajouter logging d'audit pour chaque embarquement
- [ ] Tests end-to-end (scan → confirmation → sync)

---

## 🔗 Dépendances Entre Fichiers

```
BoardingScreen.tsx
├── types/boarding.types.ts (BoardingConfirmation) ✨ NEW
├── services/raw-scan.service.ts (confirmBoarding) ✨ NEW
├── services/api.service.ts (POST /api/v1/boarding/confirm) ✨ NEW
├── utils/audit.util.ts (logging)
└── utils/sound.util.ts (playSuccessSound)

API Backend
├── routes/boarding.ts ✨ NEW
├── database.ts (boarding_confirmations table) ✨ NEW
└── supabase (sync passengers table)
```

---

## 🚀 Commandes à Exécuter

```bash
# 1. Migration DB
npm run migrate -- add_boarding_confirmations.sql

# 2. Tester la compilation
npm run build

# 3. Lancer l'app en mode debug
npm start
```

---

## 📝 Notes Importantes

1. **Hors Ligne:** Le système enregistre localement, puis synchronise
2. **Performance:** Utiliser les références (refs) pour éviter les re-renders inutiles
3. **UX:** Confirmation immédiate locale, feedback de sync asynchrone
4. **Audit:** Chaque embarquement doit être loggé avec user ID et timestamp
5. **Sécurité:** Valider côté serveur que le passager a le droit d'embarquer ce vol

---

## 🎯 Résumé Exécutif

**Approche:** Adapter le pattern du RushScreen pour le Boarding  
**Implémentation:** Via amélioration du BoardingScreen existant  
**Données:** Utiliser `raw_scans` + nouvelle table `boarding_confirmations`  
**UX:** Scanner → Confirmation immédiate + Sync asynchrone  
**Timeline:** 2-3 heures pour implémentation complète  
