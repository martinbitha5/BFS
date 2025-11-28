/**
 * Script de test pour déboguer le parser de boarding pass
 * Usage: ts-node scripts/test-parser.ts "données_brutes_du_boarding_pass"
 */

import { parserService } from '../src/services/parser.service';

// Récupérer les données brutes depuis les arguments de ligne de commande
const rawData = process.argv[2];

if (!rawData) {
  console.error('Usage: ts-node scripts/test-parser.ts "données_brutes_du_boarding_pass"');
  console.error('Exemple: ts-node scripts/test-parser.ts "M1KALONJI KABWE/OSCAREYFMKNE FIHFBMET..."');
  process.exit(1);
}

console.log('='.repeat(80));
console.log('TEST DU PARSER DE BOARDING PASS');
console.log('='.repeat(80));
console.log('\n📋 Données brutes reçues:');
console.log(rawData);
console.log('\n📏 Longueur:', rawData.length, 'caractères');
console.log('\n' + '='.repeat(80));

try {
  const result = parserService.parse(rawData);
  
  console.log('\n✅ Parsing réussi!\n');
  console.log('📊 Résultats du parsing:');
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
  console.log(`Code compagnie       : ${result.companyCode || 'N/A'}`);
  console.log(`Compagnie           : ${result.airline || 'N/A'}`);
  console.log(`Numéro de ticket    : ${result.ticketNumber || 'N/A'}`);
  
  if (result.baggageInfo) {
    console.log(`\n🛄 Informations bagages:`);
    console.log(`   Nombre           : ${result.baggageInfo.count}`);
    console.log(`   Numéro de base   : ${result.baggageInfo.baseNumber || 'N/A'}`);
    if (result.baggageInfo.expectedTags && result.baggageInfo.expectedTags.length > 0) {
      console.log(`   Tags attendus    : ${result.baggageInfo.expectedTags.join(', ')}`);
    }
  } else {
    console.log(`\n🛄 Informations bagages: Aucune`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Test terminé avec succès!\n');
  
} catch (error) {
  console.error('\n❌ Erreur lors du parsing:');
  console.error(error);
  console.log('\n' + '='.repeat(80));
  process.exit(1);
}

