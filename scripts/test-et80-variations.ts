/**
 * Test avec différentes variations des données du boarding pass ET80
 * pour s'assurer que le parser fonctionne dans tous les cas
 */

import { parserService } from '../src/services/parser.service';

const testCases = [
  {
    name: 'Données réelles exactes',
    data: 'M1MASIMANGO/ISSIAKA GREOIFLBUFIHMDKET 0080 235Y031J0095177>8321005235BET2A0712154800800 1ET0900',
    expectedPnr: 'OIFLBU',
    expectedName: 'MASIMANGO ISSIAKA',
  },
  {
    name: 'Avec espace avant GRE',
    data: 'M1MASIMANGO/ISSIAKA GREOIFLBUFIHMDKET0080',
    expectedPnr: 'OIFLBU',
    expectedName: 'MASIMANGO ISSIAKA',
  },
  {
    name: 'Sans espace',
    data: 'M1MASIMANGO/ISSIAKAGREOIFLBUFIHMDKET0080',
    expectedPnr: 'OIFLBU',
    expectedName: 'MASIMANGO ISSIAKA',
  },
  {
    name: 'Avec espaces multiples',
    data: 'M1MASIMANGO/ISSIAKA  GREOIFLBUFIHMDKET 0080',
    expectedPnr: 'OIFLBU',
    expectedName: 'MASIMANGO ISSIAKA',
  },
];

console.log('🧪 TEST AVEC VARIATIONS DES DONNÉES ET80\n');
console.log('='.repeat(80));

let allPassed = true;

testCases.forEach((testCase, index) => {
  console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
  console.log('─'.repeat(80));
  console.log(`Données: ${testCase.data.substring(0, 50)}...`);
  
  try {
    const result = parserService.parse(testCase.data);
    
    const pnrOk = result.pnr === testCase.expectedPnr;
    const nameOk = result.fullName === testCase.expectedName;
    
    console.log(`PNR: ${result.pnr} ${pnrOk ? '✅' : '❌'} (attendu: ${testCase.expectedPnr})`);
    console.log(`Nom: ${result.fullName} ${nameOk ? '✅' : '❌'} (attendu: ${testCase.expectedName})`);
    
    if (!pnrOk || !nameOk) {
      allPassed = false;
      console.log('❌ ÉCHEC');
    } else {
      console.log('✅ RÉUSSI');
    }
  } catch (error) {
    console.error('❌ ERREUR:', error);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(80));
if (allPassed) {
  console.log('\n✅✅✅ TOUS LES TESTS SONT PASSÉS! ✅✅✅\n');
} else {
  console.log('\n❌ CERTAINS TESTS ONT ÉCHOUÉ!\n');
  process.exit(1);
}

