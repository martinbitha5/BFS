#!/usr/bin/env node

/**
 * Script pour vider TOUTE la base de données BFS
 * ⚠️ ATTENTION: Ceci supprimera TOUTES les données !
 * 
 * Usage:
 *   node scripts/clear-database.js
 * 
 * Ou avec npm:
 *   npm run clear-db
 */

const { createClient } = require('@supabase/supabase-js');

// Credentials Supabase (production)
const SUPABASE_URL = 'https://ncxnouvkjnqldhhrkjcq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jeG5vdXZram5xbGRoaHJramNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxOTQzOSwiZXhwIjoyMDgwNTk1NDM5fQ.hMt19SK1KpQjJV92JWPHhv1cvGr2PanGRkguelDylT8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function clearDatabase() {
  console.log('⚠️  ATTENTION: Vous allez supprimer TOUTES les données de la base !');
  console.log('⏳ Démarrage de la suppression...\n');

  try {
    // 1. Supprimer tous les bagages internationaux
    console.log('🗑️  Suppression des bagages internationaux...');
    const { error: error1 } = await supabase
      .from('international_baggages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprime tout sauf un ID impossible
    if (error1) throw error1;
    console.log('✅ Bagages internationaux supprimés');

    // 2. Supprimer tous les bagages normaux
    console.log('🗑️  Suppression des bagages normaux...');
    const { error: error2 } = await supabase
      .from('baggages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error2) throw error2;
    console.log('✅ Bagages normaux supprimés');

    // 3. Supprimer tous les passagers
    console.log('🗑️  Suppression des passagers...');
    const { error: error3 } = await supabase
      .from('passengers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error3) throw error3;
    console.log('✅ Passagers supprimés');

    // 4. Supprimer tous les raw scans
    console.log('🗑️  Suppression des raw scans...');
    const { error: error4 } = await supabase
      .from('raw_scans')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error4) throw error4;
    console.log('✅ Raw scans supprimés');

    // 5. Supprimer toutes les sync queues (si la table existe)
    console.log('🗑️  Suppression des sync queues...');
    const { error: error5 } = await supabase
      .from('sync_queue')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error5) {
      console.log('⚠️  Sync queues: Table non trouvée (ignorée)');
    } else {
      console.log('✅ Sync queues supprimées');
    }

    // 6. Supprimer tous les audit logs (optionnel)
    console.log('🗑️  Suppression des audit logs...');
    const { error: error6 } = await supabase
      .from('audit_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error6) console.log('⚠️  Audit logs: ' + error6.message);
    else console.log('✅ Audit logs supprimés');

    console.log('\n✅ ✅ ✅ BASE DE DONNÉES VIDÉE AVEC SUCCÈS ! ✅ ✅ ✅\n');

    // Vérifier que tout est vide
    console.log('📊 Vérification des compteurs:');
    const tables = ['international_baggages', 'baggages', 'passengers', 'raw_scans'];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ${table}: ❌ ERREUR (${error.message})`);
      } else {
        console.log(`   ${table}: ${count || 0} lignes`);
      }
    }

    console.log('\n🎉 La base de données est maintenant VIERGE !');
    console.log('💡 Vous pouvez maintenant tester avec des données fraîches.\n');

  } catch (error) {
    console.error('\n❌ ERREUR lors de la suppression:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Confirmation avant suppression
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  ⚠️  SUPPRESSION TOTALE DE LA BASE DE DONNÉES BFS  ⚠️   ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Exécution directe sans confirmation (pour rapidité)
clearDatabase();
