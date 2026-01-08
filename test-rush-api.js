// Script de test de l'API RUSH en production
const https = require('https');

const data = JSON.stringify({
  tagNumber: '4071303676',
  reason: 'Test soute pleine',
  nextFlightNumber: 'ET123',
  userId: 'test-user-id',
  airportCode: 'ADD'
});

const options = {
  hostname: 'api.brsats.com',
  port: 443,
  path: '/api/v1/rush/declare',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'x-api-key': 'bfs-api-key-secure-2025'
  }
};

console.log('🔍 Test de l\'API RUSH en production...');
console.log('URL:', `https://${options.hostname}${options.path}`);
console.log('Données envoyées:', JSON.parse(data));
console.log('');

const req = https.request(options, (res) => {
  console.log(`📡 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  console.log('');

  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('📦 Réponse complète:');
    try {
      const json = JSON.parse(body);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(body);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erreur:', error);
});

req.write(data);
req.end();
