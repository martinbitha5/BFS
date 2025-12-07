import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearAllTestData() {
  console.log('🧹 Nettoyage de toutes les données de test...\n');

  try {
    // 1. Supprimer les items de rapports BIRS
    console.log('📋 Suppression des items de rapports BIRS...');
    const { error: itemsError } = await supabase
      .from('birs_report_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprimer tout
    
    if (itemsError) {
      console.error('❌ Erreur items BIRS:', itemsError.message);
    } else {
      console.log('✅ Items de rapports BIRS supprimés');
    }

    // 2. Supprimer les rapports BIRS
    console.log('📄 Suppression des rapports BIRS...');
    const { error: reportsError } = await supabase
      .from('birs_reports')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (reportsError) {
      console.error('❌ Erreur rapports BIRS:', reportsError.message);
    } else {
      console.log('✅ Rapports BIRS supprimés');
    }

    // 3. Supprimer les bagages internationaux
    console.log('✈️  Suppression des bagages internationaux...');
    const { error: intBagsError } = await supabase
      .from('international_baggages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (intBagsError) {
      console.error('❌ Erreur bagages internationaux:', intBagsError.message);
    } else {
      console.log('✅ Bagages internationaux supprimés');
    }

    // 4. Supprimer les statuts d'embarquement
    console.log('🎫 Suppression des statuts d\'embarquement...');
    const { error: boardingError } = await supabase
      .from('boarding_status')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (boardingError) {
      console.error('❌ Erreur statuts embarquement:', boardingError.message);
    } else {
      console.log('✅ Statuts d\'embarquement supprimés');
    }

    // 5. Supprimer les bagages
    console.log('💼 Suppression des bagages...');
    const { error: bagsError } = await supabase
      .from('baggages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (bagsError) {
      console.error('❌ Erreur bagages:', bagsError.message);
    } else {
      console.log('✅ Bagages supprimés');
    }

    // 6. Supprimer les passagers
    console.log('👥 Suppression des passagers...');
    const { error: passError } = await supabase
      .from('passengers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (passError) {
      console.error('❌ Erreur passagers:', passError.message);
    } else {
      console.log('✅ Passagers supprimés');
    }

    // 7. Supprimer les utilisateurs de test (garder seulement les superviseurs)
    console.log('🔐 Suppression des utilisateurs de test...');
    const { data: users, error: usersListError } = await supabase
      .from('users')
      .select('id, email, role')
      .neq('role', 'supervisor');
    
    if (usersListError) {
      console.error('❌ Erreur liste utilisateurs:', usersListError.message);
    } else if (users && users.length > 0) {
      for (const user of users) {
        // Supprimer de la table users
        await supabase.from('users').delete().eq('id', user.id);
        // Supprimer de auth.users
        await supabase.auth.admin.deleteUser(user.id);
        console.log(`  🗑️  Utilisateur supprimé: ${user.email}`);
      }
      console.log('✅ Utilisateurs de test supprimés');
    } else {
      console.log('✅ Aucun utilisateur de test à supprimer');
    }

    console.log('\n✨ Nettoyage terminé avec succès!\n');
    console.log('📊 Votre base de données est maintenant propre et prête pour la production.\n');

  } catch (error) {
    console.error('\n❌ Erreur lors du nettoyage:', error);
    process.exit(1);
  }
}

// Exécuter le script
clearAllTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
