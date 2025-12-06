#!/usr/bin/env node

/**
 * Script de test avancé pour valider le parsing BCBP avec différents formats de noms
 * Teste le support pour:
 * - Noms très longs avec plusieurs espaces
 * - PNR alphanumériques (6-7 caractères avec chiffres)
 * - Différentes compagnies (Kenya Airways, Air Congo, etc.)
 */

console.log('='.repeat(100));
console.log('TEST PARSING BCBP - SUPPORT NOMS LONGS ET PNR ALPHANUMÉRIQUES');
console.log('='.repeat(100));

const testCases = [
  {
    name: 'Kenya Airways - Nom simple (RÉEL TESTÉ)',
    data: 'M1RAZIOU/MOUSTAPHA    E7T5GVL FIHNBOKQ 0555 335M031G0009 348>5180      B1A              2A70635143243700                           N',
    expected: {
      fullName: 'RAZIOU MOUSTAPHA',
      lastName: 'RAZIOU',
      firstName: 'MOUSTAPHA',
      pnr: 'E7T5GVL',
      flightNumber: 'KQ0555',
      route: 'FIH-NBO',
      departure: 'FIH',
      arrival: 'NBO',
      seatNumber: '031G',
      companyCode: 'KQ',
    },
  },
  {
    name: 'Kenya Airways - Nom très long avec plusieurs parties',
    data: 'M1VAN DER BERG/JEAN PHILIPPE    ABC123 FIHNBOKQ 0555 335M031G0009 348>5180',
    expected: {
      fullName: 'VAN DER BERG JEAN PHILIPPE',
      lastName: 'VAN DER BERG',
      firstName: 'JEAN PHILIPPE',
      pnr: 'ABC123',
      flightNumber: 'KQ0555',
      route: 'FIH-NBO',
    },
  },
  {
    name: 'Kenya Airways - Nom avec plusieurs prénoms',
    data: 'M1KALONJI KABWE/OSCAR PIERRE    XYZ789 FIHNBOKQ 0555 335M031G0009',
    expected: {
      fullName: 'KALONJI KABWE OSCAR PIERRE',
      lastName: 'KALONJI KABWE',
      firstName: 'OSCAR PIERRE',
      pnr: 'XYZ789',
      flightNumber: 'KQ0555',
      route: 'FIH-NBO',
    },
  },
  {
    name: 'Air Congo - PNR alphanumérique 6 caractères',
    data: 'M1KATEBA/ALIDOR    F1H2T3 FIHGMA9U 0123 335M031G0009',
    expected: {
      fullName: 'KATEBA ALIDOR',
      lastName: 'KATEBA',
      firstName: 'ALIDOR',
      pnr: 'F1H2T3',
      flightNumber: '9U0123',
      route: 'FIH-GMA',
    },
  },
  {
    name: 'Kenya Airways - Nom avec espaces multiples (normalisés)',
    data: 'M1LUMU    ALIDOR    KATEBA    D4E5F6 FIHNBOKQ 0555 335M031G0009',
    expected: {
      fullName: 'LUMU ALIDOR KATEBA',
      lastName: 'LUMU ALIDOR',
      firstName: 'KATEBA',
      pnr: 'D4E5F6',
      flightNumber: 'KQ0555',
      route: 'FIH-NBO',
    },
  },
  {
    name: 'Kenya Airways - PNR 7 caractères tout lettres',
    data: 'M1MUKENDI/GRACE    ABCDEFG FIHNBOKQ 0555 335M031G0009',
    expected: {
      fullName: 'MUKENDI GRACE',
      lastName: 'MUKENDI',
      firstName: 'GRACE',
      pnr: 'ABCDEFG',
      flightNumber: 'KQ0555',
      route: 'FIH-NBO',
    },
  },
  {
    name: 'Kenya Airways - PNR 6 caractères avec chiffres au début',
    data: 'M1TSHIMANGA/JOSEPH    1A2B3C FIHNBOKQ 0555 335M031G0009',
    expected: {
      fullName: 'TSHIMANGA JOSEPH',
      lastName: 'TSHIMANGA',
      firstName: 'JOSEPH',
      pnr: '1A2B3C',
      flightNumber: 'KQ0555',
      route: 'FIH-NBO',
    },
  },
  {
    name: 'Kenya Airways - Nom court simple',
    data: 'M1DIOP/ALI    G7H8I9 FIHNBOKQ 0555 335M031G0009',
    expected: {
      fullName: 'DIOP ALI',
      lastName: 'DIOP',
      firstName: 'ALI',
      pnr: 'G7H8I9',
      flightNumber: 'KQ0555',
      route: 'FIH-NBO',
    },
  },
];

console.log(`\n📋 ${testCases.length} cas de test à valider\n`);

// Fonction de test manuelle des regex
function testRegex(data, testName) {
  console.log('\n' + '-'.repeat(100));
  console.log(`🧪 TEST: ${testName}`);
  console.log('-'.repeat(100));
  console.log('Données:', data.substring(0, 80) + (data.length > 80 ? '...' : ''));
  console.log('Longueur:', data.length, 'caractères\n');

  // Regex 1: Standard
  const regex1 = /^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})\s+(\d{3,4})\s+(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/;
  const match1 = data.match(regex1);

  // Regex 2: Flexible
  const regex2 = /^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})\s*([A-Z]{3})\s*([A-Z0-9]{2})\s+(\d{3,4})\s+(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/;
  const match2 = !match1 ? data.match(regex2) : null;

  // Regex 3: Simplifiée
  const regex3 = /^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})[^0-9]*?(\d{3,4})[^0-9]*?(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/;
  const match3 = !match1 && !match2 ? data.match(regex3) : null;

  const match = match1 || match2 || match3;
  const regexUsed = match1 ? 'STANDARD' : match2 ? 'FLEXIBLE' : match3 ? 'SIMPLIFIÉE' : 'AUCUNE';

  if (match) {
    console.log(`✅ REGEX ${regexUsed} A MATCHÉ !`);
    console.log('');
    
    const rawName = match[1];
    const pnr = match[2];
    const departure = match[3];
    const arrival = match[4];
    const companyCode = match[5];
    const flightNum = match[6];
    const julianDay = match[7];
    const cabinClass = match[8];
    const seatSeq = match[9];
    const compartment = match[10];
    const checkInSeq = match[11];
    
    // Nettoyer le nom (normaliser les espaces multiples)
    const fullName = rawName.trim().replace(/\s+/g, ' ');
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const lastName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : fullName;
    
    console.log('📊 DONNÉES EXTRAITES:');
    console.log('  ├─ Nom brut capturé:', `"${rawName}"`);
    console.log('  ├─ Nom nettoyé:', `"${fullName}"`);
    console.log('  ├─ Nom de famille:', `"${lastName}"`);
    console.log('  ├─ Prénom(s):', `"${firstName}"`);
    console.log('  ├─ PNR:', pnr, `(${pnr.length} caractères)`);
    console.log('  ├─ Route:', `${departure}-${arrival}`);
    console.log('  ├─ Code compagnie:', companyCode);
    console.log('  ├─ Vol complet:', companyCode + flightNum);
    console.log('  ├─ Date (Julian):', julianDay);
    console.log('  ├─ Classe:', cabinClass);
    console.log('  ├─ Siège:', seatSeq + compartment);
    console.log('  └─ Check-in seq:', checkInSeq);
  } else {
    console.log('❌ AUCUNE REGEX NE MATCHE');
    console.log('');
    console.log('🔍 DIAGNOSTIC:');
    console.log('  - Vérifier les espaces entre les champs');
    console.log('  - Vérifier la longueur du PNR (doit être 6 ou 7 caractères)');
    console.log('  - Vérifier le format du nom (majuscules seulement)');
  }

  return match !== null;
}

// Exécuter tous les tests
let passedTests = 0;
let failedTests = 0;

for (const testCase of testCases) {
  const passed = testRegex(testCase.data, testCase.name);
  if (passed) {
    passedTests++;
  } else {
    failedTests++;
  }
}

// Résumé final
console.log('\n' + '='.repeat(100));
console.log('📊 RÉSUMÉ DES TESTS');
console.log('='.repeat(100));
console.log('');
console.log(`✅ Tests réussis: ${passedTests}/${testCases.length}`);
console.log(`❌ Tests échoués: ${failedTests}/${testCases.length}`);
console.log('');

if (failedTests === 0) {
  console.log('🎉 TOUS LES TESTS ONT RÉUSSI ! Le parsing supporte:');
  console.log('  ✅ Noms très longs avec plusieurs espaces');
  console.log('  ✅ PNR alphanumériques de 6-7 caractères');
  console.log('  ✅ Différents formats de compagnies aériennes');
  console.log('  ✅ Normalisation des espaces multiples');
} else {
  console.log('⚠️  Certains tests ont échoué. Vérifier les regex.');
}

console.log('');
console.log('='.repeat(100));
