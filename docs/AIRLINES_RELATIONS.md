# Relations de la table Airlines

## 🔗 Relations actuelles et potentielles

### 1. **airlines → birs_international** (PRINCIPALE)

**Relation** : `airlines.code` → `birs_international.airline_code`

**Type** : One-to-Many (une compagnie → plusieurs fichiers BIRS)

**Utilité** :
- Tracer qui a uploadé quel fichier
- Filtrer l'historique par compagnie
- Assurer l'intégrité (pas de BIRS sans compagnie valide)

```sql
SELECT a.name, b.flight_number, b.uploaded_at
FROM airlines a
JOIN birs_international b ON a.code = b.airline_code
WHERE a.code = 'ET';
```

### 2. **airlines → international_baggages** (INDIRECTE)

**Relation** : Via `airline_code` (pas de FK direct recommandé)

**Type** : One-to-Many indirect

**Utilité** :
- Les bagages internationaux portent le code de la compagnie
- Permet de lier un bagage à sa compagnie
- Pas de FK directe car les bagages peuvent exister avant la compagnie (legacy data)

```sql
SELECT a.name, COUNT(ib.id) as total_bagages
FROM airlines a
LEFT JOIN international_baggages ib ON a.code = SUBSTRING(ib.flight_number, 1, 2)
GROUP BY a.name;
```

### 3. **Pourquoi pas de relation avec `passengers` ou `baggages` ?**

Les tables `passengers` et `baggages` concernent les **vols nationaux** ou les passagers scannés localement. 

La table `airlines` est spécifiquement pour les **compagnies internationales** qui uploadent des BIRS.

**Séparation logique** :
- `passengers` / `baggages` → Données locales (scannées à l'aéroport)
- `airlines` / `birs_international` / `international_baggages` → Données internationales (uploadées par compagnies)

## 📊 Schéma des relations

```
┌─────────────┐
│  airlines   │
│  (code PK)  │
└──────┬──────┘
       │
       │ 1:N (FOREIGN KEY)
       │
       ▼
┌──────────────────────┐
│ birs_international   │
│ (airline_code FK)    │
└──────────────────────┘
       │
       │ 1:N (logique)
       │
       ▼
┌──────────────────────────┐
│ international_baggages   │
│ (flight_number contient  │
│  le code compagnie)      │
└──────────────────────────┘
```

## ⚙️ Recommandations

### À implémenter maintenant :
✅ Foreign key `airlines.code` → `birs_international.airline_code`

### Optionnel :
- Trigger pour extraire le code compagnie du flight_number
- Vue matérialisée joignant airlines et leurs statistiques
- Contrainte CHECK sur `international_baggages.flight_number` format

### Ne PAS implémenter :
❌ FK direct airlines → international_baggages (trop couplé)
❌ FK direct airlines → passengers (domaines séparés)

## 🔧 Maintenance

### Vérifier l'intégrité :
```sql
-- Trouver les BIRS sans compagnie valide
SELECT DISTINCT airline_code 
FROM birs_international 
WHERE airline_code NOT IN (SELECT code FROM airlines);

-- Trouver les compagnies sans BIRS
SELECT code, name 
FROM airlines 
WHERE code NOT IN (SELECT DISTINCT airline_code FROM birs_international);
```

### Nettoyer les données orphelines :
```sql
-- Supprimer les BIRS sans compagnie (si nécessaire)
DELETE FROM birs_international 
WHERE airline_code NOT IN (SELECT code FROM airlines);
```

## 📝 Migration recommandée

1. **Créer la table airlines** ✅ (déjà fait)
2. **Ajouter FK vers birs_international** ⏳ (à faire)
3. **Nettoyer les données si nécessaire**
4. **Activer la FK**

---

**Créé le** : 11 décembre 2025  
**Auteur** : Martin Bitha Moponda
