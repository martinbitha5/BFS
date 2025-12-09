# 🎯 SOLUTION COMPLÈTE : Afficher Passagers et Bagages depuis Raw Scans

## ✅ PROBLÈMES RÉSOLUS

### 1. **Dashboard affiche 0 passagers/bagages**
   - ❌ Avant : Les raw_scans n'étaient pas parsés automatiquement
   - ✅ Maintenant : Bouton "Synchroniser Raw Scans" pour créer les passagers/bagages manquants

### 2. **Logo manquant dans l'export Excel**
   - ❌ Avant : Logo ne s'affichait pas (erreur silencieuse)
   - ✅ Maintenant : Logs détaillés + meilleure gestion d'erreur

### 3. **Passagers et Bagages invisibles**
   - ❌ Avant : Les données scannées ne s'affichaient qu'en raw_scans
   - ✅ Maintenant : Création automatique dans tables `passengers` et `international_baggages`

---

## 🚀 COMMENT UTILISER

### **ÉTAPE 1 : Démarrer l'API (si pas déjà fait)**

```bash
cd /home/goblaire/Documents/BFS/api
npm run dev
```

L'API démarre sur `http://localhost:3000`

### **ÉTAPE 2 : Démarrer le Dashboard**

```bash
cd /home/goblaire/Documents/BFS/dashboard
npm run dev
```

Le dashboard s'ouvre sur `http://localhost:3001`

### **ÉTAPE 3 : Synchroniser les Raw Scans**

1. Connectez-vous au dashboard
2. Allez sur "Vue d'ensemble" (Dashboard)
3. Cliquez sur le bouton **VERT** : **"Synchroniser Raw Scans"**
4. Attendez le message de confirmation : `✅ Synchronisation terminée ! X passagers et Y bagages créés.`
5. Les statistiques se mettent à jour automatiquement !

---

## 📊 VÉRIFIER QUE ÇA FONCTIONNE

### **Dashboard (Vue d'ensemble)**
Avant la sync :
```
Total Passagers: 0
Total Bagages: 0
```

Après la sync (avec 5 boarding pass et 4 baggage tags scannés) :
```
Total Passagers: 5     ✅
Total Bagages: 4       ✅
```

### **Page Passagers**
- Cliquez sur "Passagers" dans le menu
- Vous devez voir la liste des passagers créés depuis les raw_scans
- Format : Nom, PNR, Vol, Origine → Destination

### **Page Bagages**
- Cliquez sur "Bagages" dans le menu
- Vous devez voir les bagages internationaux créés
- Format : Tag RFID, Statut (Scanné), Aéroport

---

## 🔄 FLUX DE SYNCHRONISATION

```
1. App Mobile scanne un boarding pass
   ↓
2. Données enregistrées dans raw_scans (table Supabase)
   ↓
3. Dashboard : Clic sur "Synchroniser Raw Scans"
   ↓
4. API parse chaque raw_scan :
   - Boarding pass → Crée un passager (table passengers)
   - Baggage tag → Crée un bagage international (table international_baggages)
   ↓
5. Dashboard affiche les statistiques à jour
```

---

## 🛠️ NOUVEAUX ENDPOINTS API

### **POST /api/v1/sync-raw-scans**

Parse tous les raw_scans d'un aéroport et crée les entités manquantes.

**Body :**
```json
{
  "airport_code": "FIH"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Synchronisation terminée",
  "stats": {
    "processed": 9,
    "passengersCreated": 5,
    "baggagesCreated": 4,
    "errors": 0,
    "totalScans": 9
  }
}
```

---

## 📝 LOGS CONSOLE (Export Excel)

Maintenant, quand vous exportez, vous verrez dans la console du navigateur :

```
[EXPORT STANDARD] Chargement du logo...
[EXPORT STANDARD] ✅ Logo ajouté
```

Si le logo ne charge pas :
```
[EXPORT STANDARD] ❌ Erreur logo: HTTP 404
```

Ceci vous permet de diagnostiquer rapidement les problèmes.

---

## 🎨 NOUVEAUTÉS DASHBOARD

### **Bouton de Synchronisation**
- Couleur : **VERT** (différent du bouton "Actualiser" bleu)
- Position : En haut à droite de la page Dashboard
- Icône : ⟳ (flèche de rafraîchissement)
- Texte : "Synchroniser Raw Scans"

### **Messages de Confirmation**
- **Succès** : Bandeau vert avec nombre de passagers/bagages créés
- **Erreur** : Bandeau rouge avec message d'erreur

---

## 🧪 TEST COMPLET

### **1. Vider la base de données**
```bash
cd /home/goblaire/Documents/BFS
npm run clear-db
```

### **2. Scanner des données avec l'app mobile**
- Scannez quelques boarding passes
- Scannez quelques baggage tags

### **3. Vérifier raw_scans**
- Dashboard → "Scans Bruts"
- Vous devez voir vos scans

### **4. Synchroniser**
- Dashboard → "Vue d'ensemble"
- Clic sur "Synchroniser Raw Scans"
- Message : `✅ Synchronisation terminée !`

### **5. Vérifier les données**
- Dashboard → "Passagers" : Vous devez voir vos passagers ✅
- Dashboard → "Bagages" : Vous devez voir vos bagages ✅
- Dashboard → "Vue d'ensemble" : Les compteurs sont à jour ✅

---

## 🔍 DÉPANNAGE

### **Le bouton "Synchroniser" ne fait rien**
1. Ouvrez la console du navigateur (F12)
2. Regardez les erreurs
3. Vérifiez que l'API tourne (`http://localhost:3000/health`)

### **Erreur "Airport code requis"**
- Vérifiez que vous êtes bien connecté
- Vérifiez que votre compte a un `airport_code` assigné

### **Logo n'apparaît pas dans l'export**
1. Vérifiez que le fichier existe : `/dashboard/public/assets/logo-ats-csi.png`
2. Regardez les logs de la console pour l'erreur exacte
3. Si HTTP 404 : Le fichier est introuvable, vérifiez le chemin

---

## ✅ CHECKLIST FINALE

- [ ] API démarre sans erreur (`npm run dev`)
- [ ] Dashboard démarre sans erreur (`npm run dev`)
- [ ] Base de données vidée (`npm run clear-db`)
- [ ] Scans effectués depuis l'app mobile
- [ ] Raw scans visibles dans Dashboard → "Scans Bruts"
- [ ] Clic sur "Synchroniser Raw Scans"
- [ ] Message de succès affiché
- [ ] Passagers visibles dans Dashboard → "Passagers"
- [ ] Bagages visibles dans Dashboard → "Bagages"
- [ ] Statistiques correctes dans "Vue d'ensemble"
- [ ] Export Excel contient le logo

---

**🎉 Si toutes les étapes fonctionnent, le système est 100% opérationnel ! 🎉**
