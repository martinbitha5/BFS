/**
 * Script pour créer automatiquement le compte support pour le Dashboard
 * Email: support@brsats.com
 * Mot de passe: 0827241919mA@
 * Rôle: support (accès complet au Dashboard)
 * 
 * Usage:
 *   cd api
 *   npm run create-support-dashboard-user
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERREUR: SUPABASE_URL et SUPABASE_SERVICE_KEY doivent être définis dans api/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const SUPPORT_EMAIL = 'support@brsats.com';
const SUPPORT_PASSWORD = '0827241919mA@';
const SUPPORT_NAME = 'BRSATS Support';

async function createSupportUser() {
  console.log('🚀 Création du compte support pour le Dashboard...\n');
  console.log(`📧 Email: ${SUPPORT_EMAIL}`);
  console.log(`👤 Nom: ${SUPPORT_NAME}`);
  console.log(`🔑 Rôle: support\n`);

  try {
    // Vérifier si l'utilisateur existe déjà dans Auth
    console.log('🔍 Vérification de l\'existence de l\'utilisateur...');
    const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
    
    const existingAuthUser = usersList?.users?.find(u => u.email === SUPPORT_EMAIL);
    let userId: string;

    if (existingAuthUser) {
      console.log(`⚠️  Utilisateur Auth existe déjà: ${existingAuthUser.id}`);
      userId = existingAuthUser.id;

      // Réinitialiser le mot de passe si nécessaire
      console.log('🔄 Réinitialisation du mot de passe...');
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: SUPPORT_PASSWORD,
        email_confirm: true,
      });

      if (updateError) {
        console.error(`❌ Erreur lors de la réinitialisation du mot de passe: ${updateError.message}`);
      } else {
        console.log('✅ Mot de passe réinitialisé');
      }
    } else {
      // Créer l'utilisateur dans Supabase Auth
      console.log('⏳ Création de l\'utilisateur dans Supabase Auth...');
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: SUPPORT_EMAIL,
        password: SUPPORT_PASSWORD,
        email_confirm: true, // Confirmer l'email automatiquement
      });

      if (authError) {
        console.error(`❌ Erreur lors de la création dans Auth: ${authError.message}`);
        process.exit(1);
      }

      if (!authData.user) {
        console.error('❌ Utilisateur non créé');
        process.exit(1);
      }

      userId = authData.user.id;
      console.log(`✅ Utilisateur Auth créé: ${userId}`);
    }

    // Vérifier si le profil existe déjà dans la table users
    console.log('\n🔍 Vérification du profil utilisateur...');
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      console.log('⚠️  Profil existe déjà, mise à jour...');
      
      // Mettre à jour le profil
      const { data: updatedProfile, error: updateError } = await supabase
        .from('users')
        .update({
          email: SUPPORT_EMAIL,
          full_name: SUPPORT_NAME,
          airport_code: 'ALL',
          role: 'support',
          is_approved: true,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error(`❌ Erreur lors de la mise à jour du profil: ${updateError.message}`);
        process.exit(1);
      }

      console.log('✅ Profil mis à jour avec succès');
      console.log('\n📋 Informations du compte:');
      console.log(`   ID: ${updatedProfile.id}`);
      console.log(`   Email: ${updatedProfile.email}`);
      console.log(`   Nom: ${updatedProfile.full_name}`);
      console.log(`   Rôle: ${updatedProfile.role}`);
      console.log(`   Aéroport: ${updatedProfile.airport_code}`);
      console.log(`   Approuvé: ${updatedProfile.is_approved ? 'Oui' : 'Non'}`);

    } else {
      // Créer le profil dans la table users
      console.log('⏳ Création du profil utilisateur...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: SUPPORT_EMAIL,
          full_name: SUPPORT_NAME,
          airport_code: 'ALL', // Accès à tous les aéroports
          role: 'support',
          is_approved: true, // Approuvé automatiquement
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (userError) {
        console.error(`❌ Erreur lors de la création du profil: ${userError.message}`);
        // Nettoyer l'utilisateur Auth créé si le profil n'a pas pu être créé
        if (!existingAuthUser) {
          await supabase.auth.admin.deleteUser(userId);
        }
        process.exit(1);
      }

      console.log('✅ Profil créé avec succès');
      console.log('\n📋 Informations du compte:');
      console.log(`   ID: ${userData.id}`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Nom: ${userData.full_name}`);
      console.log(`   Rôle: ${userData.role}`);
      console.log(`   Aéroport: ${userData.airport_code}`);
      console.log(`   Approuvé: ${userData.is_approved ? 'Oui' : 'Non'}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ ✅ ✅ COMPTE SUPPORT CRÉÉ AVEC SUCCÈS ✅ ✅ ✅');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n🔐 Identifiants de connexion:`);
    console.log(`   Email: ${SUPPORT_EMAIL}`);
    console.log(`   Mot de passe: ${SUPPORT_PASSWORD}`);
    console.log(`\n🌐 Vous pouvez maintenant vous connecter au Dashboard avec ces identifiants.`);

  } catch (error: any) {
    console.error('❌ ERREUR FATALE:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createSupportUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

