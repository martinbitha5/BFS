#!/bin/bash
# Quick deploy script for fixing flight number parsing in production

echo "🚀 Deploying flight number parsing fix to production..."

# Go to API directory
cd /home/bfs/api || {
    echo "❌ Could not find /home/bfs/api"
    exit 1
}

echo "1. Pulling latest changes from GitHub..."
git pull origin main

echo "2. Installing dependencies..."
npm install

echo "3. Building TypeScript..."
npm run build

if [ ! -f dist/server.js ]; then
    echo "❌ Build failed - dist/server.js not found"
    exit 1
fi

echo "4. Restarting PM2 service..."
pm2 restart bfs-api

echo "5. Checking service status..."
pm2 status bfs-api

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service logs:"
pm2 logs bfs-api --lines 20

# Verify the fix is working
echo ""
echo "🔍 Verifying fix by checking parser methods..."
grep -n "PRIORITÉ 3.*d{2,4}" dist/services/parser.service.js || echo "⚠️ Pattern not found in compiled code"
