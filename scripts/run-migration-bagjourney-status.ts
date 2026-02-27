/**
 * Script pour exécuter la migration add-bagjourney-status-alignment.sql
 * Alignement des statuts BagJourney (SITA) avec BFS
 */

import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('🔧 Exécution de la migration: add-bagjourney-status-alignment.sql');
  console.log('');

  try {
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add-bagjourney-status-alignment.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Contenu de la migration:');
    console.log('─'.repeat(60));
    console.log(sqlContent);
    console.log('─'.repeat(60));
    console.log('');
    console.log('⚠️  Exécuter manuellement dans le SQL Editor Supabase:');
    console.log('1. Ouvrez le dashboard Supabase → SQL Editor');
    console.log('2. Copiez-collez le contenu ci-dessus');
    console.log('3. Cliquez sur "Run"');
    console.log('');
    console.log('✅ Après exécution: colonne bagjourney_status disponible pour traçabilité');
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

runMigration();
