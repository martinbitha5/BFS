/**
 * Script pour créer le premier utilisateur support
 * Usage: npx ts-node scripts/create-support-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Clé service (pas la clé anonyme)

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erreur: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env');
  process.exit(1);
}

// Créer un client Supabase avec la clé service (permissions admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createSupportUser() {
  try {
    console.log('🔐 Création du premier utilisateur support\n');

    // Demander les informations
    const email = await question('Email: ');
    const password = await question('Mot de passe: ');
    const fullName = await question('Nom complet: ');

    if (!email || !password || !fullName) {
      console.error('❌ Tous les champs sont requis');
      rl.close();
      return;
    }

    console.log('\n⏳ Création de l\'utilisateur dans Supabase Auth...');

    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmer l'email automatiquement
    });

    if (authError) {
      console.error('❌ Erreur lors de la création dans Auth:', authError.message);
      rl.close();
      return;
    }

    if (!authData.user) {
      console.error('❌ Utilisateur non créé');
      rl.close();
      return;
    }

    console.log('✅ Utilisateur créé dans Auth:', authData.user.id);

    // Créer le profil dans la table users
    console.log('⏳ Création du profil utilisateur...');

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        airport_code: 'ALL', // Accès à tous les aéroports
        role: 'support',
        is_approved: true, // Approuvé automatiquement
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Erreur lors de la création du profil:', userError.message);
      // Nettoyer l'utilisateur Auth créé
      await supabase.auth.admin.deleteUser(authData.user.id);
      rl.close();
      return;
    }

    console.log('\n✅ Utilisateur support créé avec succès !\n');
    console.log('📋 Informations:');
    console.log(`   ID: ${userData.id}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Nom: ${userData.full_name}`);
    console.log(`   Rôle: ${userData.role}`);
    console.log(`   Approuvé: ${userData.is_approved}`);
    console.log(`   Aéroport: ${userData.airport_code}\n`);

    console.log('🎉 Vous pouvez maintenant vous connecter au dashboard avec cet email et mot de passe');
    console.log('   Vous aurez accès à la page "Approbations" pour gérer les demandes d\'inscription.\n');

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
  } finally {
    rl.close();
  }
}

createSupportUser();

