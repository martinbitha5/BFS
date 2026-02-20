const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const API_KEY = 'bfs-api-key-secure-2025';

async function debugAPIResponse() {
    console.log('🔍 Débogage détaillé de la structure API\n');
    
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
        console.log('✅ Connecté:', user.email, 'Compagnie:', user.airline_code);

        // Récupérer les données des passagers
        const params = new URLSearchParams();
        params.append('airport', user.airport_code || 'FIH');
        if (user.airline_code && user.airline_code !== 'ALL') {
            params.append('airline_code', user.airline_code);
        }

        const response = await axios.get(`${API_BASE}/api/v1/passengers?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const passengers = response.data.data;
        console.log(`\n📊 ${passengers.length} passagers trouvés`);

        if (passengers.length > 0) {
            console.log('\n🔍 Premier passager - Structure complète:');
            const firstPassenger = passengers[0];
            console.log(JSON.stringify(firstPassenger, null, 2));

            console.log('\n🔍 Vérification des propriétés:');
            console.log('- first_name:', firstPassenger.first_name);
            console.log('- last_name:', firstPassenger.last_name);
            console.log('- firstName:', firstPassenger.firstName);
            console.log('- lastName:', firstPassenger.lastName);
            console.log('- fullName:', firstPassenger.fullName);
            console.log('- airline_code:', firstPassenger.airline_code);
            console.log('- airportCode:', firstPassenger.airportCode);
            
            // Vérifier toutes les propriétés disponibles
            console.log('\n📋 Toutes les propriétés disponibles:');
            Object.keys(firstPassenger).forEach(key => {
                console.log(`- ${key}: ${typeof firstPassenger[key]} = ${JSON.stringify(firstPassenger[key])?.substring(0, 100)}`);
            });
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

debugAPIResponse();