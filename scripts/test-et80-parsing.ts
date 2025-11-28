/**
 * Test spécifique pour le boarding pass ET80 avec MASIMANGO/ISSIAKA GR et PNR OIFLBU
 * Ce test simule exactement ce que le scanner voit
 */

import { parserService } from '../src/services/parser.service';

// Données brutes simulées basées sur le boarding pass réel ET80
// Format probable: M1MASIMANGO/ISSIAKA GROIFLBUET80...
const testCases = [
  {
    name: 'ET80 - Format avec PNR collé (GROIFLBUET80)',
    data: 'M1MASIMANGO/ISSIAKA GROIFLBUET8031JFIHMDK071523AUG23AUG07121548008004KD/FIH',
    expectedPnr: 'OIFLBU',
    expectedFullName: 'MASIMANGO ISSIAKA',
    expectedFlight: 'ET80',
    expectedSeat: '31J',
  },
  {
    name: 'ET80 - Format alternatif 1',
    data: 'M1MASIMANGO/ISSIAKA GROIFLBUET80 31J FIHMDK071523AUG',
    expectedPnr: 'OIFLBU',
    expectedFullName: 'MASIMANGO ISSIAKA',
    expectedFlight: 'ET80',
    expectedSeat: '31J',
  },
  {
    name: 'ET80 - Format alternatif 2 (avec espace)',
    data: 'M1MASIMANGO/ISSIAKA GR OIFLBU ET80 31J',
    expectedPnr: 'OIFLBU',
    expectedFullName: 'MASIMANGO ISSIAKA',
    expectedFlight: 'ET80',
    expectedSeat: '31J',
  },
  {
    name: 'ET80 - Format compact',
    data: 'M1MASIMANGO/ISSIAKAGROIFLBUET8031J',
    expectedPnr: 'OIFLBU',
    expectedFullName: 'MASIMANGO ISSIAKA',
    expectedFlight: 'ET80',
    expectedSeat: '31J',
  },
];

console.log('🧪 Test du parsing pour le boarding pass ET80\n');
console.log('='.repeat(80));

testCases.forEach((testCase, index) => {
  console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
  console.log('─'.repeat(80));
  console.log(`Données brutes: ${testCase.data}`);
  console.log(`\nAttendu:`);
  console.log(`  - PNR: ${testCase.expectedPnr}`);
  console.log(`  - Nom complet: ${testCase.expectedFullName}`);
  console.log(`  - Vol: ${testCase.expectedFlight}`);
  console.log(`  - Siège: ${testCase.expectedSeat}`);
  
  try {
    const parsed = parserService.parse(testCase.data);
    
    console.log(`\n✅ Parsing réussi:`);
    console.log(`  - Format détecté: ${parsed.format}`);
    console.log(`  - PNR: ${parsed.pnr} ${parsed.pnr === testCase.expectedPnr ? '✅' : '❌'}`);
    console.log(`  - Nom complet: ${parsed.fullName} ${parsed.fullName === testCase.expectedFullName ? '✅' : '❌'}`);
    console.log(`  - Vol: ${parsed.flightNumber} ${parsed.flightNumber === testCase.expectedFlight ? '✅' : '❌'}`);
    console.log(`  - Siège: ${parsed.seatNumber || 'N/A'} ${parsed.seatNumber === testCase.expectedSeat ? '✅' : '❌'}`);
    console.log(`  - Route: ${parsed.route}`);
    console.log(`  - Départ: ${parsed.departure}`);
    console.log(`  - Arrivée: ${parsed.arrival}`);
    
    // Vérifier les résultats
    const errors: string[] = [];
    if (parsed.pnr !== testCase.expectedPnr) {
      errors.push(`PNR incorrect: ${parsed.pnr} au lieu de ${testCase.expectedPnr}`);
    }
    if (parsed.fullName !== testCase.expectedFullName) {
      errors.push(`Nom incorrect: ${parsed.fullName} au lieu de ${testCase.expectedFullName}`);
    }
    if (parsed.flightNumber !== testCase.expectedFlight) {
      errors.push(`Vol incorrect: ${parsed.flightNumber} au lieu de ${testCase.expectedFlight}`);
    }
    if (parsed.seatNumber !== testCase.expectedSeat) {
      errors.push(`Siège incorrect: ${parsed.seatNumber || 'N/A'} au lieu de ${testCase.expectedSeat}`);
    }
    
    if (errors.length > 0) {
      console.log(`\n❌ Erreurs détectées:`);
      errors.forEach(err => console.log(`   - ${err}`));
    } else {
      console.log(`\n✅ Tous les résultats sont corrects!`);
    }
    
  } catch (error) {
    console.error(`\n❌ Erreur lors du parsing:`, error);
  }
  
  console.log('─'.repeat(80));
});

console.log('\n\n✅ Tests terminés');

