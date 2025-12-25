# 🔧 Correction de l'erreur CORS pour le portail airline

## Problème identifié

L'erreur CORS se produit car :
1. **Nginx intercepte les requêtes OPTIONS** (preflight) et renvoie `Access-Control-Allow-Origin: *`
2. **Node.js utilise `credentials: true`**, ce qui exige une origine spécifique (pas `*`)
3. Le navigateur bloque la requête car il y a un conflit entre les en-têtes Nginx et Node.js

## Solution

### Étape 1 : Mettre à jour la configuration Nginx sur le serveur

1. **Connectez-vous en SSH** :
```bash
ssh -p 65002 u922527895@145.223.86.157
```

2. **Sauvegardez l'ancienne configuration** (au cas où) :
```bash
sudo cp /etc/nginx/sites-available/api.brsats.com /etc/nginx/sites-available/api.brsats.com.backup
```

3. **Copiez la nouvelle configuration** :
```bash
# Depuis votre machine locale, uploader le fichier
scp -P 65002 api/nginx-brsats.conf u922527895@145.223.86.157:~/nginx-brsats.conf

# Sur le serveur
sudo cp ~/nginx-brsats.conf /etc/nginx/sites-available/api.brsats.com
```

4. **Testez la configuration Nginx** :
```bash
sudo nginx -t
```

5. **Rechargez Nginx** :
```bash
sudo systemctl reload nginx
```

### Étape 2 : Ajouter `airline-portal.brsats.com` à ALLOWED_ORIGINS

1. **Via hPanel** (Recommandé) :
   - Allez dans votre projet Cloud Pro
   - Ouvrez "Environment Variables"
   - Trouvez `ALLOWED_ORIGINS`
   - Modifiez pour inclure `airline-portal.brsats.com` :
   ```
   https://api.brsats.com,https://dashboard.brsats.com,https://brsats.com,https://airline-portal.brsats.com
   ```
   - Sauvegardez

2. **Via SSH** (Alternative) :
```bash
cd ~/BFS/api
nano .env
```

Modifiez la ligne `ALLOWED_ORIGINS` :
```env
ALLOWED_ORIGINS=https://api.brsats.com,https://dashboard.brsats.com,https://brsats.com,https://airline-portal.brsats.com
```

Sauvegardez (Ctrl+O, puis Ctrl+X)

### Étape 3 : Redémarrer l'API

```bash
pm2 restart bfs-api
# ou
pm2 restart all
```

### Étape 4 : Vérifier les logs

```bash
pm2 logs bfs-api --lines 30
```

Vous devriez voir que l'API démarre correctement.

## Vérification

1. **Ouvrez** `https://airline-portal.brsats.com/login`
2. **Ouvrez la console** (F12)
3. **Essayez de vous connecter** avec :
   - Email: `support@brsats.com`
   - Mot de passe: `0827241919mA@`
4. **Vérifiez qu'il n'y a plus d'erreur CORS**

## Ce qui a été corrigé

- ✅ **Nginx** : Ne gère plus les requêtes OPTIONS, laisse Node.js gérer CORS
- ✅ **Node.js** : Gère correctement CORS avec `credentials: true` et les origines spécifiques
- ✅ **ALLOWED_ORIGINS** : Doit inclure `airline-portal.brsats.com`

## Note importante

Si l'erreur persiste après ces modifications :

1. **Videz le cache du navigateur** : `Ctrl + Shift + R`
2. **Vérifiez les logs Nginx** :
   ```bash
   sudo tail -f /var/log/nginx/api.brsats.com-error.log
   ```
3. **Vérifiez les logs PM2** :
   ```bash
   pm2 logs bfs-api --lines 50
   ```
4. **Testez l'API directement** :
   ```bash
   curl -X OPTIONS https://api.brsats.com/api/v1/airlines/login \
     -H "Origin: https://airline-portal.brsats.com" \
     -H "Access-Control-Request-Method: POST" \
     -v
   ```

Vous devriez voir les en-têtes CORS corrects dans la réponse.
