/**
 * Script pour supprimer TOUS les utilisateurs Auth via l'API REST directe
 * ⚠️  ATTENTION : Cette opération est IRRÉVERSIBLE
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERREUR: SUPABASE_URL et SUPABASE_SERVICE_KEY doivent être définis');
  process.exit(1);
}

async function deleteAllUsersDirect() {
  console.log('🚀 Suppression des utilisateurs Auth via API REST directe...\n');
  console.log(`URL: ${SUPABASE_URL}\n`);

  let page = 1;
  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      // Récupérer les utilisateurs via l'API REST
      const listUrl = `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`;
      console.log(`📄 Page ${page}: Récupération des utilisateurs...`);

      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        console.error(`❌ Erreur HTTP ${listResponse.status}:`, errorText.substring(0, 200));
        break;
      }

      const data: any = await listResponse.json();
      const users = data.users || [];

      console.log(`   Trouvé ${users.length} utilisateur(s)`);

      if (users.length === 0) {
        hasMore = false;
        break;
      }

      // Supprimer chaque utilisateur
      for (const user of users) {
        const deleteUrl = `${SUPABASE_URL}/auth/v1/admin/users/${user.id}`;
        
        const deleteResponse = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json',
          },
        });

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          console.error(`   ❌ Erreur lors de la suppression de ${user.email || user.id}:`, errorText.substring(0, 100));
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

    } catch (error: any) {
      console.error(`❌ Erreur lors du traitement de la page ${page}:`, error.message);
      break;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`✅ ✅ ✅ SUPPRESSION TERMINÉE ✅ ✅ ✅`);
  console.log(`Total d'utilisateurs supprimés: ${totalDeleted}`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

deleteAllUsersDirect()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

