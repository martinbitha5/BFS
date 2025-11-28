/**
 * Test du parser réel avec des données de boarding pass
 * Usage: npm run test:parser ou tsx scripts/test-parser-real.ts
 */

import { parserService } from '../src/services/parser.service';

console.log('='.repeat(80));
console.log('TEST DU PARSER RÉEL DE CHECK-IN');
console.log('='.repeat(80));

// Test avec des données réelles basées sur le format documenté
const testCases = [
  {
    name: 'Test 1: Format Air Congo réel (avec PNR collé au nom)',
    rawData: 'M1KALONJI KABWE/OSCAREYFMKNE FIHFBMET',
    description: 'Format réel où le PNR EYFMKNE est collé au nom',
  },
  {
    name: 'Test 2: Format Air Congo mocké (sans PNR visible)',
    rawData: 'M1KATEBA9U123FIHJNB143012A4071161863002',
    description: 'Format mocké qui ne contient pas explicitement le PNR',
  },
  {
    name: 'Test 3: Format Air Congo mocké 2',
    rawData: 'M1MUKAMBA9U456FIHLAD160008B4071161870001',
    description: 'Deuxième format mocké',
  },
  {
    name: 'Test 4: Format Ethiopian Airlines',
    rawData: 'M1SMITH/JOHN WILLIAMET701ADDJNB143012A4071161870001',
    description: 'Format Ethiopian avec ET701 comme numéro de vol',
  },
];

console.log('\n📋 Tests du parser:\n');

testCases.forEach((testCase, index) => {
  console.log(`${'─'.repeat(80)}`);
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log(`   ${testCase.description}`);
  console.log(`\n   Données brutes: ${testCase.rawData}`);
  console.log(`   Longueur: ${testCase.rawData.length} caractères`);
  
  try {
    const result = parserService.parse(testCase.rawData);
    
    console.log(`\n   ✅ Parsing réussi!`);
    console.log(`\n   📊 Résultats:`);
    console.log(`      Format détecté      : ${result.format}`);
    console.log(`      PNR                 : ${result.pnr}`);
    console.log(`      Nom complet         : ${result.fullName}`);
    console.log(`      Prénom              : ${result.firstName}`);
    console.log(`      Nom de famille      : ${result.lastName}`);
    console.log(`      Numéro de vol       : ${result.flightNumber}`);
    console.log(`      Route               : ${result.route}`);
    console.log(`      Départ              : ${result.departure}`);
    console.log(`      Arrivée             : ${result.arrival}`);
    console.log(`      Heure du vol        : ${result.flightTime || 'N/A'}`);
    console.log(`      Numéro de siège     : ${result.seatNumber || 'N/A'}`);
    console.log(`      Code compagnie      : ${result.companyCode || 'N/A'}`);
    console.log(`      Compagnie           : ${result.airline || 'N/A'}`);
    
    if (result.baggageInfo) {
      console.log(`\n      🛄 Informations bagages:`);
      console.log(`         Nombre           : ${result.baggageInfo.count}`);
      console.log(`         Numéro de base   : ${result.baggageInfo.baseNumber || 'N/A'}`);
      if (result.baggageInfo.expectedTags && result.baggageInfo.expectedTags.length > 0) {
        console.log(`         Tags attendus    : ${result.baggageInfo.expectedTags.slice(0, 3).join(', ')}${result.baggageInfo.expectedTags.length > 3 ? '...' : ''}`);
      }
    }
    
    // Vérifications
    const issues: string[] = [];
    if (result.pnr === 'UNKNOWN') {
      issues.push('⚠️  PNR non trouvé (UNKNOWN)');
    }
    if (result.fullName === 'UNKNOWN') {
      issues.push('⚠️  Nom non trouvé (UNKNOWN)');
    }
    if (result.flightNumber === 'UNKNOWN') {
      issues.push('⚠️  Numéro de vol non trouvé (UNKNOWN)');
    }
    if (result.departure === 'UNK' || result.arrival === 'UNK') {
      issues.push('⚠️  Route non trouvée (UNK)');
    }
    
    if (issues.length > 0) {
      console.log(`\n   ⚠️  Problèmes détectés:`);
      issues.forEach(issue => console.log(`      ${issue}`));
    } else {
      console.log(`\n   ✅ Toutes les données essentielles ont été extraites!`);
    }
    
  } catch (error) {
    console.error(`\n   ❌ Erreur lors du parsing:`);
    console.error(`      ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`\n   Stack trace:`);
      console.error(error.stack);
    }
  }
});

console.log(`\n${'─'.repeat(80)}`);
console.log('\n✅ Tests terminés!\n');

