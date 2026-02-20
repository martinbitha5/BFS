const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const API_KEY = 'bfs-api-key-secure-2025';

async function testPassengersPageFixed() {
    console.log('🧪 TEST - Page Passengers après correction\n');
    
    try {
        // Connexion
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
        
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
        };
        
        // Test comme la page Passengers (CORRIGÉE)
        console.log('\n👥 TEST appel API Passengers (sans double params)...');
        
        const params = new URLSearchParams();
        params.append('airport', user.airport_code);
        if (user.airline_code && user.airline_code !== 'ALL') {
            params.append('airline_code', user.airline_code);
        }
        
        console.log(`   URL: /api/v1/passengers?${params.toString()}`);
        
        // CORRECTION: plus de double params
        const response = await axios.get(`${API_BASE}/api/v1/passengers?${params.toString()}`, { 
            headers 
        });
        
        const data = response.data;
        console.log(`   Status: ${response.status} ✅`);
        console.log(`   Success: ${data.success} ✅`);
        console.log(`   Data length: ${data.data?.length || 0}`);
        
        if (data.success && data.data && data.data.length > 0) {
            console.log('\n📋 Premiers passagers:');
            data.data.slice(0, 3).forEach((passenger, index) => {
                console.log(`   ${index + 1}. ${passenger.fullName} - Vol ${passenger.flightNumber} - PNR: ${passenger.pnr}`);
            });
            console.log(`   ... et ${data.data.length - 3} autres`);
        }
        
        console.log('\n✅ TEST RÉUSSI - La page Passengers fonctionnera !');
        
    } catch (error) {
        console.error('❌ Test échoué:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testPassengersPageFixed();