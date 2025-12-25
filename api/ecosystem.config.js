const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Charger les variables d'environnement
// Priorité: process.env (Hostinger) > .env file > defaultValue
const envPath = path.join(__dirname, '.env');
let envVars = {};

// D'abord, charger depuis .env si le fichier existe (pour développement local)
console.log('[ecosystem.config.js] Checking for .env at:', envPath);
console.log('[ecosystem.config.js] File exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  
  // Lire directement le fichier pour être sûr
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        envVars[key.trim()] = value.trim();
      }
    }
  });
  console.log('[ecosystem.config.js] Loaded variables from .env:', Object.keys(envVars).join(', '));
  console.log('[ecosystem.config.js] JWT_SECRET in envVars:', !!envVars.JWT_SECRET);
  console.log('[ecosystem.config.js] JWT_SECRET in process.env:', !!process.env.JWT_SECRET);
} else {
  console.log('[ecosystem.config.js] WARNING: .env file not found at:', envPath);
}

// Fonction pour obtenir une variable d'environnement
// Priorité: process.env (Hostinger) > .env file > defaultValue
function getEnv(key, defaultValue) {
  // process.env a la priorité (variables définies par Hostinger)
  if (process.env[key]) {
    return process.env[key];
  }
  // Sinon, utiliser le fichier .env
  if (envVars[key]) {
    return envVars[key];
  }
  // Sinon, utiliser la valeur par défaut
  return defaultValue;
}

module.exports = {
  apps: [{
    name: 'bfs-api',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    cwd: __dirname,
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: getEnv('PORT', '3000'),
      JWT_SECRET: getEnv('JWT_SECRET'),
      SUPABASE_URL: getEnv('SUPABASE_URL'),
      SUPABASE_SERVICE_KEY: getEnv('SUPABASE_SERVICE_KEY'),
      ALLOWED_ORIGINS: getEnv('ALLOWED_ORIGINS'),
      API_KEY: getEnv('API_KEY')
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false,
    // Pour Hostinger Cloud Pro avec plusieurs CPU, décommentez:
    // instances: 'max',
    // exec_mode: 'cluster'
  }]
};

