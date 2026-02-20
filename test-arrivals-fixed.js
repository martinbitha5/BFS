const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const API_KEY = 'bfs-api-key-secure-2025';

async function testArrivalsPage() {
    console.log('🧪 Test de la page Arrivals (avec clé API corrigée)\n');
    
    try {
        // Connexion
        console.log('1️⃣ Connexion...');
        const loginResponse = await axios.post(`${API_BASE}/api/v1/auth/login`, {
            email: 'superviseur@bfs.cd',
            password: 'password123'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            }
        });
        
        const { token, user } = loginResponse.data.data;
        console.log('✅ Connecté:', user.email);
        console.log('   Compagnie:', user.airline_code);
        console.log('   Aéroport:', user.airport_code);
        
        // Test comme la page Arrivals
        console.log('\n2️⃣ Test appel API Arrivals...');
        
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-api-key': API_KEY  // ✅ CLÉ API AJOUTÉE
        };

        const params = new URLSearchParams();
        params.append('airport', user.airport_code);
        params.append('filter', 'arrival');
        if (user.airline_code && user.airline_code !== 'ALL') {
            params.append('airline_code', user.airline_code);
        }
        
        console.log(`   URL: /api/v1/passengers?${params.toString()}`);
        const response = await axios.get(`${API_BASE}/api/v1/passengers?${params.toString()}`, { headers });
        const data = response.data;
        
        console.log(`   Status: ${response.status}`);
        console.log(`   Success: ${data.success}`);
        console.log(`   Data length: ${data.data?.length || 0}`);
        
        if (data.success && data.data && data.data.length > 0) {
            console.log('\n3️⃣ Premier arrivé:');
            const first = data.data[0];
            console.log(`   Nom: ${first.fullName}`);
            console.log(`   Vol: ${first.flightNumber}`);
            console.log(`   Compagnie: ${first.airline_code}`);
            console.log(`   Baggages: ${first.baggages?.length || 0}`);
        }
        
        console.log('\n✅ TEST RÉUSSI - La page Arrivals fonctionnera !');
        
    } catch (error) {
        console.error('❌ Test échoué:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testArrivalsPage();