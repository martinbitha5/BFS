# ✅ Vérification que l'API fonctionne correctement

## Commandes de vérification rapide

### 1. Vérifier le statut PM2
```bash
pm2 status
```
Vous devriez voir `bfs-api` avec le statut `online` (en vert).

### 2. Voir les logs récents
```bash
pm2 logs bfs-api --lines 30
```
Vérifiez qu'il n'y a pas d'erreurs.

### 3. Tester l'API localement
```bash
curl http://localhost:3000/health
```
Réponse attendue : `{"status":"ok","timestamp":"..."}`

### 4. Tester l'API depuis l'extérieur
```bash
curl https://api.brsats.com/health
```
Réponse attendue : `{"status":"ok","timestamp":"..."}`

### 5. Tester avec les restrictions d'aéroport
```bash
# Tester une route qui nécessite authentification
curl -X GET "https://api.brsats.com/api/v1/passengers?airport=FIH" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "x-airport-code: FIH"
```

## Commandes utiles pour la maintenance

### Redémarrer l'API
```bash
pm2 restart bfs-api
```

### Voir les logs en temps réel
```bash
pm2 logs bfs-api
```
Appuyez sur `Ctrl+C` pour quitter.

### Arrêter l'API
```bash
pm2 stop bfs-api
```

### Démarrer l'API
```bash
pm2 start bfs-api
```

### Voir les métriques (CPU, mémoire)
```bash
pm2 monit
```

### Sauvegarder la configuration PM2
```bash
pm2 save
```
(Cette commande sauvegarde la configuration pour qu'elle persiste après redémarrage du serveur)

## Prochaines étapes

1. ✅ API démarrée avec PM2
2. ✅ Variables d'environnement configurées (JWT_SECRET, etc.)
3. ✅ Code à jour (git pull effectué)
4. ✅ Build compilé (dist/server.js existe)

### Tests à effectuer

1. **Tester les restrictions par aéroport** :
   - Un agent de FIH ne peut pas accéder aux données de GOM
   - Un agent de GOM ne peut pas accéder aux données de FIH

2. **Tester les restrictions par rôle** :
   - Un agent checkin peut créer des passagers
   - Un agent baggage peut accéder aux bagages
   - Un agent checkin ne peut pas accéder aux approbations (403)

3. **Exécuter les scripts de test** :
   ```bash
   cd ~/domains/api.brsats.com/public_html/api
   npm run test-massive
   npm run test-portals
   ```

## En cas de problème

### L'API ne répond pas
```bash
pm2 logs bfs-api --err --lines 50
```

### L'API redémarre en boucle
```bash
pm2 logs bfs-api --lines 100
# Cherchez les erreurs dans les logs
```

### Vérifier que le port 3000 n'est pas bloqué
```bash
ss -tulpn | grep 3000
```

### Vérifier les variables d'environnement
```bash
cd ~/domains/api.brsats.com/public_html/api
cat .env
```

