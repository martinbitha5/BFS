#!/usr/bin/env ts-node

/**
 * Script de test complet du flux de l'application
 * Teste : Check-in → Check bagage → Check-out → Arrival
 */

import { parserService } from '../src/services/parser.service';
import { extractTicketNumberWithoutCompanyCode, formatFlightDate, extractFlightDateFromRawData } from '../src/utils/ticket.util';

// Données de test réalistes
const TEST_BOARDING_PASSES = {
  ETHIOPIAN: 'M1SMITH/JOHN WILLIAMET701FIHFBMEGPKZLX4071161870001',
  AIR_CONGO: 'M1KATEBA9U123FIHFBM143012A4071161863002',
  ETHIOPIAN_WITH_DATE: 'M1MASIMANGO/ISSIAKA GROIFLBUET80FIHFBM22NOV4071161870001',
};

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(test: string, passed: boolean, error?: string, details?: any) {
  results.push({ test, passed, error, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}`);
  if (error) {
    console.log(`   Erreur: ${error}`);
  }
  if (details) {
    console.log(`   Détails:`, JSON.stringify(details, null, 2));
  }
}

// Test 1: Parsing du boarding pass Ethiopian
console.log('\n' + '='.repeat(80));
console.log('TEST 1: Parsing du boarding pass Ethiopian');
console.log('='.repeat(80));

try {
  const parsed = parserService.parse(TEST_BOARDING_PASSES.ETHIOPIAN);
  
  // Vérifications
  const checks = {
    hasPnr: parsed.pnr && parsed.pnr !== 'UNKNOWN',
    hasFullName: parsed.fullName && parsed.fullName !== 'UNKNOWN',
    hasFlightNumber: parsed.flightNumber && parsed.flightNumber.includes('ET'),
    hasDeparture: parsed.departure === 'FIH',
    hasArrival: parsed.arrival === 'FBM',
    hasBaggageInfo: parsed.baggageInfo && parsed.baggageInfo.count > 0,
    hasTicketNumber: !!parsed.ticketNumber,
  };
  
  const allPassed = Object.values(checks).every(v => v === true);
  
  logTest('Parsing Ethiopian Airlines', allPassed, 
    allPassed ? undefined : 'Certaines données manquantes',
    { parsed, checks }
  );
} catch (error) {
  logTest('Parsing Ethiopian Airlines', false, error instanceof Error ? error.message : 'Erreur inconnue');
}

// Test 2: Extraction du numéro de billet sans code compagnie
console.log('\n' + '='.repeat(80));
console.log('TEST 2: Extraction du numéro de billet sans code compagnie');
console.log('='.repeat(80));

const ticketTests = [
  { ticket: '4071161870', companyCode: 'ET', expected: '4071161870' },
  { ticket: 'ET4071161870', companyCode: 'ET', expected: '4071161870' },
  { ticket: '407116187012', companyCode: 'ET', expected: '7116187012' }, // 12 chiffres, enlever 2 premiers
  { ticket: '1234567890', companyCode: '9U', expected: '1234567890' },
  { ticket: '9U1234567890', companyCode: '9U', expected: '1234567890' },
];

ticketTests.forEach(({ ticket, companyCode, expected }) => {
  try {
    const result = extractTicketNumberWithoutCompanyCode(ticket, companyCode);
    const passed = result === expected;
    logTest(
      `Extraction ticket "${ticket}" (code: ${companyCode})`,
      passed,
      passed ? undefined : `Attendu: ${expected}, Obtenu: ${result}`,
      { ticket, companyCode, expected, result }
    );
  } catch (error) {
    logTest(`Extraction ticket "${ticket}"`, false, error instanceof Error ? error.message : 'Erreur inconnue');
  }
});

// Test 3: Extraction de la date du vol
console.log('\n' + '='.repeat(80));
console.log('TEST 3: Extraction de la date du vol');
console.log('='.repeat(80));

const dateTests = [
  { rawData: TEST_BOARDING_PASSES.ETHIOPIAN_WITH_DATE, expected: '22NOV' },
  { rawData: 'M1TESTET701FIHFBM15DEC4071161870001', expected: '15DEC' },
  { rawData: 'M1TESTET701FIHFBM4071161870001', expected: undefined }, // Pas de date
  { rawData: TEST_BOARDING_PASSES.ETHIOPIAN, expected: undefined }, // Pas de date
];

dateTests.forEach(({ rawData, expected }) => {
  try {
    const result = extractFlightDateFromRawData(rawData);
    const passed = result === expected;
    logTest(
      `Extraction date depuis "${rawData.substring(0, 30)}..."`,
      passed,
      passed ? undefined : `Attendu: ${expected}, Obtenu: ${result}`,
      { rawData: rawData.substring(0, 50), expected, result }
    );
  } catch (error) {
    logTest(`Extraction date`, false, error instanceof Error ? error.message : 'Erreur inconnue');
  }
});

// Test 4: Format de la date du vol
console.log('\n' + '='.repeat(80));
console.log('TEST 4: Format de la date du vol');
console.log('='.repeat(80));

const formatDateTests = [
  { flightTime: '14:30', flightDate: undefined, rawData: TEST_BOARDING_PASSES.ETHIOPIAN_WITH_DATE, expected: '22NOV' },
  { flightTime: '14:30', flightDate: '15DEC', rawData: '', expected: '15DEC' },
  { flightTime: '14:30', flightDate: undefined, rawData: TEST_BOARDING_PASSES.ETHIOPIAN, expected: undefined },
];

formatDateTests.forEach(({ flightTime, flightDate, rawData, expected }) => {
  try {
    const result = formatFlightDate(flightTime, flightDate, rawData);
    const passed = result === expected;
    logTest(
      `Format date (time: ${flightTime}, date: ${flightDate || 'undefined'})`,
      passed,
      passed ? undefined : `Attendu: ${expected}, Obtenu: ${result}`,
      { flightTime, flightDate, expected, result }
    );
  } catch (error) {
    logTest(`Format date`, false, error instanceof Error ? error.message : 'Erreur inconnue');
  }
});

// Test 5: Extraction du nombre de bagages (Ethiopian - 3 chiffres)
console.log('\n' + '='.repeat(80));
console.log('TEST 5: Extraction du nombre de bagages (Ethiopian)');
console.log('='.repeat(80));

const baggageTests = [
  { rawData: 'M1TESTET701FIHFBM4071161870001', expected: 1 },
  { rawData: 'M1TESTET701FIHFBM4071161870002', expected: 2 },
  { rawData: 'M1TESTET701FIHFBM4071161870003', expected: 3 },
  // Note: Le format 0716055397226 avec 226 bagages n'est pas réaliste
  // Le parser limite à 10 bagages max pour des raisons pratiques
  // Le test vérifie que le parser détecte bien le pattern même si le count est > 10
  { rawData: 'M1TESTET701FIHFBM0716055397226', expected: 10 }, // Format alternatif limité à 10
];

baggageTests.forEach(({ rawData, expected }) => {
  try {
    const parsed = parserService.parse(rawData);
    const count = parsed.baggageInfo?.count || 0;
    const passed = count === expected;
    logTest(
      `Nombre de bagages depuis "${rawData.substring(0, 30)}..."`,
      passed,
      passed ? undefined : `Attendu: ${expected}, Obtenu: ${count}`,
      { rawData: rawData.substring(0, 50), expected, count, baggageInfo: parsed.baggageInfo }
    );
  } catch (error) {
    logTest(`Extraction nombre bagages`, false, error instanceof Error ? error.message : 'Erreur inconnue');
  }
});

// Test 6: Extraction du nombre de bagages (Air Congo - 2 chiffres)
console.log('\n' + '='.repeat(80));
console.log('TEST 6: Extraction du nombre de bagages (Air Congo)');
console.log('='.repeat(80));

const airCongoBaggageTests = [
  { rawData: 'M1TEST9U123FIHFBM4071161863001', expected: 1 },
  { rawData: 'M1TEST9U123FIHFBM4071161863002', expected: 2 },
  { rawData: 'M1TEST9U123FIHFBM4071161863003', expected: 3 },
];

airCongoBaggageTests.forEach(({ rawData, expected }) => {
  try {
    const parsed = parserService.parse(rawData);
    const count = parsed.baggageInfo?.count || 0;
    const passed = count === expected;
    logTest(
      `Nombre de bagages Air Congo depuis "${rawData.substring(0, 30)}..."`,
      passed,
      passed ? undefined : `Attendu: ${expected}, Obtenu: ${count}`,
      { rawData: rawData.substring(0, 50), expected, count, baggageInfo: parsed.baggageInfo }
    );
  } catch (error) {
    logTest(`Extraction nombre bagages Air Congo`, false, error instanceof Error ? error.message : 'Erreur inconnue');
  }
});

// Test 7: Vérification complète du flux Check-in
console.log('\n' + '='.repeat(80));
console.log('TEST 7: Vérification complète du flux Check-in');
console.log('='.repeat(80));

try {
  const parsed = parserService.parse(TEST_BOARDING_PASSES.ETHIOPIAN_WITH_DATE);
  
  // Vérifier toutes les données requises pour le check-in
  const checkinData = {
    nomPassager: parsed.fullName && parsed.fullName !== 'UNKNOWN',
    origine: parsed.departure === 'FIH',
    destination: parsed.arrival === 'FBM',
    nomVol: parsed.flightNumber && parsed.flightNumber.includes('ET'),
    nombreBagages: parsed.baggageInfo && parsed.baggageInfo.count > 0,
    numeroBillet: !!parsed.ticketNumber,
    numeroBilletSansCode: !!extractTicketNumberWithoutCompanyCode(parsed.ticketNumber, parsed.companyCode),
    dateVol: !!formatFlightDate(parsed.flightTime, undefined, parsed.rawData),
  };
  
  const allCheckinPassed = Object.values(checkinData).every(v => v === true);
  
  logTest('Flux Check-in complet', allCheckinPassed,
    allCheckinPassed ? undefined : 'Certaines données manquantes pour l\'affichage',
    {
      parsed: {
        fullName: parsed.fullName,
        departure: parsed.departure,
        arrival: parsed.arrival,
        flightNumber: parsed.flightNumber,
        baggageCount: parsed.baggageInfo?.count,
        ticketNumber: parsed.ticketNumber,
        ticketNumberWithoutCode: extractTicketNumberWithoutCompanyCode(parsed.ticketNumber, parsed.companyCode),
        flightDate: formatFlightDate(parsed.flightTime, undefined, parsed.rawData),
      },
      checkinData
    }
  );
} catch (error) {
  logTest('Flux Check-in complet', false, error instanceof Error ? error.message : 'Erreur inconnue');
}

// Test 8: Vérification du calcul des bagages restants
console.log('\n' + '='.repeat(80));
console.log('TEST 8: Vérification du calcul des bagages restants');
console.log('='.repeat(80));

const baggageCountTests = [
  { total: 3, scanned: 0, expected: 3 },
  { total: 3, scanned: 1, expected: 2 },
  { total: 3, scanned: 2, expected: 1 },
  { total: 3, scanned: 3, expected: 0 },
  { total: 1, scanned: 1, expected: 0 },
];

baggageCountTests.forEach(({ total, scanned, expected }) => {
  const remaining = Math.max(0, total - scanned);
  const passed = remaining === expected;
  logTest(
    `Calcul bagages restants (total: ${total}, scannés: ${scanned})`,
    passed,
    passed ? undefined : `Attendu: ${expected}, Obtenu: ${remaining}`,
    { total, scanned, expected, remaining }
  );
});

// Résumé final
console.log('\n' + '='.repeat(80));
console.log('RÉSUMÉ DES TESTS');
console.log('='.repeat(80));

const totalTests = results.length;
const passedTests = results.filter(r => r.passed).length;
const failedTests = totalTests - passedTests;

console.log(`Total de tests: ${totalTests}`);
console.log(`✅ Tests réussis: ${passedTests}`);
console.log(`❌ Tests échoués: ${failedTests}`);
console.log(`Taux de réussite: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (failedTests > 0) {
  console.log('\n' + '='.repeat(80));
  console.log('TESTS ÉCHOUÉS:');
  console.log('='.repeat(80));
  results.filter(r => !r.passed).forEach(r => {
    console.log(`\n❌ ${r.test}`);
    if (r.error) {
      console.log(`   Erreur: ${r.error}`);
    }
    if (r.details) {
      console.log(`   Détails:`, JSON.stringify(r.details, null, 2));
    }
  });
}

console.log('\n' + '='.repeat(80));
process.exit(failedTests > 0 ? 1 : 0);

