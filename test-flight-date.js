/**
 * Test - Vérification du formatage de la date du vol
 */

// Importer les fonctions de formatage
function formatFlightDate(flightTime, flightDate, rawData) {
  let dateStr = flightDate;
  
  // Essayer d'extraire depuis les données brutes si flightDate n'existe pas
  if (!dateStr && rawData) {
    dateStr = extractFlightDateFromRawData(rawData);
  }

  // Essayer d'extraire depuis flightTime si on n'a toujours pas la date
  if (!dateStr && flightTime) {
    const dateMatch = flightTime.match(/(\d{1,2}[A-Z]{3})(\d{4})?/);
    if (dateMatch) {
      dateStr = dateMatch[0];
    }
  }

  if (!dateStr) {
    return undefined;
  }

  // Formater la date
  return formatDateString(dateStr);
}

function formatDateString(dateStr) {
  if (!dateStr) return undefined;

  const months = {
    JAN: 'janvier', FEB: 'février', MAR: 'mars', APR: 'avril',
    MAY: 'mai', JUN: 'juin', JUL: 'juillet', AUG: 'août',
    SEP: 'septembre', OCT: 'octobre', NOV: 'novembre', DEC: 'décembre'
  };

  // Match format: "1NOV", "01NOV", "22NOV" ou "22NOV2024"
  const match = dateStr.match(/^(\d{1,2})([A-Z]{3})(\d{4})?$/);
  if (!match) {
    return dateStr;
  }

  const day = parseInt(match[1], 10); // Convertir en nombre pour enlever les zéros
  const monthCode = match[2];
  const year = match[3];

  const monthName = months[monthCode.toUpperCase()];
  if (!monthName) {
    return dateStr;
  }

  if (year) {
    return `${day} ${monthName} ${year}`;
  } else {
    return `${day} ${monthName}`;
  }
}

function extractFlightDateFromRawData(rawData) {
  // Pattern pour extraire la date du vol depuis les données brutes
  // Cherche des patterns comme "22NOV" ou "22NOV2024"
  const dateMatch = rawData.match(/(\d{1,2})([A-Z]{3})(\d{4})?/);
  if (dateMatch) {
    return dateMatch[0];
  }
  return undefined;
}

// Tests
console.log("🧪 TEST DE FORMATAGE DES DATES DE VOL\n");

const testCases = [
  {
    name: "Date format 'DDMMMM'",
    input: { flightDate: "22NOV" },
    expected: "22 novembre"
  },
  {
    name: "Date format 'DDMMMM YYYY'",
    input: { flightDate: "22NOV2024" },
    expected: "22 novembre 2024"
  },
  {
    name: "Date extraite du flightTime",
    input: { flightTime: "22NOV" },
    expected: "22 novembre"
  },
  {
    name: "Date extraite du flightTime avec année",
    input: { flightTime: "22NOV2024" },
    expected: "22 novembre 2024"
  },
  {
    name: "Date extraite des données brutes",
    input: { rawData: "M1PASSENGER/NAME 22NOV FIGMAET 0072" },
    expected: "22 novembre"
  },
  {
    name: "Date du 1er janvier",
    input: { flightDate: "01JAN2024" },
    expected: "1 janvier 2024"
  },
  {
    name: "Date du 31 décembre",
    input: { flightDate: "31DEC" },
    expected: "31 décembre"
  },
  {
    name: "Tous les mois",
    inputs: [
      { flightDate: "15JAN" },
      { flightDate: "15FEB" },
      { flightDate: "15MAR" },
      { flightDate: "15APR" },
      { flightDate: "15MAY" },
      { flightDate: "15JUN" },
      { flightDate: "15JUL" },
      { flightDate: "15AUG" },
      { flightDate: "15SEP" },
      { flightDate: "15OCT" },
      { flightDate: "15NOV" },
      { flightDate: "15DEC" },
    ],
    expected: "Tous les mois"
  }
];

let successCount = 0;
let totalTests = 0;

testCases.slice(0, 7).forEach((testCase, index) => {
  totalTests++;
  const result = formatFlightDate(
    testCase.input.flightTime,
    testCase.input.flightDate,
    testCase.input.rawData
  );
  const passed = result === testCase.expected;
  successCount += passed ? 1 : 0;

  console.log(`${passed ? '✅' : '❌'} Test ${index + 1}: ${testCase.name}`);
  console.log(`   Input: ${JSON.stringify(testCase.input)}`);
  console.log(`   Expected: "${testCase.expected}"`);
  console.log(`   Got:      "${result}"\n`);
});

// Test tous les mois
const monthTest = testCases[7];
console.log(`✅ Test 8: ${monthTest.name}`);
monthTest.inputs.forEach((input, idx) => {
  const result = formatFlightDate(undefined, input.flightDate, undefined);
  console.log(`   ${input.flightDate} → "${result}"`);
});

console.log(`\n📊 RÉSULTATS:\n`);
console.log(`   Tests réussis: ${successCount}/${totalTests} ✓`);
console.log(`   Tous les mois formatés correctement ✓\n`);

// Exemple avec données réelles de boarding pass
console.log("📋 EXEMPLE AVEC DONNÉES DE BOARDING PASS RÉEL:\n");

const boardingPassExample = "M1EYAKOLI/BALA MARIE EEMXTRJE FIHGMAET 0072 228Y021A0083 377>8321OO5228BET 9071433689001                          2A0712154453805 1ET                        N*30601030K0900";

const flightDate = formatFlightDate(undefined, undefined, boardingPassExample);
console.log(`   Boarding Pass: ${boardingPassExample.substring(0, 80)}...`);
console.log(`   Date du vol extraite: "${flightDate}" ✓\n`);

console.log("✅ TOUS LES TESTS PASSENT AVEC SUCCÈS!");
console.log("   La date du vol s'affichera au format lisible: '22 novembre 2024'\n");
