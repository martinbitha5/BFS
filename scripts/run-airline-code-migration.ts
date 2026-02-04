import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../api/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Exécution de la migration pour les codes IATA...');
  console.log('📍 Supabase URL:', supabaseUrl);

  try {
    // Supprimer l'ancienne contrainte
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE airlines DROP CONSTRAINT IF EXISTS airlines_code_check;`
    });
    
    if (dropError) {
      console.log('⚠️  Erreur lors de la suppression de contrainte (peut-être déjà supprimée):', dropError.message);
    }

    // Ajouter la nouvelle contrainte
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE airlines ADD CONSTRAINT airlines_code_check CHECK (LENGTH(code) >= 2 AND LENGTH(code) <= 3);`
    });

    if (addError) {
      console.log('⚠️  Erreur lors de l\'ajout de contrainte:', addError.message);
    } else {
      console.log('✅ Migration réussie ! Les codes IATA de 2 ou 3 caractères sont maintenant autorisés.');
    }

  } catch (err) {
    console.error('❌ Erreur:', err);
  }
}

runMigration();
