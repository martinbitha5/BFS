/**
 * Script de test pour vérifier la création d'utilisateurs Dashboard
 * Teste la contrainte CHECK et la politique RLS
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ncxnouvkjnqldhhrkjcq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jeG5vdXZram5xbGRoaHJramNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAxOTQzOSwiZXhwIjoyMDgwNTk1NDM5fQ.wQkXC8yPFQnbfQfPQoLZTvDqNPUGmYzLjJGdQjvEqXo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testUserCreation() {
  console.log('🔍 Test de la création d\'utilisateurs Dashboard\n');

  // 1. Vérifier la contrainte CHECK sur la table users
  console.log('1️⃣ Vérification de la contrainte CHECK...');
  const { data: constraints, error: constraintError } = await supabase
    .rpc('exec_sql', { 
      query: `
        SELECT conname, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conrelid = 'users'::regclass
        AND conname = 'users_role_check'
      `
    })
    .single();

  if (constraintError) {
    console.log('⚠️  Impossible de vérifier via RPC, vérification manuelle requise');
    console.log('   Erreur:', constraintError.message);
  } else {
    console.log('✅ Contrainte trouvée:', constraints);
  }

  // 2. Vérifier si le compte support existe dans users
  console.log('\n2️⃣ Vérification du compte support...');
  const { data: supportUser, error: supportError } = await supabase
    .from('users')
    .select('id, email, role, is_approved')
    .eq('email', 'support@brsats.com')
    .single();

  if (supportError) {
    console.log('❌ Compte support introuvable dans la table users!');
    console.log('   Erreur:', supportError.message);
    console.log('   ⚠️  CRITIQUE: Le compte support doit exister pour que la politique RLS fonctionne');
    console.log('   📋 Exécutez: migrations/ensure-support-user-in-table.sql');
  } else {
    console.log('✅ Compte support trouvé:', supportUser);
  }

  // 3. Vérifier les politiques RLS sur users
  console.log('\n3️⃣ Vérification des politiques RLS...');
  const { data: policies, error: policyError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT schemaname, tablename, policyname, permissive, cmd
        FROM pg_policies
        WHERE tablename = 'users'
        ORDER BY policyname
      `
    });

  if (policyError) {
    console.log('⚠️  Impossible de vérifier les politiques via RPC');
  } else {
    console.log('✅ Politiques RLS sur users:');
    if (policies && Array.isArray(policies)) {
      policies.forEach((p: any) => {
        console.log(`   - ${p.policyname} (${p.cmd})`);
      });
    }
  }

  // 4. Test d'insertion directe (bypass RLS avec service_role)
  console.log('\n4️⃣ Test d\'insertion directe (service_role)...');
  
  const testEmail = `test-baggage-dispute-${Date.now()}@test.com`;
  
  // Créer d'abord dans auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'test123456',
    email_confirm: true
  });

  if (authError) {
    console.log('❌ Erreur création auth:', authError.message);
    return;
  }

  console.log('✅ Utilisateur auth créé:', authData.user.id);

  // Insérer dans users avec rôle baggage_dispute
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: testEmail,
      full_name: 'Test Baggage Dispute',
      role: 'baggage_dispute',
      airport_code: 'ALL',
      is_approved: true,
      approved_at: new Date().toISOString()
    })
    .select()
    .single();

  if (userError) {
    console.log('❌ Erreur insertion users:', userError.message);
    console.log('   Détails:', userError);
    
    // Nettoyer
    await supabase.auth.admin.deleteUser(authData.user.id);
    
    if (userError.message.includes('violates check constraint')) {
      console.log('\n⚠️  PROBLÈME: La contrainte CHECK n\'inclut pas "baggage_dispute"');
      console.log('   📋 Exécutez la migration: migrations/fix-baggage-dispute-role-constraint.sql');
    }
  } else {
    console.log('✅ Utilisateur créé avec succès:', userData);
    
    // Nettoyer
    await supabase.from('users').delete().eq('id', authData.user.id);
    await supabase.auth.admin.deleteUser(authData.user.id);
    console.log('🧹 Utilisateur de test supprimé');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('='.repeat(60));
  
  if (!supportUser) {
    console.log('❌ BLOQUANT: Compte support manquant dans users');
    console.log('   → Exécutez: migrations/ensure-support-user-in-table.sql');
  }
  
  if (userError && userError.message.includes('violates check constraint')) {
    console.log('❌ BLOQUANT: Contrainte CHECK manque "baggage_dispute"');
    console.log('   → Exécutez: migrations/fix-baggage-dispute-role-constraint.sql');
  }
  
  if (!userError && supportUser) {
    console.log('✅ Tout fonctionne correctement!');
  }
}

testUserCreation().catch(console.error);
