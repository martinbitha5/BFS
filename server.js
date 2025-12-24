// Point d'entrée pour Hostinger - charge l'API depuis api/dist/server.js
// Ce fichier permet à Hostinger de démarrer l'API depuis la racine du dépôt

const path = require('path');
const fs = require('fs');
const Module = require('module');

// Charger les variables d'environnement depuis api/.env si disponible
const dotenv = require('dotenv');
const apiEnvPath = path.join(__dirname, 'api', '.env');
if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath });
} else {
  // Sinon charger depuis la racine
  dotenv.config();
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
try {
  require(path.join(__dirname, 'api', 'dist', 'server.js'));
} catch (error) {
  console.error('Erreur lors du démarrage du serveur:', error);
  process.exit(1);
}

