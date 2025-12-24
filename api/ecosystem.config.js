const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Charger les variables d'environnement depuis .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Fonction pour obtenir une variable d'environnement (priorité: process.env > .env)
function getEnv(key, defaultValue) {
  return process.env[key] || defaultValue;
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

