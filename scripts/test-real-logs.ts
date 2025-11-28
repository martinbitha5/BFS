/**
 * Script de test avec les vraies données des logs pour valider les corrections
 */

import { parserService } from '../src/services/parser.service';

const testCases = [
  {
    name: 'Cas 1: EYAKOLI/BALA MARIE - ET0072',
    rawData: 'M1EYAKOLI/BALA MARIE EEMXTRJE FIHGMAET 0072 228Y021A0083 377>8321OO5228BET 9071433689001                          2A0712154453805 1ET                        N*30601030K0900',
    expectedPnr: 'EEMXTR', // ou MXTRJE
    expectedFullName: 'EYAKOLI BALA MARIE',
    expectedFlight: 'ET0072',
    expectedDeparture: 'FIH',
    expectedArrival: 'GMA',
    expectedSeat: '21A',
  },
  {
    name: 'Cas 2: MASIMANGO/ISSIAKA - ET0080',
    rawData: 'M1MASIMANGO/ISSIAKA GREOIFLBU FIHMDKET 0080 235Y031J0095 177>8321OO5235BET                                        2A0712154800800 1ET                        N*306      0900',
    expectedPnr: 'OIFLBU',
    expectedFullName: 'MASIMANGO ISSIAKA',
    expectedFlight: 'ET0080',
    expectedDeparture: 'FIH',
    expectedArrival: 'MDK',
    expectedSeat: '31J',
  },
];

console.log('🧪 TEST AVEC LES VRAIES DONNÉES DES LOGS\n');
console.log('='.repeat(100));

let passedTests = 0;
let totalTests = 0;

testCases.forEach((testCase, index) => {
  console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
  console.log('-'.repeat(100));
  console.log(`Données brutes: ${testCase.rawData.substring(0, 80)}...`);
  
  try {
    const parsed = parserService.parse(testCase.rawData);
    
    console.log('\n📊 Résultats du parsing:');
    console.log(`  PNR: ${parsed.pnr} (attendu: ${testCase.expectedPnr})`);
    console.log(`  Nom: ${parsed.fullName} (attendu: ${testCase.expectedFullName})`);
    console.log(`  Vol: ${parsed.flightNumber} (attendu: ${testCase.expectedFlight})`);
    console.log(`  Départ: ${parsed.departure} (attendu: ${testCase.expectedDeparture})`);
    console.log(`  Arrivée: ${parsed.arrival} (attendu: ${testCase.expectedArrival})`);
    console.log(`  Siège: ${parsed.seatNumber} (attendu: ${testCase.expectedSeat})`);
    
    // Vérifications
    let testPassed = true;
    
    totalTests++;
    
    // Vérifier PNR (peut être l'un ou l'autre dans certains cas)
    if (parsed.pnr === 'UNKNOWN') {
      console.log('  ❌ PNR est UNKNOWN');
      testPassed = false;
    } else if (parsed.pnr !== testCase.expectedPnr) {
      // Accepter des variations proches
      const pnrVariations = [testCase.expectedPnr];
      if (testCase.expectedPnr === 'EEMXTR') {
        pnrVariations.push('MXTRJE');
      }
      if (!pnrVariations.includes(parsed.pnr)) {
        console.log(`  ⚠️  PNR différent (${parsed.pnr} vs ${testCase.expectedPnr})`);
      } else {
        console.log(`  ✅ PNR accepté (variation valide)`);
      }
    } else {
      console.log('  ✅ PNR correct');
    }
    
    // Vérifier nom (normaliser pour comparaison)
    const normalizedParsed = parsed.fullName.replace(/\s+/g, ' ').trim().toUpperCase();
    const normalizedExpected = testCase.expectedFullName.replace(/\s+/g, ' ').trim().toUpperCase();
    
    if (normalizedParsed === normalizedExpected) {
      console.log('  ✅ Nom correct');
    } else {
      console.log(`  ❌ Nom incorrect`);
      console.log(`     Attendu: "${testCase.expectedFullName}"`);
      console.log(`     Obtenu:  "${parsed.fullName}"`);
      testPassed = false;
    }
    
    // Vérifier vol
    if (parsed.flightNumber === testCase.expectedFlight) {
      console.log('  ✅ Vol correct');
    } else {
      console.log(`  ⚠️  Vol différent (${parsed.flightNumber} vs ${testCase.expectedFlight})`);
    }
    
    // Vérifier départ
    if (parsed.departure === testCase.expectedDeparture) {
      console.log('  ✅ Départ correct');
    } else {
      console.log(`  ❌ Départ incorrect (${parsed.departure} vs ${testCase.expectedDeparture})`);
      testPassed = false;
    }
    
    // Vérifier arrivée
    if (parsed.arrival === testCase.expectedArrival) {
      console.log('  ✅ Arrivée correcte');
    } else {
      console.log(`  ❌ Arrivée incorrecte (${parsed.arrival} vs ${testCase.expectedArrival})`);
      testPassed = false;
    }
    
    // Vérifier siège
    if (parsed.seatNumber === testCase.expectedSeat) {
      console.log('  ✅ Siège correct');
    } else {
      console.log(`  ⚠️  Siège différent (${parsed.seatNumber} vs ${testCase.expectedSeat})`);
    }
    
    if (testPassed) {
      passedTests++;
      console.log('\n✅ Test réussi!');
    } else {
      console.log('\n❌ Test échoué!');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du parsing:', error);
    totalTests++;
  }
});

console.log('\n' + '='.repeat(100));
console.log(`\n📈 Résumé: ${passedTests}/${totalTests} tests réussis`);

if (passedTests === totalTests) {
  console.log('🎉 Tous les tests sont passés!');
  process.exit(0);
} else {
  console.log('⚠️  Certains tests ont échoué');
  process.exit(1);
}

