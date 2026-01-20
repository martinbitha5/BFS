const http = require('http');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'MANIF RCVD TK540 28 NOV (1).pdf');
const buffer = fs.readFileSync(filePath);
const base64 = buffer.toString('base64');

console.log('Testing /api/v1/birs/upload endpoint...');
console.log('File size: ' + buffer.length + ' bytes');

const data = JSON.stringify({
  fileName: 'MANIF RCVD TK540 28 NOV (1).pdf',
  fileContent: base64,
  uploadedBy: 'test-user'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/birs/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'x-airport-code': 'FIH'
  }
};

const req = http.request(options, (res) => {
  let result = '';
  res.on('data', chunk => result += chunk);
  res.on('end', () => {
    console.log('\n✓ Response received');
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(result);
      console.log('Response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Response (raw):', result.substring(0, 500));
    }
    process.exit(0);
  });
});

req.on('error', error => {
  console.error('✗ Request error:', error.message);
  process.exit(1);
});

req.write(data);
req.end();
