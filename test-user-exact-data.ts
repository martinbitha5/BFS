/**
 * Test avec les données EXACTES de l'utilisateur
 */

// Données EXACTES du log utilisateur
const userRawData = "M1RAZIOU/MOUSTAPHA    E7T5GVL FIHNBOKQ 0555 335M031G0009 348>5180      B1A              2A70635143243700                           N";

console.log('='.repeat(80));
console.log('TEST AVEC DONNÉES EXACTES UTILISATEUR');
console.log('='.repeat(80));
console.log('\n📋 Raw Data:', userRawData);
console.log('📏 Longueur:', userRawData.length);

// Détection format
console.log('\n🔍 DÉTECTION FORMAT:');
const isKenya = userRawData.match(/KQ\s*\d{3,4}/) || userRawData.match(/[A-Z]{3}KQ\s/) || userRawData.includes('KQ ');
console.log('Kenya Airways:', isKenya ? '✅ OUI' : '❌ NON');
const format = isKenya ? 'GENERIC' : 'OTHER';
console.log('Format détecté:', format);

// Parsing
console.log('\n🔍 PARSING:');
let pnr = 'UNKNOWN';
let fullName = 'UNKNOWN';
let departure = 'UNK';
let arrival = 'UNK';
let companyCode: string | undefined;
let flightNumber: string | undefined;
let seatNumber: string | undefined;
let flightDate: string | undefined;
let baggageInfo: { count: number } | undefined;

// Regex standard
const bcbpMatch = userRawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})\s+(\d{3,4})\s+(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/);

if (bcbpMatch) {
  console.log('✅ BCBP Match réussi !');
  console.log('\nGroupes capturés:');
  bcbpMatch.forEach((group, i) => {
    if (i > 0 && i <= 11) {
      console.log(`  [${i}]: "${group}"`);
    }
  });
  
  fullName = bcbpMatch[1].trim().replace(/\s+/g, ' ');
  pnr = bcbpMatch[2];
  departure = bcbpMatch[3];
  arrival = bcbpMatch[4];
  companyCode = bcbpMatch[5];
  const flightNum = bcbpMatch[6];
  flightDate = bcbpMatch[7];
  const baggageCount = bcbpMatch[11];
  
  flightNumber = companyCode + flightNum;
  seatNumber = bcbpMatch[9] + bcbpMatch[10];
  
  if (baggageCount) {
    const count = parseInt(baggageCount, 10);
    if (!isNaN(count) && count > 0) {
      baggageInfo = { count };
    }
  }
} else {
  console.log('❌ BCBP Match échoué !');
}

// Résultat
const result = {
  pnr,
  fullName,
  flightNumber: flightNumber || 'UNKNOWN',
  flightDate,
  route: `${departure}-${arrival}`,
  departure,
  arrival,
  seatNumber,
  companyCode,
  baggageInfo,
  format
};

console.log('\n' + '='.repeat(80));
console.log('RÉSULTAT:');
console.log('='.repeat(80));
console.log(JSON.stringify(result, null, 2));

console.log('\n' + '='.repeat(80));
console.log('COMPARAISON AVEC LOG UTILISATEUR:');
console.log('='.repeat(80));
console.log('pnr:', result.pnr, result.pnr === 'UNKNOWN' ? '❌ PROBLÈME' : '✅');
console.log('flightNumber:', result.flightNumber, result.flightNumber === '0555' ? '❌ PROBLÈME (devrait être KQ0555)' : result.flightNumber === 'KQ0555' ? '✅' : '⚠️');
console.log('flightDate:', result.flightDate, result.flightDate === undefined ? '❌ PROBLÈME' : '✅');
console.log('companyCode:', result.companyCode, result.companyCode === '05' ? '❌ PROBLÈME (devrait être KQ)' : result.companyCode === 'KQ' ? '✅' : '⚠️');
console.log('baggageInfo:', result.baggageInfo, result.baggageInfo === undefined ? '❌ PROBLÈME' : '✅');

// Log utilisateur pour comparaison
console.log('\n' + '='.repeat(80));
console.log('LOG UTILISATEUR (pour référence):');
console.log('='.repeat(80));
console.log(`{
  "pnr": "UNKNOWN",           // ❌ Nous avons: ${result.pnr}
  "flightNumber": "0555",     // ❌ Nous avons: ${result.flightNumber}
  "flightDate": undefined,    // ❌ Nous avons: ${result.flightDate}
  "companyCode": "05",        // ❌ Nous avons: ${result.companyCode}
  "baggageInfo": undefined    // ❌ Nous avons: ${JSON.stringify(result.baggageInfo)}
}`);
