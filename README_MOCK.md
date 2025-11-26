# Mode Mock - Données de Test

L'application est configurée pour utiliser des données mockées (simulées) par défaut. Cela permet de tester toutes les fonctionnalités sans avoir besoin de configurer Supabase.

## Configuration

Le mode mock est contrôlé par le fichier `src/config.ts` :

```typescript
export const USE_MOCK_DATA = true; // Mettre à false pour utiliser Supabase
```

## Comptes de test disponibles

Tous les comptes utilisent le mot de passe : **`password123`**

### Comptes par rôle :

1. **Check-in**
   - Email: `checkin@bfs.com`
   - Mot de passe: `password123`
   - Aéroport: FIH

2. **Bagages**
   - Email: `baggage@bfs.com`
   - Mot de passe: `password123`
   - Aéroport: FIH

3. **Embarquement**
   - Email: `boarding@bfs.com`
   - Mot de passe: `password123`
   - Aéroport: FIH

4. **Arrivée**
   - Email: `arrival@bfs.com`
   - Mot de passe: `password123`
   - Aéroport: FIH

5. **Superviseur**
   - Email: `supervisor@bfs.com`
   - Mot de passe: `password123`
   - Aéroport: FIH

## Données mockées pré-chargées

### Passagers existants :

1. **KATEBA MULONGO**
   - PNR: `GPRJDV`
   - Vol: 9U123
   - Route: FIH-JNB
   - Bagages: 2 (tags: 4071161863, 4071161864)

2. **MUKAMBA TSHILOMBO**
   - PNR: `YFMKNE`
   - Vol: 9U456
   - Route: FIH-LAD
   - Bagages: 1 (tag: 4071161870)

### Bagages existants :

- Tag RFID: `4071161863` → Passager GPRJDV
- Tag RFID: `4071161864` → Passager GPRJDV
- Tag RFID: `4071161870` → Passager YFMKNE

## Comment tester

1. **Connexion** : Utilisez un des comptes ci-dessus
2. **Check-in** : Scannez un boarding pass (ou utilisez les données mockées)
3. **Bagages** : Recherchez par PNR (ex: `GPRJDV`) puis scannez des tags RFID
4. **Embarquement** : Scannez le boarding pass d'un passager enregistré
5. **Arrivée** : Recherchez un bagage par tag RFID (ex: `4071161863`)
6. **Supervision** : Connectez-vous en tant que superviseur pour voir tous les passagers

## Basculer vers Supabase

Quand vous êtes prêt à utiliser Supabase :

1. Configurez vos variables d'environnement dans `.env` :
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
   ```

2. Modifiez `src/config.ts` :
   ```typescript
   export const USE_MOCK_DATA = false;
   ```

3. Redémarrez l'application

## Notes

- Les données mockées sont stockées en mémoire et seront perdues au redémarrage de l'app
- La synchronisation avec Supabase est simulée (les données sont ajoutées à une file d'attente mockée)
- Tous les délais réseau sont simulés (500-1000ms) pour un comportement réaliste

