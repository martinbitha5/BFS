/**
 * Test du parser de check-in avec des données mockées
 * Usage: node scripts/test-checkin-parser.js
 */

// Simuler les imports nécessaires
const path = require('path');

// Pour tester, nous devons charger le parser
// Mais comme c'est TypeScript, nous allons créer un test simple qui simule le parsing

console.log('='.repeat(80));
console.log('TEST DU PARSER DE CHECK-IN');
console.log('='.repeat(80));

// Données mockées de test basées sur mock.service.ts
const testCases = [
  {
    name: 'Test 1: KATEBA MULONGO',
    rawData: 'M1KATEBA9U123FIHJNB143012A4071161863002',
    expected: {
      pnr: 'GPRJDV', // Mais le PNR n'est pas dans les données brutes!
      fullName: 'KATEBA',
      flightNumber: '9U123',
      departure: 'FIH',
      arrival: 'JNB',
      flightTime: '14:30',
      seatNumber: '12A',
      baggageCount: 2,
    },
  },
  {
    name: 'Test 2: MUKAMBA TSHILOMBO',
    rawData: 'M1MUKAMBA9U456FIHLAD160008B4071161870001',
    expected: {
      pnr: 'YFMKNE', // Mais le PNR n'est pas dans les données brutes!
      fullName: 'MUKAMBA',
      flightNumber: '9U456',
      departure: 'FIH',
      arrival: 'LAD',
      flightTime: '16:00',
      seatNumber: '8B',
      baggageCount: 1,
    },
  },
  {
    name: 'Test 3: Format réel Air Congo (avec PNR)',
    rawData: 'M1KALONJI KABWE/OSCAREYFMKNE FIHFBMET',
    expected: {
      pnr: 'EYFMKNE',
      fullName: 'KALONJI KABWE OSCAR',
      flightNumber: '9U???', // À déterminer
      departure: 'FIH',
      arrival: 'FBM',
    },
  },
];

console.log('\n📋 Analyse des données mockées:');
console.log('─'.repeat(80));

testCases.forEach((testCase, index) => {
  console.log(`\n${testCase.name}`);
  console.log(`Données brutes: ${testCase.rawData}`);
  console.log(`Longueur: ${testCase.rawData.length} caractères`);
  console.log(`Attendu:`);
  console.log(`  - PNR: ${testCase.expected.pnr}`);
  console.log(`  - Nom: ${testCase.expected.fullName}`);
  console.log(`  - Vol: ${testCase.expected.flightNumber}`);
  console.log(`  - Route: ${testCase.expected.departure} → ${testCase.expected.arrival}`);
  
  // Analyse manuelle de la structure
  console.log(`\nAnalyse de la structure:`);
  if (testCase.rawData.startsWith('M1')) {
    console.log(`  ✓ Commence par M1`);
    const afterM1 = testCase.rawData.substring(2);
    
    // Chercher le numéro de vol (9U suivi de chiffres)
    const flightMatch = afterM1.match(/9U\d{3}/);
    if (flightMatch) {
      console.log(`  ✓ Numéro de vol trouvé: ${flightMatch[0]} à la position ${afterM1.indexOf(flightMatch[0]) + 2}`);
      const namePart = afterM1.substring(0, afterM1.indexOf(flightMatch[0]));
      console.log(`  → Nom potentiel: "${namePart}"`);
    }
    
    // Chercher les codes aéroports
    const airports = ['FIH', 'JNB', 'LAD', 'FBM', 'ADD', 'BZV', 'KGL', 'EBB'];
    airports.forEach(airport => {
      const index = afterM1.indexOf(airport);
      if (index >= 0) {
        console.log(`  ✓ Code aéroport "${airport}" trouvé à la position ${index + 2}`);
      }
    });
    
    // Chercher le PNR (6 caractères alphanumériques)
    // Le PNR devrait être après le nom mais avant les codes aéroports
    const pnrPattern = /([A-Z0-9]{6})/g;
    let match;
    while ((match = pnrPattern.exec(afterM1)) !== null) {
      const pnrCandidate = match[1];
      const matchIndex = match.index;
      // Ignorer si c'est un code aéroport
      if (!airports.some(apt => pnrCandidate.includes(apt))) {
        console.log(`  → PNR potentiel: "${pnrCandidate}" à la position ${matchIndex + 2}`);
      }
    }
  }
});

console.log('\n' + '='.repeat(80));
console.log('\n⚠️  PROBLÈME IDENTIFIÉ:');
console.log('Les données mockées dans mock.service.ts ne contiennent pas le PNR dans rawData!');
console.log('Le PNR devrait être présent dans les données brutes du boarding pass.');
console.log('\n' + '='.repeat(80));

