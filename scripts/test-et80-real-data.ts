/**
 * Test avec les données RÉELLES du boarding pass ET80 scanné
 * Données extraites de l'application "Scan it to Office"
 */

// Données brutes exactes du scan PDF417 (179 caractères)
const realScanData = 'M1MASIMANGO/ISSIAKA GREOIFLBUFIHMDKET 0080 235Y031J0095177>8321005235BET2A0712154800800 1ET0900';

console.log('🧪 TEST AVEC DONNÉES RÉELLES DU BOARDING PASS ET80');
console.log('='.repeat(80));
console.log('\n📋 Données brutes scannées:');
console.log(realScanData);
console.log('\n📏 Longueur:', realScanData.length, 'caractères');
console.log('\n🎯 Résultats attendus:');
console.log('  - Nom complet: MASIMANGO ISSIAKA');
console.log('  - PNR: OIFLBU');
console.log('  - Vol: ET0080 ou ET80');
console.log('  - Siège: 31J');
console.log('  - Route: FIH-MDK');
console.log('\n' + '='.repeat(80));

// Importer le parser
import { parserService } from '../src/services/parser.service';

try {
  const result = parserService.parse(realScanData);
  
  console.log('\n📊 RÉSULTATS DU PARSING:');
  console.log('─'.repeat(80));
  console.log(`Format détecté      : ${result.format}`);
  console.log(`PNR                 : ${result.pnr}`);
  console.log(`Nom complet         : ${result.fullName}`);
  console.log(`Prénom              : ${result.firstName}`);
  console.log(`Nom de famille      : ${result.lastName}`);
  console.log(`Numéro de vol       : ${result.flightNumber}`);
  console.log(`Route               : ${result.route}`);
  console.log(`Départ              : ${result.departure}`);
  console.log(`Arrivée             : ${result.arrival}`);
  console.log(`Heure du vol        : ${result.flightTime || 'N/A'}`);
  console.log(`Numéro de siège     : ${result.seatNumber || 'N/A'}`);
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ VÉRIFICATIONS:');
  console.log('─'.repeat(80));
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Vérifier le PNR
  if (result.pnr === 'OIFLBU') {
    console.log('✅ PNR correct: OIFLBU');
  } else {
    console.log(`❌ PNR incorrect: ${result.pnr} (attendu: OIFLBU)`);
    errors.push(`PNR: ${result.pnr} au lieu de OIFLBU`);
  }
  
  // Vérifier le nom complet
  if (result.fullName === 'MASIMANGO ISSIAKA') {
    console.log('✅ Nom complet correct: MASIMANGO ISSIAKA');
  } else {
    console.log(`❌ Nom complet incorrect: ${result.fullName} (attendu: MASIMANGO ISSIAKA)`);
    errors.push(`Nom: ${result.fullName} au lieu de MASIMANGO ISSIAKA`);
  }
  
  // Vérifier le vol
  if (result.flightNumber === 'ET0080' || result.flightNumber === 'ET80') {
    console.log(`✅ Vol correct: ${result.flightNumber}`);
  } else {
    console.log(`⚠️  Vol: ${result.flightNumber} (attendu: ET0080 ou ET80)`);
    warnings.push(`Vol: ${result.flightNumber}`);
  }
  
  // Vérifier le siège
  if (result.seatNumber === '31J') {
    console.log('✅ Siège correct: 31J');
  } else {
    console.log(`⚠️  Siège: ${result.seatNumber || 'N/A'} (attendu: 31J)`);
    warnings.push(`Siège: ${result.seatNumber || 'N/A'}`);
  }
  
  // Vérifier la route
  if (result.route === 'FIH-MDK' || (result.departure === 'FIH' && result.arrival === 'MDK')) {
    console.log('✅ Route correcte: FIH-MDK');
  } else {
    console.log(`⚠️  Route: ${result.route} (attendu: FIH-MDK)`);
    warnings.push(`Route: ${result.route}`);
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (errors.length > 0) {
    console.log('\n❌ ERREURS CRITIQUES:');
    errors.forEach(err => console.log(`   - ${err}`));
    console.log('\n⚠️  Le parser doit être corrigé!');
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log('\n⚠️  AVERTISSEMENTS:');
    warnings.forEach(warn => console.log(`   - ${warn}`));
    console.log('\n✅ Les données critiques (PNR et Nom) sont correctes!');
  } else {
    console.log('\n✅✅✅ TOUS LES TESTS SONT PASSÉS! ✅✅✅');
  }
  
} catch (error) {
  console.error('\n❌ ERREUR LORS DU PARSING:');
  console.error(error);
  process.exit(1);
}

