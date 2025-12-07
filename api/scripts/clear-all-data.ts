#!/usr/bin/env ts-node
/**
 * Script pour nettoyer TOUTES les données de test dans Supabase
 * ⚠️  ATTENTION: Ce script supprime TOUT sauf les utilisateurs superviseurs
 * 
 * Usage: npm run clear-all
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes !');
  console.error('Vérifiez que SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définis dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearAllData() {
  console.log('🧹 ========================================');
  console.log('🧹  NETTOYAGE COMPLET DES DONNÉES CLOUD');
  console.log('🧹 ========================================\n');

  try {
    // 1. Compter les données avant nettoyage
    console.log('📊 Comptage des données avant nettoyage...\n');

    const { count: passengersCount } = await supabase
      .from('passengers')
      .select('*', { count: 'exact', head: true });

    const { count: baggagesCount } = await supabase
      .from('baggages')
      .select('*', { count: 'exact', head: true });

    const { count: boardingCount } = await supabase
      .from('boarding_status')
      .select('*', { count: 'exact', head: true });

    const { count: intBaggagesCount } = await supabase
      .from('international_baggages')
      .select('*', { count: 'exact', head: true });

    const { count: auditCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    console.log(`   • Passagers: ${passengersCount || 0}`);
    console.log(`   • Bagages: ${baggagesCount || 0}`);
    console.log(`   • Statuts embarquement: ${boardingCount || 0}`);
    console.log(`   • Bagages internationaux: ${intBaggagesCount || 0}`);
    console.log(`   • Logs audit: ${auditCount || 0}\n`);

    const total = (passengersCount || 0) + (baggagesCount || 0) + (boardingCount || 0) + 
                  (intBaggagesCount || 0) + (auditCount || 0);

    if (total === 0) {
      console.log('✅ Aucune donnée à nettoyer. Base déjà vide!\n');
      return;
    }

    // 2. Supprimer les données dans l'ordre (pour respecter les contraintes FK)
    console.log('🗑️  Suppression des données...\n');

    // Supprimer les statuts d'embarquement (dépend de passengers)
    const { error: boardingError } = await supabase
      .from('boarding_status')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprimer tout

    if (boardingError) {
      console.error('❌ Erreur statuts embarquement:', boardingError);
    } else {
      console.log(`   ✅ ${boardingCount || 0} statuts embarquement supprimés`);
    }

    // Supprimer les bagages internationaux
    const { error: intBaggageError } = await supabase
      .from('international_baggages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (intBaggageError) {
      console.error('❌ Erreur bagages internationaux:', intBaggageError);
    } else {
      console.log(`   ✅ ${intBaggagesCount || 0} bagages internationaux supprimés`);
    }

    // Supprimer les bagages (dépend de passengers)
    const { error: baggageError } = await supabase
      .from('baggages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (baggageError) {
      console.error('❌ Erreur bagages:', baggageError);
    } else {
      console.log(`   ✅ ${baggagesCount || 0} bagages supprimés`);
    }

    // Supprimer les passagers
    const { error: passengerError } = await supabase
      .from('passengers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (passengerError) {
      console.error('❌ Erreur passagers:', passengerError);
    } else {
      console.log(`   ✅ ${passengersCount || 0} passagers supprimés`);
    }

    // Supprimer les logs d'audit
    const { error: auditError } = await supabase
      .from('audit_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (auditError) {
      console.error('❌ Erreur logs audit:', auditError);
    } else {
      console.log(`   ✅ ${auditCount || 0} logs audit supprimés`);
    }

    console.log('\n✨ ========================================');
    console.log('✨  NETTOYAGE TERMINÉ AVEC SUCCÈS !');
    console.log('✨ ========================================\n');
    console.log(`📊 Total supprimé: ${total} enregistrements\n`);
    console.log('💡 Les utilisateurs superviseurs ont été préservés.\n');

  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('❌  ERREUR LORS DU NETTOYAGE');
    console.error('❌ ========================================\n');
    console.error(error);
    process.exit(1);
  }
}

// Exécuter le script
clearAllData()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
