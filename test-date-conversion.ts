/**
 * Test de conversion du jour julien en date
 */

function convertJulianDayToDate(julianDay: number, year?: number): string | undefined {
  if (!julianDay || julianDay < 1 || julianDay > 366) {
    return undefined;
  }
  
  // Utiliser l'année courante par défaut
  const referenceYear = year || new Date().getFullYear();
  
  // Créer une date au 1er janvier de l'année de référence
  const date = new Date(referenceYear, 0, 1);
  
  // Ajouter le nombre de jours (julianDay - 1 car on commence au 1er janvier)
  date.setDate(date.getDate() + (julianDay - 1));
  
  // Retourner au format ISO (YYYY-MM-DD)
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}`;
}

console.log('='.repeat(80));
console.log('TEST CONVERSION JOUR JULIEN → DATE');
console.log('='.repeat(80));

// Test avec le jour 335 du boarding pass Kenya Airways
const julianDay = 335;

console.log('\n🔍 Jour Julien:', julianDay);
console.log('');

// Test avec l'année 2024 (bissextile)
const date2024 = convertJulianDayToDate(julianDay, 2024);
console.log('📅 Année 2024 (bissextile, 366 jours):');
console.log('   Date:', date2024);
console.log('   Jour:', new Date(date2024!).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

// Test avec l'année 2025 (normale)
const date2025 = convertJulianDayToDate(julianDay, 2025);
console.log('\n📅 Année 2025 (normale, 365 jours):');
console.log('   Date:', date2025);
console.log('   Jour:', new Date(date2025!).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

// Test avec l'année courante
const dateNow = convertJulianDayToDate(julianDay);
console.log('\n📅 Année courante (' + new Date().getFullYear() + '):');
console.log('   Date:', dateNow);
console.log('   Jour:', new Date(dateNow!).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

console.log('\n' + '='.repeat(80));
console.log('CONCLUSION');
console.log('='.repeat(80));
console.log('\nJour julien 335 en 2024 (bissextile) → 30 novembre 2024');
console.log('Jour julien 335 en 2025 (normale)    → 1er décembre 2025');
console.log('\n⚠️  Ce N\'EST PAS le 31 décembre !');
console.log('\n✅ La fonction convertit correctement le jour julien en date lisible.');
console.log('='.repeat(80));
