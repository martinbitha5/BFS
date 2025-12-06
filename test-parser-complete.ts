/**
 * Test complet du parsing Kenya Airways BCBP
 * Simule exactement ce qui se passe dans parseGeneric()
 */

const testData = "M1RAZIOU/MOUSTAPHA    E7T5GVL FIHNBOKQ 0555 335M031G0009 348>5180      B1A              2A70635143243700                           N";

console.log('='.repeat(80));
console.log('TEST COMPLET PARSING KENYA AIRWAYS');
console.log('='.repeat(80));
console.log('\n📋 Données brutes:', testData.substring(0, 80) + '...');
console.log('🔍 Longueur:', testData.length);

// Variables comme dans le code
let pnr = 'UNKNOWN';
let fullName = 'UNKNOWN';
let departure = 'UNK';
let arrival = 'UNK';
let companyCode: string | undefined;
let flightNumber: string | undefined;
let seatNumber: string | undefined;
let flightDate: string | undefined;
let baggageInfo: { count: number; baseNumber?: string; expectedTags?: string[] } | undefined;

// Essayer la regex standard
console.log('\n🔍 Tentative regex standard...');
let bcbpMatch = testData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})\s+(\d{3,4})\s+(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/);

if (bcbpMatch) {
  console.log('✅ Format BCBP structuré détecté');
  fullName = bcbpMatch[1].trim().replace(/\s+/g, ' ');
  pnr = bcbpMatch[2];
  departure = bcbpMatch[3];
  arrival = bcbpMatch[4];
  companyCode = bcbpMatch[5];
  const flightNum = bcbpMatch[6];
  flightDate = bcbpMatch[7];
  const cabinClass = bcbpMatch[8];
  const seatSeq = bcbpMatch[9];
  const compartment = bcbpMatch[10];
  const baggageCount = bcbpMatch[11];
  
  // Construire le numéro de vol complet
  flightNumber = companyCode + flightNum;
  
  // Extraire le numéro de siège
  seatNumber = seatSeq + compartment;
  
  // Extraire les infos bagages
  if (baggageCount) {
    const count = parseInt(baggageCount, 10);
    if (!isNaN(count) && count > 0) {
      baggageInfo = {
        count,
        baseNumber: undefined,
        expectedTags: undefined
      };
    }
  }
  
  console.log('\n📊 Données extraites BCBP:', {
    fullName,
    pnr,
    departure,
    arrival,
    companyCode,
    flightNumber,
    flightDate,
    cabinClass,
    seatNumber,
    baggageCount,
    baggageInfo
  });
}

// Résultat final
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
  baggageInfo
};

console.log('\n' + '='.repeat(80));
console.log('RÉSULTAT FINAL');
console.log('='.repeat(80));
console.log(JSON.stringify(result, null, 2));

console.log('\n' + '='.repeat(80));
console.log('VÉRIFICATIONS');
console.log('='.repeat(80));
console.log('PNR:', result.pnr === 'E7T5GVL' ? '✅' : '❌', result.pnr);
console.log('Date:', result.flightDate === '335' ? '✅' : '❌', result.flightDate);
console.log('Code:', result.companyCode === 'KQ' ? '✅' : '❌', result.companyCode);
console.log('Vol:', result.flightNumber === 'KQ0555' ? '✅' : '❌', result.flightNumber);
console.log('Bagages:', result.baggageInfo?.count === 9 ? '✅' : '❌', result.baggageInfo?.count);
console.log('Route:', result.route === 'FIH-NBO' ? '✅' : '❌', result.route);

const allCorrect = 
  result.pnr === 'E7T5GVL' &&
  result.flightDate === '335' &&
  result.companyCode === 'KQ' &&
  result.flightNumber === 'KQ0555' &&
  result.baggageInfo?.count === 9 &&
  result.route === 'FIH-NBO';

console.log('\n' + '='.repeat(80));
console.log(allCorrect ? '✅ TOUS LES TESTS PASSENT !' : '❌ CERTAINS TESTS ÉCHOUENT');
console.log('='.repeat(80));
