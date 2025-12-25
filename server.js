// Point d'entrée pour Hostinger - charge l'API depuis api/dist/server.js
// Ce fichier permet à Hostinger de démarrer l'API depuis la racine du dépôt

const path = require('path');
const fs = require('fs');
const Module = require('module');

// IMPORTANT: Charger les variables d'environnement AVANT tout autre import
// Les variables d'environnement de Hostinger sont déjà disponibles via process.env
// Mais on charge aussi depuis .env si disponible pour le développement local
const dotenv = require('dotenv');

// Charger depuis api/.env en PRIORITÉ (car c'est là que sont les variables complètes)
const apiEnvPath = path.join(__dirname, 'api', '.env');
if (fs.existsSync(apiEnvPath)) {
  const result = dotenv.config({ path: apiEnvPath }); // Charger d'abord depuis api/.env
  if (result.error) {
    console.error('❌ Erreur lors du chargement de api/.env:', result.error);
  } else {
    console.log('✅ Variables chargées depuis api/.env:', Object.keys(result.parsed || {}).join(', '));
  }
}

// Puis charger depuis la racine (pour les variables Hostinger qui peuvent override)
dotenv.config({ override: false }); // override: false pour ne pas écraser api/.env

// Vérifier que les variables critiques sont définies
// Note: En production sur Hostinger, les variables sont chargées depuis api/.env
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.JWT_SECRET) {
  console.error('❌ ERREUR: JWT_SECRET doit être défini en production!');
  console.error('   NODE_ENV:', process.env.NODE_ENV || 'non défini');
  console.error('   PORT:', process.env.PORT || 'non défini');
  console.error('   Fichier api/.env existe:', fs.existsSync(apiEnvPath));
  console.error('   Variables d\'environnement disponibles:', Object.keys(process.env).filter(k => k.includes('JWT') || k.includes('SUPABASE') || k.includes('API') || k.includes('PORT') || k.includes('NODE')).join(', '));
  console.error('   JWT_SECRET dans process.env:', !!process.env.JWT_SECRET);
  console.error('   Chemin api/.env:', apiEnvPath);
  process.exit(1);
}

// Ajouter api/node_modules au chemin de résolution des modules AVANT de charger le serveur
const apiNodeModules = path.join(__dirname, 'api', 'node_modules');
const apiDistPath = path.join(__dirname, 'api', 'dist');

// Modifier le mécanisme de résolution des modules pour inclure api/node_modules
// Ne pas modifier la résolution des modules relatifs - laisser Node.js le faire naturellement
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain) {
  try {
    return originalResolveFilename(request, parent, isMain);
  } catch (err) {
    // Si le module n'est pas trouvé, essayer dans api/node_modules
    const modulePath = path.join(apiNodeModules, request);
    if (fs.existsSync(modulePath) || fs.existsSync(modulePath + '.js')) {
      return originalResolveFilename(request, {
        ...parent,
        paths: [apiNodeModules, ...(parent?.paths || [])]
      }, isMain);
    }
    throw err;
  }
};

// Changer le répertoire de travail vers api/ pour que les chemins relatifs fonctionnent
process.chdir(path.join(__dirname, 'api'));

// Charger et démarrer le serveur API
console.log('🚀 Démarrage du serveur API...');
console.log('📁 Répertoire de travail:', process.cwd());
console.log('🔑 Variables d\'environnement critiques:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   PORT:', process.env.PORT);
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Défini' : '❌ MANQUANT');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Défini' : '❌ MANQUANT');
console.log('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Défini' : '❌ MANQUANT');

try {
  const serverPath = path.join(__dirname, 'api', 'dist', 'server.js');
  console.log('📂 Chargement du serveur depuis:', serverPath);
  
  if (!fs.existsSync(serverPath)) {
    console.error('❌ ERREUR: Le fichier serveur n\'existe pas:', serverPath);
    console.error('📦 Tentative de build automatique...');
    
    // Essayer de builder automatiquement
    const { execSync } = require('child_process');
    try {
      console.log('🔨 Exécution de npm run build...');
      execSync('npm run build', { 
        cwd: __dirname, 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      // Vérifier à nouveau
      if (!fs.existsSync(serverPath)) {
        throw new Error('Le build a échoué - le fichier dist/server.js n\'existe toujours pas');
      }
      console.log('✅ Build réussi !');
    } catch (buildError) {
      console.error('❌ ERREUR lors du build automatique:');
      console.error('   Message:', buildError.message);
      throw new Error(`Impossible de builder l'API. Vérifiez que TypeScript est installé et que le code compile correctement.`);
    }
  }
  
  require(serverPath);
  console.log('✅ Serveur chargé avec succès');
} catch (error) {
  console.error('❌ ERREUR lors du démarrage du serveur:');
  console.error('   Message:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
}

