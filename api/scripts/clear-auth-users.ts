/**
 * Script pour supprimer TOUS les utilisateurs de Supabase Auth
 * ⚠️  ATTENTION : Cette opération est IRRÉVERSIBLE
 * 
 * Ce script nécessite la clé SERVICE_ROLE de Supabase (SUPABASE_SERVICE_KEY)
 * 
 * Usage:
 *   cd api
 *   npx ts-node scripts/clear-auth-users.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger les variables d'environnement
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERREUR: SUPABASE_URL et SUPABASE_SERVICE_KEY doivent être définis dans api/.env');
  console.error('   SUPABASE_URL:', SUPABASE_URL || 'NON DÉFINI');
  console.error('   SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'DÉFINI' : 'NON DÉFINI');
  process.exit(1);
}

// Créer le client Supabase avec la clé SERVICE_ROLE (droits admin)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function clearAllAuthUsers() {
  console.log('🚀 Démarrage de la suppression de tous les utilisateurs Auth...\n');
  console.log(`📡 Connexion à Supabase: ${SUPABASE_URL}\n`);

  try {
    // Essayer d'abord sans pagination pour voir tous les utilisateurs
    console.log('📄 Tentative 1: Récupération sans pagination...');
    let { data: allData, error: allError } = await supabase.auth.admin.listUsers();
    
    if (allError) {
      console.error(`❌ Erreur lors de la récupération (sans pagination):`, allError.message);
      console.error('   Détails:', JSON.stringify(allError, null, 2));
    } else {
      const allUsers = allData?.users || [];
      console.log(`   ✅ Trouvé ${allUsers.length} utilisateur(s) au total (sans pagination)`);
      
      if (allUsers.length > 0) {
        console.log(`\n🗑️  Suppression de ${allUsers.length} utilisateur(s)...\n`);
        
        for (const user of allUsers) {
          const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
          
          if (deleteError) {
            console.error(`   ❌ Erreur lors de la suppression de ${user.email || user.id}:`, deleteError.message);
          } else {
            console.log(`   ✅ Supprimé: ${user.email || 'sans email'} (${user.id})`);
          }
        }
        
        console.log(`\n✅ ✅ ✅ SUPPRESSION TERMINÉE ✅ ✅ ✅`);
        console.log(`Total d'utilisateurs supprimés: ${allUsers.length}`);
        return;
      }
    }

    // Si la première méthode n'a pas fonctionné, essayer avec pagination
    console.log('\n📄 Tentative 2: Récupération avec pagination...');
    let page = 1;
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`📄 Récupération de la page ${page}...`);

      const { data, error: listError } = await supabase.auth.admin.listUsers({
        page: page,
        perPage: 1000,
      });

      if (listError) {
        console.error(`❌ Erreur lors de la récupération des utilisateurs (page ${page}):`, listError.message);
        console.error('   Détails:', JSON.stringify(listError, null, 2));
        break;
      }

      const users = data?.users || [];
      
      console.log(`   Réponse API - Users trouvés: ${users.length}`);
      if (data) {
        console.log(`   Total d'utilisateurs (si disponible): ${(data as any).total || 'N/A'}`);
      }

      if (users.length === 0) {
        console.log(`   Aucun utilisateur trouvé sur la page ${page}`);
        hasMore = false;
        break;
      }

      console.log(`   Trouvé ${users.length} utilisateur(s) sur cette page`);

      // Supprimer chaque utilisateur
      for (const user of users) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

        if (deleteError) {
          console.error(`   ❌ Erreur lors de la suppression de ${user.email || user.id}:`, deleteError.message);
        } else {
          totalDeleted++;
          console.log(`   ✅ Supprimé: ${user.email || 'sans email'} (${user.id})`);
        }
      }

      // Si on a moins de 1000 utilisateurs, c'est la dernière page
      if (users.length < 1000) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`✅ ✅ ✅ SUPPRESSION TERMINÉE ✅ ✅ ✅`);
    console.log(`Total d'utilisateurs supprimés: ${totalDeleted}`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ ERREUR FATALE:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Exécuter le script
clearAllAuthUsers()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

