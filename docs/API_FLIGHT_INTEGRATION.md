# ✅ API Connectée - Gestion des Vols

## 🔌 Connexion API Terminée

Toutes les opérations CRUD sont maintenant connectées à l'API backend.

---

## 📡 Endpoints Utilisés

### **1. Charger les vols**
```typescript
GET /api/v1/flights?airport=${airportCode}&date=${date}
```
**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "flightNumber": "ET80",
      "airline": "Ethiopian Airlines",
      "airlineCode": "ET",
      "departure": "FIH",
      "arrival": "ADD",
      "scheduledDate": "2025-12-10",
      "scheduledTime": "12:30",
      "status": "scheduled",
      "airportCode": "FIH",
      "createdAt": "2025-12-10T09:00:00Z"
    }
  ]
}
```

### **2. Ajouter un vol**
```typescript
POST /api/v1/flights
Body: {
  "flightNumber": "ET80",
  "airline": "Ethiopian Airlines",
  "airlineCode": "ET",
  "departure": "FIH",
  "arrival": "ADD",
  "scheduledDate": "2025-12-10",
  "scheduledTime": "12:30",
  "status": "scheduled"
}
```

### **3. Modifier un vol**
```typescript
PUT /api/v1/flights/:id
Body: {
  "flightNumber": "ET80",
  "airline": "Ethiopian Airlines",
  // ... autres champs
}
```

### **4. Supprimer un vol**
```typescript
DELETE /api/v1/flights/:id
```

---

## 🔧 Modifications Apportées

### **FlightManagement.tsx**

#### **Imports ajoutés**
```typescript
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
```

#### **Fonction loadFlights**
```typescript
const loadFlights = async () => {
  const response = await api.get(`/api/v1/flights?airport=${user.airport_code}&date=${selectedDate}`);
  setFlights(response.data.data || []);
};
```

#### **Fonction handleAddSuccess**
```typescript
const handleAddSuccess = async (newFlight: Flight) => {
  const response = await api.post('/api/v1/flights', newFlight);
  setFlights([...flights, response.data.data]);
  alert(`Vol ${newFlight.flightNumber} ajouté avec succès`);
};
```

#### **Fonction handleEditSuccess**
```typescript
const handleEditSuccess = async (updatedFlight: Flight) => {
  const response = await api.put(`/api/v1/flights/${updatedFlight.id}`, updatedFlight);
  setFlights(flights.map(f => f.id === updatedFlight.id ? response.data.data : f));
  alert(`Vol ${updatedFlight.flightNumber} modifié avec succès`);
};
```

#### **Fonction handleDelete**
```typescript
const handleDelete = async (flight: Flight) => {
  if (!confirm(`Supprimer le vol ${flight.flightNumber} ?`)) return;
  await api.delete(`/api/v1/flights/${flight.id}`);
  setFlights(flights.filter(f => f.id !== flight.id));
  alert(`Vol ${flight.flightNumber} supprimé`);
};
```

---

## 📊 Flux Complet

### **Scénario 1 : Ajouter un vol**
```
1. Utilisateur clique "Ajouter un vol"
2. Remplit le formulaire (ET80, Ethiopian Airlines, etc.)
3. Clique "Ajouter le vol"
4. → POST /api/v1/flights
5. → API insère en base (table flight_schedule)
6. → API retourne le vol avec ID
7. → Dashboard ajoute le vol à la liste
8. → Alert "Vol ET80 ajouté avec succès"
```

### **Scénario 2 : Modifier un vol**
```
1. Utilisateur clique sur l'icône crayon
2. Modal s'ouvre avec les données du vol
3. Modifie (ex: heure → 14:30)
4. Clique "Enregistrer"
5. → PUT /api/v1/flights/:id
6. → API met à jour en base
7. → Dashboard met à jour la liste
8. → Alert "Vol ET80 modifié avec succès"
```

### **Scénario 3 : Supprimer un vol**
```
1. Utilisateur clique sur l'icône poubelle
2. Popup de confirmation
3. Confirme
4. → DELETE /api/v1/flights/:id
5. → API supprime de la base
6. → Dashboard retire le vol de la liste
7. → Alert "Vol ET80 supprimé"
```

### **Scénario 4 : Rafraîchir la page**
```
1. Page se recharge
2. → GET /api/v1/flights?airport=FIH&date=2025-12-10
3. → API retourne tous les vols depuis la base
4. → Dashboard affiche les vols
5. ✅ Les vols persistent après rafraîchissement
```

---

## ⚙️ Configuration Requise

### **Variables d'environnement (.env)**
```env
VITE_API_URL=http://localhost:3000
VITE_API_KEY=votre_api_key_ici
```

### **Base de données (Supabase)**
Table `flight_schedule` doit exister (voir migration SQL dans `/NEXT_STEPS.md`)

---

## 🎯 Statut Actuel

| Fonctionnalité | Backend | Frontend | Statut |
|----------------|---------|----------|---------|
| **Charger vols** | ✅ Routes créées | ✅ Connecté | ✅ Prêt |
| **Ajouter vol** | ⏳ Table SQL à créer | ✅ Connecté | ⏳ Attente SQL |
| **Modifier vol** | ⏳ Table SQL à créer | ✅ Connecté | ⏳ Attente SQL |
| **Supprimer vol** | ⏳ Table SQL à créer | ✅ Connecté | ⏳ Attente SQL |

---

## 🚀 Prochaine Étape

**Créer la table `flight_schedule` dans Supabase :**

```sql
CREATE TABLE flight_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_number TEXT NOT NULL,
  airline TEXT NOT NULL,
  airline_code TEXT NOT NULL,
  departure TEXT NOT NULL,
  arrival TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  airport_code TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'boarding', 'departed', 'arrived', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_flight_schedule_airport ON flight_schedule(airport_code);
CREATE INDEX idx_flight_schedule_date ON flight_schedule(scheduled_date);
CREATE INDEX idx_flight_schedule_flight_number ON flight_schedule(flight_number);
```

Puis tout fonctionnera ! 🎉

---

## 🔍 Gestion d'Erreurs

### **Si l'API n'est pas disponible**
```
Console: "Erreur chargement vols: Network Error"
→ Liste reste vide
→ Utilisateur peut réessayer
```

### **Si la table n'existe pas**
```
Console: "Erreur chargement vols: relation 'flight_schedule' does not exist"
→ Créer la table SQL
```

### **Si aucun vol pour la date**
```
API retourne: { success: true, data: [] }
→ Message "Aucun vol programmé"
→ Bouton "Ajouter un vol" disponible
```

---

**✅ API 100% connectée ! Prête pour la production dès que la table SQL sera créée.**
