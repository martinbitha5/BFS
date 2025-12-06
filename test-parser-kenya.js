#!/usr/bin/env node

/**
 * Script de test pour valider le parsing Kenya Airways BCBP
 */

const testData = "M1RAZIOU/MOUSTAPHA    E7T5GVL FIHNBOKQ 0555 335M031G0009 348>5180      B1A              2A70635143243700                           N";

console.log('='.repeat(80));
console.log('TEST PARSING KENYA AIRWAYS BCBP');
console.log('='.repeat(80));
console.log('\n📋 Données brutes:');
console.log(testData);
console.log('\n🔍 Longueur:', testData.length, 'caractères');
console.log('\n🔍 Analyse caractère par caractère (positions 0-60):');
for (let i = 0; i < Math.min(60, testData.length); i++) {
  const char = testData[i];
  const code = char.charCodeAt(0);
  if (i % 10 === 0) console.log('');
  process.stdout.write(`${i}:${char}(${code}) `);
}
console.log('\n');

// Test des regex
console.log('\n' + '='.repeat(80));
console.log('TEST REGEX 1 - Standard');
console.log('='.repeat(80));
const regex1 = /^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})\s+(\d{3,4})\s+(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/;
const match1 = testData.match(regex1);
console.log('Résultat:', match1 ? '✅ MATCH' : '❌ NO MATCH');
if (match1) {
  console.log('Groupes capturés:');
  match1.forEach((group, index) => {
    if (index > 0) {
      console.log(`  [${index}]: "${group}"`);
    }
  });
}

console.log('\n' + '='.repeat(80));
console.log('TEST REGEX 2 - Flexible');
console.log('='.repeat(80));
const regex2 = /^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})\s*([A-Z]{3})\s*([A-Z0-9]{2})\s+(\d{3,4})\s+(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/;
const match2 = testData.match(regex2);
console.log('Résultat:', match2 ? '✅ MATCH' : '❌ NO MATCH');
if (match2) {
  console.log('Groupes capturés:');
  match2.forEach((group, index) => {
    if (index > 0) {
      console.log(`  [${index}]: "${group}"`);
    }
  });
}

console.log('\n' + '='.repeat(80));
console.log('TEST REGEX 3 - Simplifiée');
console.log('='.repeat(80));
const regex3 = /^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})[^0-9]*?(\d{3,4})[^0-9]*?(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/;
const match3 = testData.match(regex3);
console.log('Résultat:', match3 ? '✅ MATCH' : '❌ NO MATCH');
if (match3) {
  console.log('Groupes capturés:');
  match3.forEach((group, index) => {
    if (index > 0) {
      console.log(`  [${index}]: "${group}"`);
    }
  });
}

// Test d'une regex ultra-flexible
console.log('\n' + '='.repeat(80));
console.log('TEST REGEX 4 - Ultra-Flexible (NEW)');
console.log('='.repeat(80));
const regex4 = /^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})\s*(\d{3,4})\s*(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/;
const match4 = testData.match(regex4);
console.log('Résultat:', match4 ? '✅ MATCH' : '❌ NO MATCH');
if (match4) {
  console.log('Groupes capturés:');
  match4.forEach((group, index) => {
    if (index > 0) {
      console.log(`  [${index}]: "${group}"`);
    }
  });
}

// Décomposition manuelle pour comprendre
console.log('\n' + '='.repeat(80));
console.log('DÉCOMPOSITION MANUELLE');
console.log('='.repeat(80));
console.log('Position 0-2:', testData.substring(0, 2), '→ Format');
console.log('Position 2-22:', testData.substring(2, 22), '→ Nom (avec espaces)');
console.log('Position 22-29:', testData.substring(22, 29), '→ PNR');
console.log('Position 30-33:', testData.substring(30, 33), '→ Départ');
console.log('Position 33-36:', testData.substring(33, 36), '→ Arrivée');
console.log('Position 36-38:', testData.substring(36, 38), '→ Code compagnie');
console.log('Position 39-43:', testData.substring(39, 43), '→ Numéro vol');
console.log('Position 44-47:', testData.substring(44, 47), '→ Date');
console.log('Position 47-48:', testData.substring(47, 48), '→ Classe');
console.log('Position 48-51:', testData.substring(48, 51), '→ Séquence siège');
console.log('Position 51-52:', testData.substring(51, 52), '→ Compartiment');
console.log('Position 52-56:', testData.substring(52, 56), '→ Bagages');

// Résultat final attendu
console.log('\n' + '='.repeat(80));
console.log('RÉSULTAT ATTENDU');
console.log('='.repeat(80));

const bestMatch = match1 || match2 || match3 || match4;
if (bestMatch) {
  console.log('✅ PARSING RÉUSSI !');
  console.log('');
  console.log('PNR:', bestMatch[2]);
  console.log('Nom:', bestMatch[1].trim().replace(/\s+/g, ' '));
  console.log('Départ:', bestMatch[3]);
  console.log('Arrivée:', bestMatch[4]);
  console.log('Code compagnie:', bestMatch[5]);
  console.log('Numéro vol:', bestMatch[5] + bestMatch[6]);
  console.log('Date:', bestMatch[7]);
  console.log('Classe:', bestMatch[8]);
  console.log('Siège:', bestMatch[9] + bestMatch[10]);
  console.log('Bagages:', parseInt(bestMatch[11], 10));
} else {
  console.log('❌ AUCUNE REGEX NE FONCTIONNE !');
  console.log('');
  console.log('Analyse des espaces entre les champs:');
  const afterName = testData.substring(20, 32);
  console.log('Après nom (pos 20-32):', JSON.stringify(afterName));
  const afterPnr = testData.substring(29, 40);
  console.log('Après PNR (pos 29-40):', JSON.stringify(afterPnr));
}

console.log('\n' + '='.repeat(80));
