const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const API_KEY = 'bfs-api-key-secure-2025';

async function testDashboardFlow() {
    console.log('🧪 Test du flux complet du Dashboard BFS\n');
    
    try {
        // 1. Connexion
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
        console.log('✅ Connexion réussie');
        
        if (!user) {
            throw new Error('Utilisateur non trouvé dans la réponse');
        }
        
        console.log(`   Utilisateur: ${user.email}`);
        console.log(`   Rôle: ${user.role}`);
        console.log(`   Aéroport: ${user.airport_code}`);
        console.log(`   Compagnie: ${user.airline_code}\n`);

        // 2. Test API Passagers (Départs)
        console.log('2️⃣ Test API Passagers - Départs...');
        const depParams = new URLSearchParams();
        depParams.append('airport', user.airport_code || 'FIH');
        if (user.airline_code && user.airline_code !== 'ALL') {
            depParams.append('airline_code', user.airline_code);
        }

        const depResponse = await axios.get(`${API_BASE}/api/v1/passengers?${depParams.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ Départs: ${depResponse.data.success ? 'Succès' : 'Échec'}`);
        console.log(`   Nombre de passagers: ${depResponse.data.data?.length || 0}`);
        
        if (depResponse.data.data && depResponse.data.data.length > 0) {
            const firstPassenger = depResponse.data.data[0];
            console.log(`   Premier passager: ${firstPassenger.firstName} ${firstPassenger.lastName}`);
            console.log(`   Compagnie: ${firstPassenger.airline_code || 'N/A'}`);
            console.log(`   Aéroport: ${firstPassenger.airportCode || 'N/A'}`);
            
            // Vérifier la structure des données
            console.log(`   Structure baggages: ${Array.isArray(firstPassenger.baggages) ? firstPassenger.baggages.length + ' baggages' : 'Aucun'}`);
            console.log(`   Structure boarding_status: ${Array.isArray(firstPassenger.boarding_status) ? firstPassenger.boarding_status.length + ' statuts' : 'Aucun'}`);
        }
        console.log('');

        // 3. Test API Passagers (Arrivées)
        console.log('3️⃣ Test API Passagers - Arrivées...');
        const arrParams = new URLSearchParams();
        arrParams.append('airport', user.airport_code || 'FIH');
        arrParams.append('filter', 'arrival');
        if (user.airline_code && user.airline_code !== 'ALL') {
            arrParams.append('airline_code', user.airline_code);
        }

        const arrResponse = await axios.get(`${API_BASE}/api/v1/passengers?${arrParams.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ Arrivées: ${arrResponse.data.success ? 'Succès' : 'Échec'}`);
        console.log(`   Nombre de passagers: ${arrResponse.data.data?.length || 0}\n`);

        // 4. Simulation des calculs du Dashboard
        console.log('4️⃣ Simulation des calculs du Dashboard...');
        const allPassengers = [...(depResponse.data.data || []), ...(arrResponse.data.data || [])];
        const allBaggages = allPassengers.flatMap(p => p.baggages || []);

        const stats = {
            totalFlights: new Set(allPassengers.map(p => p.flightNumber)).size,
            totalPassengers: allPassengers.length,
            totalBaggages: allBaggages.length,
            checkedInPassengers: allPassengers.filter(p => p.checkedInAt).length,
            boardedPassengers: allPassengers.filter(p => p.boarding_status?.[0]?.boarded).length,
            deliveredBaggages: allBaggages.filter(b => b.delivered_at).length,
            pendingBaggages: allBaggages.filter(b => !b.delivered_at && b.arrived_at).length,
            avgBaggagesPerPassenger: allPassengers.length > 0 ? Math.round((allBaggages.length / allPassengers.length) * 10) / 10 : 0
        };

        console.log('📊 Statistiques calculées:');
        console.log(`   Vols actifs: ${stats.totalFlights}`);
        console.log(`   Passagers total: ${stats.totalPassengers}`);
        console.log(`   Passagers enregistrés: ${stats.checkedInPassengers}`);
        console.log(`   Passagers embarqués: ${stats.boardedPassengers}`);
        console.log(`   Bagages total: ${stats.totalBaggages}`);
        console.log(`   Bagages livrés: ${stats.deliveredBaggages}`);
        console.log(`   Bagages en attente: ${stats.pendingBaggages}`);
        console.log(`   Moyenne bagages/passager: ${stats.avgBaggagesPerPassenger}\n`);

        // 5. Vérification des problèmes potentiels
        console.log('5️⃣ Vérification des problèmes potentiels...');
        
        // Problème 1: Données vides
        if (allPassengers.length === 0) {
            console.log('⚠️  Aucune donnée de passager reçue');
        }

        // Problème 2: Structure des données
        const samplePassenger = allPassengers[0];
        if (samplePassenger) {
            console.log('🔍 Analyse du premier passager:');
            console.log(`   ID: ${samplePassenger.id}`);
            console.log(`   Nom: ${samplePassenger.firstName} ${samplePassenger.lastName}`);
            console.log(`   Vol: ${samplePassenger.flightNumber}`);
            console.log(`   Compagnie (airline_code): ${samplePassenger.airline_code || 'MANQUANT'}`);
            console.log(`   Aéroport (airportCode): ${samplePassenger.airportCode || 'MANQUANT'}`);
            console.log(`   Baggages: ${Array.isArray(samplePassenger.baggages) ? 'OK' : 'MANQUANT'}`);
            console.log(`   Boarding status: ${Array.isArray(samplePassenger.boarding_status) ? 'OK' : 'MANQUANT'}`);
            console.log(`   Check-in: ${samplePassenger.checkedInAt || 'NON ENREGISTRÉ'}`);
        }

        console.log('\n✅ Test complet du flux Dashboard terminé');
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

// Exécuter le test
testDashboardFlow();