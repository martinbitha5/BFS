/**
 * Script pour exécuter la migration fix-baggage-dispute-role-constraint.sql
 * Ajoute le rôle baggage_dispute à la contrainte CHECK de la table users
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuration Supabase
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ncxnouvkjnqldhhrkjcq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jeG5vdXZram5xbGRoaHJramNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxOTQzOSwiZXhwIjoyMDgwNTk1NDM5fQ.wQkXC8yPFQnbfQfPQoLZTvDqNPUGmYzLjJGdQjvEqXo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🔧 Exécution de la migration: fix-baggage-dispute-role-constraint.sql');
  console.log('📍 Connexion à Supabase:', SUPABASE_URL);

  try {
    // Lire le fichier SQL
    const migrationPath = path.join(__dirname, '..', 'migrations', 'fix-baggage-dispute-role-constraint.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    console.log('\n📄 Contenu de la migration:');
    console.log(sqlContent);
    console.log('\n');

    // Exécuter la migration via RPC
    // Note: Supabase ne permet pas d'exécuter du DDL directement via l'API
    // Il faut utiliser le SQL Editor dans le dashboard Supabase
    
    console.log('⚠️  IMPORTANT: Cette migration doit être exécutée manuellement dans le SQL Editor de Supabase');
    console.log('');
    console.log('📋 Instructions:');
    console.log('1. Ouvrez le dashboard Supabase: https://supabase.com/dashboard/project/ncxnouvkjnqldhhrkjcq/sql');
    console.log('2. Cliquez sur "New Query"');
    console.log('3. Copiez-collez le contenu du fichier: migrations/fix-baggage-dispute-role-constraint.sql');
    console.log('4. Cliquez sur "Run" pour exécuter la migration');
    console.log('');
    console.log('✅ Après l\'exécution, la création d\'utilisateurs avec le rôle "baggage_dispute" fonctionnera correctement');

  } catch (error: any) {
    console.error('❌ Erreur lors de la migration:', error.message);
    process.exit(1);
  }
}

runMigration();
