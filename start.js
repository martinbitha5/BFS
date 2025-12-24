#!/usr/bin/env node

// Script de démarrage simplifié pour Hostinger
// Ce script démarre directement l'API depuis api/dist/server.js

const path = require('path');
const fs = require('fs');

// Fonction pour logger à la fois dans la console ET dans un fichier
const logFile = path.join(__dirname, 'startup.log');
function log(...args) {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  console.log(message);
  try {
    fs.appendFileSync(logFile, new Date().toISOString() + ' - ' + message + '\n');
  } catch (e) {
    // Ignorer les erreurs d'écriture de log
  }
}

log('🚀 Démarrage du serveur BFS API...');
log('📁 Répertoire actuel:', process.cwd());
log('📁 __dirname:', __dirname);

// Charger les variables d'environnement
require('dotenv').config();

// Vérifier les variables critiques
log('\n🔑 Variables d\'environnement:');
log('   NODE_ENV:', process.env.NODE_ENV || 'non défini');
log('   PORT:', process.env.PORT || '3000 (par défaut)');
log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Défini (' + process.env.JWT_SECRET.substring(0, 20) + '...)' : '❌ MANQUANT');
log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Défini' : '❌ MANQUANT');
log('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Défini' : '❌ MANQUANT');

// Lister toutes les variables d'environnement pour debug
log('   Toutes les variables:', Object.keys(process.env).filter(k => k.includes('JWT') || k.includes('SUPABASE') || k.includes('API') || k.includes('NODE') || k.includes('PORT')).join(', '));

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  log('\n❌ ERREUR CRITIQUE: JWT_SECRET doit être défini en production!');
  process.exit(1);
}

// Changer vers le répertoire api pour que les chemins relatifs fonctionnent
const apiDir = path.join(__dirname, 'api');
if (!fs.existsSync(apiDir)) {
  log('❌ ERREUR: Le dossier api/ n\'existe pas!');
  process.exit(1);
}

process.chdir(apiDir);
log('\n📂 Changement vers:', process.cwd());

// Vérifier que le fichier serveur existe
const serverFile = path.join(apiDir, 'dist', 'server.js');
if (!fs.existsSync(serverFile)) {
  log('❌ ERREUR: Le fichier api/dist/server.js n\'existe pas!');
  log('   Chemin cherché:', serverFile);
  log('   Fichiers dans api/dist:', fs.existsSync(path.join(apiDir, 'dist')) ? fs.readdirSync(path.join(apiDir, 'dist')).join(', ') : 'dossier dist n\'existe pas');
  process.exit(1);
}

log('✅ Fichier serveur trouvé:', serverFile);

// Ajouter api/node_modules au chemin de résolution
const Module = require('module');
const apiNodeModules = path.join(apiDir, 'node_modules');

if (!fs.existsSync(apiNodeModules)) {
  log('❌ ERREUR: Le dossier api/node_modules n\'existe pas!');
  log('   Exécutez: cd api && npm install');
  process.exit(1);
}

// Modifier la résolution des modules
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain) {
  try {
    return originalResolveFilename(request, parent, isMain);
  } catch (err) {
    // Essayer dans api/node_modules
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

log('✅ Configuration des modules terminée');
log('\n📦 Chargement du serveur...\n');

// Charger le serveur
try {
  require(serverFile);
  log('✅ Serveur chargé avec succès');
  log('✅ Le serveur devrait maintenant être en cours d\'exécution sur le port', process.env.PORT || 3000);
} catch (error) {
  log('\n❌ ERREUR lors du chargement du serveur:');
  log('   Message:', error.message);
  log('   Stack:', error.stack);
  process.exit(1);
}

