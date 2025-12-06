/**
 * Test de détection de format
 */

const testData = "M1RAZIOU/MOUSTAPHA    E7T5GVL FIHNBOKQ 0555 335M031G0009 348>5180      B1A              2A70635143243700                           N";

console.log('='.repeat(80));
console.log('TEST DÉTECTION DE FORMAT');
console.log('='.repeat(80));
console.log('\n📋 Données:', testData.substring(0, 80) + '...');

// Test 1: Air Congo
const isAirCongo = testData.includes('9U');
console.log('\n1️⃣  Air Congo (9U):', isAirCongo ? '✅' : '❌');

// Test 2: Kenya Airways
const kenyaTest1 = testData.match(/KQ\s*\d{3,4}/);
const kenyaTest2 = testData.match(/[A-Z]{3}KQ\s/);
const kenyaTest3 = testData.includes('KQ ');

console.log('\n2️⃣  Kenya Airways:');
console.log('   - Pattern KQ\\s*\\d{3,4}:', kenyaTest1 ? '✅ Match: "' + kenyaTest1[0] + '"' : '❌');
console.log('   - Pattern [A-Z]{3}KQ\\s:', kenyaTest2 ? '✅ Match: "' + kenyaTest2[0] + '"' : '❌');
console.log('   - Includes "KQ ":', kenyaTest3 ? '✅' : '❌');

const isKenya = kenyaTest1 || kenyaTest2 || kenyaTest3;
console.log('   → Résultat:', isKenya ? '✅ KENYA AIRWAYS DÉTECTÉ' : '❌ NON DÉTECTÉ');

// Test 3: Ethiopian
const ethiopianPatterns = [
  /ET\s*\d{2,4}\b/,        // ET suivi de 2-4 chiffres
  /ET\s+\d{4}/,            // ET espace(s) puis 4 chiffres
  /[A-Z]{3,6}ET\s*\d{2,4}/ // PNR + ET + numéro
];

console.log('\n3️⃣  Ethiopian Airlines:');
ethiopianPatterns.forEach((pattern, i) => {
  const match = testData.match(pattern);
  console.log(`   - Pattern ${i + 1}:`, match ? '✅ Match: "' + match[0] + '"' : '❌');
});

const isEthiopian = ethiopianPatterns.some(p => p.test(testData));
console.log('   → Résultat:', isEthiopian ? '⚠️ ETHIOPIAN DÉTECTÉ' : '❌ NON DÉTECTÉ');

// Format détecté final (logique du code)
let detectedFormat: 'AIR_CONGO' | 'ETHIOPIAN' | 'GENERIC';

if (isAirCongo) {
  detectedFormat = 'AIR_CONGO';
} else if (isKenya) {
  detectedFormat = 'GENERIC';
} else if (isEthiopian) {
  detectedFormat = 'ETHIOPIAN';
} else {
  detectedFormat = 'GENERIC';
}

console.log('\n' + '='.repeat(80));
console.log('FORMAT DÉTECTÉ:', detectedFormat);
console.log('='.repeat(80));

if (detectedFormat === 'GENERIC' && isKenya) {
  console.log('✅ CORRECT ! Kenya Airways → GENERIC');
} else {
  console.log('❌ ERREUR ! Mauvaise détection');
}
