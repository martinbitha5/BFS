# Scripts BFS

## 🗑️ Vider la base de données

Pour supprimer **TOUTES** les données de la base de données et recommencer avec une base vierge :

### Méthode 1: Avec npm (Recommandé)
```bash
cd /home/goblaire/Documents/BFS
npm run clear-db
```

### Méthode 2: Directement avec Node.js
```bash
cd /home/goblaire/Documents/BFS
node scripts/clear-database.js
```

### Méthode 3: SQL (Supabase Dashboard)
1. Allez sur https://supabase.com/dashboard
2. Ouvrez votre projet BFS
3. Allez dans "SQL Editor"
4. Copiez-collez le contenu de `scripts/clear-database.sql`
5. Exécutez le script

---

## ⚠️ ATTENTION
Le script `clear-db` supprimera **TOUTES** les données suivantes :
- ✅ Tous les bagages internationaux
- ✅ Tous les bagages normaux
- ✅ Tous les passagers
- ✅ Tous les raw scans
- ✅ Toutes les sync queues
- ✅ Tous les audit logs

**Cette action est IRRÉVERSIBLE !**

---

## 📊 Après suppression
Le script affichera automatiquement un résumé avec le nombre de lignes dans chaque table (devrait être 0 partout).

Vous pouvez maintenant tester avec des données fraîches ! 🎉
