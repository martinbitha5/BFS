require('dotenv').config({ path: require('path').join(__dirname, '.env') });

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
      PORT: process.env.PORT || 3000,
      JWT_SECRET: process.env.JWT_SECRET,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
      API_KEY: process.env.API_KEY
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

