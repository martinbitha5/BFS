/**
 * Script pour nettoyer la sync queue de l'app React Native
 * À exécuter depuis le terminal du projet
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🧹 Nettoyage de la sync queue...\n');

// Chemin vers la base SQLite de l'app (iOS Simulator)
const dbPath = path.join(
  process.env.HOME,
  'Library/Developer/CoreSimulator/Devices/*/data/Containers/Data/Application/*/Library/LocalDatabase/SQLite/baggage_system.db'
);

const query = `DELETE FROM sync_queue WHERE operation IN ('insert', 'update', 'delete');`;

console.log('📋 Requête SQL:', query);
console.log('📁 Chemin DB:', dbPath);
console.log('\n⚠️  Ce script ne fonctionne que pour iOS Simulator.');
console.log('💡 Pour un vrai iPhone, utilisez "Effacer données locales" dans les Paramètres de l\'app.\n');

// Note: Ce script est un exemple. Pour l'exécuter réellement, il faudrait :
// 1. Trouver le chemin exact de la DB
// 2. Utiliser sqlite3 CLI pour exécuter la requête
// 3. Ou utiliser l'interface "Paramètres" dans l'app

console.log('✅ Pour nettoyer, utilisez l\'option "Effacer données locales" dans l\'app !');
