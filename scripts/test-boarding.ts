/**
 * Script de test pour vérifier que le boarding fonctionne sans blocage d'aéroport
 */

import { parserService } from '../src/services/parser.service';

// Test avec différents boarding passes
const testBoardingPasses = [
  {
    name: 'Air Congo - FIH-JNB',
    data: 'M1KATEBA9U123FIHJNB143012A4071161863002',
    expectedDeparture: 'FIH',
    expectedArrival: 'JNB',
  },
  {
    name: 'Ethiopian - ADD-FIH',
    data: 'M1SMITH/JOHN WILLIAMET701ADDFIH080015B4071161870001',
    expectedDeparture: 'ADD',
    expectedArrival: 'FIH',
  },
  {
    name: 'Boarding pass réel (exemple)',
    data: 'M1KALONJI KABWE/OSCAREYFMKNE FIHFBMET',
    expectedDeparture: 'FIH',
    expectedArrival: 'FBM',
  },
];

console.log('🧪 Test du parsing des boarding passes\n');

testBoardingPasses.forEach((test, index) => {
  console.log(`\n--- Test ${index + 1}: ${test.name} ---`);
  console.log(`Données brutes: ${test.data}`);
  
  try {
    const parsed = parserService.parse(test.data);
    
    console.log('✅ Parsing réussi:');
    console.log(`  - PNR: ${parsed.pnr}`);
    console.log(`  - Nom: ${parsed.fullName}`);
    console.log(`  - Vol: ${parsed.flightNumber}`);
    console.log(`  - Départ: ${parsed.departure} (attendu: ${test.expectedDeparture})`);
    console.log(`  - Arrivée: ${parsed.arrival} (attendu: ${test.expectedArrival})`);
    console.log(`  - Route: ${parsed.route}`);
    console.log(`  - Format: ${parsed.format}`);
    
    // Vérifier les codes aéroports
    if (parsed.departure === test.expectedDeparture) {
      console.log('  ✅ Code départ correct');
    } else {
      console.log(`  ⚠️  Code départ différent (${parsed.departure} vs ${test.expectedDeparture})`);
    }
    
    if (parsed.arrival === test.expectedArrival) {
      console.log('  ✅ Code arrivée correct');
    } else {
      console.log(`  ⚠️  Code arrivée différent (${parsed.arrival} vs ${test.expectedArrival})`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du parsing:', error);
  }
});

console.log('\n\n✅ Tests terminés');
console.log('\n📝 Note: La vérification d\'aéroport est désactivée en mode test');
console.log('   Vous pouvez scanner n\'importe quel boarding pass sans blocage');

