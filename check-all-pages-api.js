const fs = require('fs');
const path = require('path');

const pagesDir = 'c:\\Users\\GOBLAIRE\\Desktop\\BFS\\dashboard\\src\\pages';
const pages = ['Dashboard.tsx', 'Arrivals.tsx', 'Departures.tsx', 'Deliveries.tsx', 'Passengers.tsx', 'Export.tsx'];

console.log('🔍 Vérification des clés API dans toutes les pages:\n');

pages.forEach(page => {
  const filePath = path.join(pagesDir, page);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Chercher les headers
    const headersMatch = content.match(/const headers = \{[\s\S]*?\}/);
    const hasApiKey = headersMatch && headersMatch[0].includes('x-api-key');
    const hasAuth = content.includes('localStorage.getItem(\'bfs_token\')');
    
    console.log(`${page}:`);
    console.log(`  📋 Headers trouvés: ${headersMatch ? 'Oui' : 'Non'}`);
    console.log(`  🔑 Clé API: ${hasApiKey ? '✅ Présente' : '❌ Manquante'}`);
    console.log(`  🔐 Auth token: ${hasAuth ? '✅ Présente' : '❌ Manquante'}`);
    
    if (headersMatch && !hasApiKey) {
      console.log(`  ⚠️  Headers existants mais sans clé API !`);
      console.log(`  📄 Contenu: ${headersMatch[0].substring(0, 100)}...`);
    }
    
    console.log('');
    
  } catch (error) {
    console.log(`${page}: ❌ Erreur lecture - ${error.message}\n`);
  }
});

console.log('🎯 Résumé:');
console.log('==========');
console.log('Toutes les pages qui font des appels API doivent avoir:');
console.log('1. Récupération du token: localStorage.getItem(\'bfs_token\')');
console.log('2. Headers avec: Authorization, Content-Type, et x-api-key');
console.log('');
console.log('💡 Si une page manque la clé API, elle retournera 401 Unauthorized !');