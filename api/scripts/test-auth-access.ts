/**
 * Script de test pour vérifier l'accès à l'API Auth Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERREUR: Variables manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testAuthAccess() {
  console.log('🔍 Test d\'accès à l\'API Auth Supabase...\n');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...\n`);

  try {
    // Tester listUsers sans paramètres
    console.log('📋 Test 1: listUsers() sans paramètres...');
    const { data: data1, error: error1 } = await supabase.auth.admin.listUsers();
    console.log('   Résultat:', {
      users: data1?.users?.length || 0,
      error: error1?.message || 'Aucune erreur'
    });
    if (data1?.users && data1.users.length > 0) {
      console.log('   Premiers utilisateurs:');
      data1.users.slice(0, 5).forEach((u: any) => {
        console.log(`     - ${u.email || 'sans email'} (${u.id})`);
      });
    }

    // Tester listUsers avec pagination
    console.log('\n📋 Test 2: listUsers({ page: 1, perPage: 1000 })...');
    const { data: data2, error: error2 } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    console.log('   Résultat:', {
      users: data2?.users?.length || 0,
      error: error2?.message || 'Aucune erreur'
    });

    // Tester avec une requête directe à l'API REST
    console.log('\n📋 Test 3: Requête directe à l\'API REST...');
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
    });

    console.log('   Status:', response.status);
    console.log('   Status Text:', response.statusText);
    
    if (response.ok) {
      const json: any = await response.json();
      console.log('   Utilisateurs trouvés:', json.users?.length || 0);
      if (json.users && json.users.length > 0) {
        console.log('   Premiers utilisateurs:');
        json.users.slice(0, 5).forEach((u: any) => {
          console.log(`     - ${u.email || 'sans email'} (${u.id})`);
        });
      }
    } else {
      const text = await response.text();
      console.log('   Erreur:', text.substring(0, 200));
    }

  } catch (error: any) {
    console.error('❌ ERREUR:', error.message);
    console.error(error);
  }
}

testAuthAccess()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

