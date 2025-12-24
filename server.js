// Point d'entrée pour Hostinger - charge l'API depuis api/dist/server.js
// Ce fichier permet à Hostinger de démarrer l'API depuis la racine du dépôt

// Charger les variables d'environnement depuis api/.env si disponible
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Essayer de charger .env depuis api/ d'abord
const apiEnvPath = path.join(__dirname, 'api', '.env');
if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath });
} else {
  // Sinon charger depuis la racine
  dotenv.config();
}

// Charger et démarrer le serveur API
require('./api/dist/server.js');

