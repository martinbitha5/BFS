// Point d'entrée pour Hostinger - charge l'API depuis api/dist/server.js
// Ce fichier permet à Hostinger de démarrer l'API depuis la racine du dépôt

const path = require('path');
const fs = require('fs');
const Module = require('module');

// IMPORTANT: Charger les variables d'environnement AVANT tout autre import
// Les variables d'environnement de Hostinger sont déjà disponibles via process.env
// Mais on charge aussi depuis .env si disponible pour le développement local
const dotenv = require('dotenv');

// Charger depuis la racine d'abord (pour les variables Hostinger)
dotenv.config();

// Puis essayer depuis api/.env si disponible
const apiEnvPath = path.join(__dirname, 'api', '.env');
if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath, override: false }); // override: false pour ne pas écraser les variables déjà définies
}

// Vérifier que les variables critiques sont définies
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('❌ ERREUR: JWT_SECRET doit être défini en production!');
  console.error('Variables d\'environnement disponibles:', Object.keys(process.env).filter(k => k.includes('JWT') || k.includes('SUPABASE')));
  process.exit(1);
}

// Ajouter api/node_modules au chemin de résolution des modules AVANT de charger le serveur
const apiNodeModules = path.join(__dirname, 'api', 'node_modules');
const apiDistPath = path.join(__dirname, 'api', 'dist');

// Modifier le mécanisme de résolution des modules pour inclure api/node_modules
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain) {
  // Si c'est un module relatif, résoudre depuis api/dist
  if (request.startsWith('.')) {
    const parentPath = parent?.filename || __filename;
    if (parentPath.includes(apiDistPath)) {
      const resolved = path.resolve(path.dirname(parentPath), request);
      if (fs.existsSync(resolved) || fs.existsSync(resolved + '.js')) {
        return resolved;
      }
    }
  }
  
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
    throw new Error(`Le fichier serveur n'existe pas: ${serverPath}`);
  }
  
  require(serverPath);
  console.log('✅ Serveur chargé avec succès');
} catch (error) {
  console.error('❌ ERREUR lors du démarrage du serveur:');
  console.error('   Message:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
}

