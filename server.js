// Point d'entrée pour Hostinger - charge l'API depuis api/dist/server.js
// Ce fichier permet à Hostinger de démarrer l'API depuis la racine du dépôt

const path = require('path');
const fs = require('fs');

// Charger les variables d'environnement depuis api/.env si disponible
const dotenv = require('dotenv');
const apiEnvPath = path.join(__dirname, 'api', '.env');
if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath });
} else {
  // Sinon charger depuis la racine
  dotenv.config();
}

// Changer le répertoire de travail vers api/ pour que Node.js trouve les node_modules
process.chdir(path.join(__dirname, 'api'));

// Ajouter api/node_modules au chemin de résolution des modules
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain) {
  try {
    return originalResolveFilename(request, parent, isMain);
  } catch (err) {
    // Si le module n'est pas trouvé, essayer dans api/node_modules
    const apiNodeModules = path.join(__dirname, 'api', 'node_modules');
    if (fs.existsSync(path.join(apiNodeModules, request))) {
      return originalResolveFilename(request, {
        ...parent,
        paths: [apiNodeModules, ...(parent?.paths || [])]
      }, isMain);
    }
    throw err;
  }
};

// Charger et démarrer le serveur API
require(path.join(__dirname, 'api', 'dist', 'server.js'));

