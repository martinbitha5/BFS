const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const API_KEY = 'bfs-api-key-secure-2025';

async function testDashboardExactParams() {
    console.log('🔍 TEST - Exactement les mêmes paramètres que le Dashboard\n');
    
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
        
        // 🎯 EXACTEMENT comme le Dashboard.tsx fait
        console.log('\n📊 Test paramètres Dashboard (Départs)...');
        
        // Même code que Dashboard.tsx ligne 95-96
        const depParams = new URLSearchParams(`airport=${encodeURIComponent(user.airport_code)}`);
        if (user.airline_code && user.airline_code !== 'ALL') {
            depParams.append('airline_code', user.airline_code);
            console.log(`[Dashboard] Filtrage départs par compagnie: ${user.airline_code}`);
        }
        
        console.log(`URL appelée: /api/v1/passengers?${depParams.toString()}`);
        
        const depResponse = await axios.get(`${API_BASE}/api/v1/passengers?${depParams}`, { headers });
        const depData = depResponse.data;
        
        console.log(`Status: ${depResponse.status}`);
        console.log(`Success: ${depData.success}`);
        console.log(`Data length: ${depData.data?.length || 0}`);
        
        if (depData.data && depData.data.length > 0) {
            console.log('\n✅ DONNÉES TROUVÉES !');
            console.log(`Premier passager: ${depData.data[0].fullName}`);
            console.log(`Vol: ${depData.data[0].flightNumber}`);
        } else {
            console.log('\n❌ AUCUNE DONNÉE - Même problème que le dashboard !');
            
            // Testons sans l'URL encoding
            console.log('\n🧪 Test sans encodeURIComponent...');
            const simpleParams = new URLSearchParams();
            simpleParams.append('airport', user.airport_code);
            if (user.airline_code && user.airline_code !== 'ALL') {
                simpleParams.append('airline_code', user.airline_code);
            }
            
            console.log(`URL simple: /api/v1/passengers?${simpleParams.toString()}`);
            const simpleResponse = await axios.get(`${API_BASE}/api/v1/passengers?${simpleParams}`, { headers });
            const simpleData = simpleResponse.data;
            
            console.log(`Simple - Data length: ${simpleData.data?.length || 0}`);
            
            // Testons avec FIH et ET en dur
            console.log('\n🧪 Test avec FIH/ET en dur...');
            const hardcodedResponse = await axios.get(`${API_BASE}/api/v1/passengers?airport=FIH&airline_code=ET`, { headers });
            const hardcodedData = hardcodedResponse.data;
            
            console.log(`Hardcoded - Data length: ${hardcodedData.data?.length || 0}`);
            
            if (hardcodedData.data && hardcodedData.data.length > 0) {
                console.log('✅ DONNÉES AVEC PARAMÈTRES EN DUR !');
                console.log('Le problème vient de la construction des paramètres !');
            }
        }
        
        // Test Arrivées
        console.log('\n📊 Test paramètres Dashboard (Arrivées)...');
        const arrParams = new URLSearchParams(`airport=${encodeURIComponent(user.airport_code)}&filter=arrival`);
        if (user.airline_code && user.airline_code !== 'ALL') {
            arrParams.append('airline_code', user.airline_code);
        }
        
        const arrResponse = await axios.get(`${API_BASE}/api/v1/passengers?${arrParams}`, { headers });
        const arrData = arrResponse.data;
        
        console.log(`Arrivées - Data length: ${arrData.data?.length || 0}`);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testDashboardExactParams();