/**
 * Test des formats BIRS réels des compagnies
 */

import * as fs from 'fs';
import * as path from 'path';
import { birsRealFormatParserService } from '../src/services/birs-real-format-parser.service';

console.log('═══════════════════════════════════════════════════════');
console.log('🧪 TEST PARSING FORMATS BIRS RÉELS');
console.log('═══════════════════════════════════════════════════════\n');

interface TestResult {
  airline: string;
  success: boolean;
  itemCount: number;
  duration: number;
  errors?: string[];
}

const results: TestResult[] = [];

async function testTurkishAirlinesFormat() {
  console.log('▶️  Test 1: Turkish Airlines Format (TK540)\n');
  
  const startTime = Date.now();
  
  try {
    const filePath = path.join(__dirname, '../test-files/REAL_TK540_MANIFEST_28NOV.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    console.log('[TEST] 📄 Fichier chargé:', filePath);
    console.log(`[TEST] 📊 Taille: ${content.length} caractères\n`);
    
    const result = birsRealFormatParserService.parseTurkishAirlines(content, 'TK540_MANIFEST_28NOV.txt');
    
    console.log('[TEST] 📋 Résultat du parsing:');
    console.log(`   - Compagnie: ${result.airline}`);
    console.log(`   - Vol: ${result.flightNumber}`);
    console.log(`   - Date: ${result.flightDate}`);
    console.log(`   - Route: ${result.origin} → ${result.destination}`);
    console.log(`   - Bagages trouvés: ${result.items.length}\n`);
    
    // Afficher quelques exemples
    console.log('[TEST] 📦 Échantillon de bagages:');
    result.items.slice(0, 5).forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.bagId} - ${item.passengerName}`);
    });
    console.log('');
    
    // Validation
    const validation = birsRealFormatParserService.validateParsedData(result);
    
    if (validation.valid) {
      console.log('✅ Test 1 - Turkish Airlines - RÉUSSI\n');
      results.push({
        airline: 'Turkish Airlines',
        success: true,
        itemCount: result.items.length,
        duration: Date.now() - startTime
      });
    } else {
      console.error('❌ Test 1 - Erreurs de validation:');
      validation.errors.forEach(err => console.error(`   - ${err}`));
      console.log('');
      results.push({
        airline: 'Turkish Airlines',
        success: false,
        itemCount: result.items.length,
        duration: Date.now() - startTime,
        errors: validation.errors
      });
    }
    
  } catch (error) {
    console.error('❌ Test 1 - ÉCHEC:', error instanceof Error ? error.message : error);
    console.log('');
    results.push({
      airline: 'Turkish Airlines',
      success: false,
      itemCount: 0,
      duration: Date.now() - startTime,
      errors: [error instanceof Error ? error.message : 'Erreur inconnue']
    });
  }
}

async function testBrusselsAirlinesFormat() {
  console.log('▶️  Test 2: Brussels Airlines Format (SN)\n');
  
  const startTime = Date.now();
  
  try {
    const filePath = path.join(__dirname, '../test-files/REAL_SN_BRU_FIH_MANIFEST.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    console.log('[TEST] 📄 Fichier chargé:', filePath);
    console.log(`[TEST] 📊 Taille: ${content.length} caractères\n`);
    
    const result = birsRealFormatParserService.parseBrusselsAirlines(content, 'SN_BRU_FIH_MANIFEST.txt');
    
    console.log('[TEST] 📋 Résultat du parsing:');
    console.log(`   - Compagnie: ${result.airline}`);
    console.log(`   - Vol: ${result.flightNumber}`);
    console.log(`   - Date: ${result.flightDate}`);
    console.log(`   - Route: ${result.origin} → ${result.destination}`);
    console.log(`   - Bagages trouvés: ${result.items.length}\n`);
    
    // Afficher quelques exemples
    console.log('[TEST] 📦 Échantillon de bagages:');
    result.items.slice(0, 5).forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.bagId} - ${item.passengerName} - PNR: ${item.pnr} - ${item.weight}kg - Classe: ${item.class}`);
    });
    console.log('');
    
    // Validation
    const validation = birsRealFormatParserService.validateParsedData(result);
    
    if (validation.valid) {
      console.log('✅ Test 2 - Brussels Airlines - RÉUSSI\n');
      results.push({
        airline: 'Brussels Airlines',
        success: true,
        itemCount: result.items.length,
        duration: Date.now() - startTime
      });
    } else {
      console.error('❌ Test 2 - Erreurs de validation:');
      validation.errors.forEach(err => console.error(`   - ${err}`));
      console.log('');
      results.push({
        airline: 'Brussels Airlines',
        success: false,
        itemCount: result.items.length,
        duration: Date.now() - startTime,
        errors: validation.errors
      });
    }
    
  } catch (error) {
    console.error('❌ Test 2 - ÉCHEC:', error instanceof Error ? error.message : error);
    console.log('');
    results.push({
      airline: 'Brussels Airlines',
      success: false,
      itemCount: 0,
      duration: Date.now() - startTime,
      errors: [error instanceof Error ? error.message : 'Erreur inconnue']
    });
  }
}

async function testAutoDetection() {
  console.log('▶️  Test 3: Auto-détection de Format\n');
  
  const startTime = Date.now();
  
  try {
    // Test avec Turkish Airlines
    const tkPath = path.join(__dirname, '../test-files/REAL_TK540_MANIFEST_28NOV.txt');
    const tkContent = fs.readFileSync(tkPath, 'utf-8');
    
    console.log('[TEST] 🔍 Test auto-détection sur Turkish Airlines...');
    const tkResult = birsRealFormatParserService.parseAutoDetect(tkContent, 'TK540_MANIFEST.txt');
    console.log(`   ✓ Détecté: ${tkResult.airline} (${tkResult.items.length} bagages)\n`);
    
    // Test avec Brussels Airlines
    const snPath = path.join(__dirname, '../test-files/REAL_SN_BRU_FIH_MANIFEST.txt');
    const snContent = fs.readFileSync(snPath, 'utf-8');
    
    console.log('[TEST] 🔍 Test auto-détection sur Brussels Airlines...');
    const snResult = birsRealFormatParserService.parseAutoDetect(snContent, 'SN_MANIFEST.txt');
    console.log(`   ✓ Détecté: ${snResult.airline} (${snResult.items.length} bagages)\n`);
    
    console.log('✅ Test 3 - Auto-détection - RÉUSSI\n');
    results.push({
      airline: 'Auto-détection',
      success: true,
      itemCount: tkResult.items.length + snResult.items.length,
      duration: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('❌ Test 3 - ÉCHEC:', error instanceof Error ? error.message : error);
    console.log('');
    results.push({
      airline: 'Auto-détection',
      success: false,
      itemCount: 0,
      duration: Date.now() - startTime,
      errors: [error instanceof Error ? error.message : 'Erreur inconnue']
    });
  }
}

// Exécuter tous les tests
async function runAllTests() {
  await testTurkishAirlinesFormat();
  await testBrusselsAirlinesFormat();
  await testAutoDetection();
  
  // Résumé
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const totalTests = results.length;
  const successCount = results.filter(r => r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const totalBags = results.reduce((sum, r) => sum + r.itemCount, 0);
  
  console.log(`Total tests: ${totalTests}`);
  console.log(`✅ Réussis: ${successCount}`);
  console.log(`❌ Échoués: ${totalTests - successCount}`);
  console.log(`⏱️  Durée totale: ${totalDuration}ms`);
  console.log(`📦 Total bagages parsés: ${totalBags}\n`);
  
  console.log('Détails par compagnie:');
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${result.airline.padEnd(30)} ${result.itemCount} bagages  ${result.duration}ms`);
    if (result.errors && result.errors.length > 0) {
      result.errors.forEach(err => console.log(`   ⚠️  ${err}`));
    }
  });
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(successCount === totalTests ? '🎉 TOUS LES TESTS RÉUSSIS !' : '⚠️  CERTAINS TESTS ONT ÉCHOUÉ');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('💡 Formats supportés:');
  console.log('   ✓ Turkish Airlines (TK) - Format texte avec colonnes');
  console.log('   ✓ Brussels Airlines (SN) - Format structuré avec DEVICE ID');
  console.log('   ✓ Ethiopian Airlines (ET) - Format CSV');
  console.log('   ✓ Auto-détection automatique du format\n');
  
  console.log('📁 Fichiers de test utilisés:');
  console.log('   ✓ test-files/REAL_TK540_MANIFEST_28NOV.txt');
  console.log('   ✓ test-files/REAL_SN_BRU_FIH_MANIFEST.txt\n');
  
  process.exit(successCount === totalTests ? 0 : 1);
}

runAllTests();
