// Test pour vérifier l'affichage réact des stats
const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const API_KEY = 'bfs-api-key-secure-2025';

async function simulateDashboardDisplay() {
    console.log('🎭 SIMULATION - Affichage Dashboard React\n');
    
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
        
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
        };
        
        // Récupérer les données
        console.log('\n📊 Récupération des données...');
        
        const depParams = new URLSearchParams();
        depParams.append('airport', user.airport_code);
        if (user.airline_code && user.airline_code !== 'ALL') {
            depParams.append('airline_code', user.airline_code);
        }
        const depResponse = await axios.get(`${API_BASE}/api/v1/passengers?${depParams}`, { headers });
        const departures = depResponse.data.data || [];
        
        const arrParams = new URLSearchParams();
        arrParams.append('airport', user.airport_code);
        arrParams.append('filter', 'arrival');
        if (user.airline_code && user.airline_code !== 'ALL') {
            arrParams.append('airline_code', user.airline_code);
        }
        const arrResponse = await axios.get(`${API_BASE}/api/v1/passengers?${arrParams}`, { headers });
        const arrivals = arrResponse.data.data || [];
        
        console.log(`Départs: ${departures.length}`);
        console.log(`Arrivées: ${arrivals.length}`);
        
        // Simuler le calcul des stats comme dans React
        console.log('\n🧮 CALCUL DES STATS (simulation React):');
        
        // Simuler l'état initial (avant fetch)
        let departuresState = [];
        let arrivalsState = [];
        let loadingState = true;
        
        console.log(`État initial - loading: ${loadingState}`);
        
        // Simuler après fetch (comme dans useEffect)
        departuresState = departures;
        arrivalsState = arrivals;
        loadingState = false;
        
        console.log(`Après fetch - loading: ${loadingState}`);
        console.log(`Départs state: ${departuresState.length}`);
        console.log(`Arrivées state: ${arrivalsState.length}`);
        
        // Calculer les stats (comme dans le composant)
        const allPassengers = [...departuresState, ...arrivalsState];
        const allBaggages = allPassengers.flatMap(p => p.baggages || []);
        
        const dashboardStats = {
            totalFlights: new Set([...departuresState, ...arrivalsState].map(p => p.flightNumber)).size,
            totalPassengers: allPassengers.length,
            totalBaggages: allBaggages.length,
            checkedInPassengers: allPassengers.filter(p => p.checkedInAt).length,
            boardedPassengers: allPassengers.filter(p => p.boarding_status?.[0]?.boarded).length,
            deliveredBaggages: allBaggages.filter(b => b.delivered_at).length,
            pendingBaggages: allBaggages.filter(b => !b.delivered_at && b.arrived_at).length,
            avgBaggagesPerPassenger: allPassengers.length > 0 ? Math.round((allBaggages.length / allPassengers.length) * 10) / 10 : 0
        };
        
        console.log('\n📊 STATS AFFICHÉES DANS LE DASHBOARD:');
        console.log('=====================================');
        console.log(`Vols Actifs: ${dashboardStats.totalFlights}`);
        console.log(`Passagers: ${dashboardStats.totalPassengers}`);
        console.log(`Passagers enregistrés: ${dashboardStats.checkedInPassengers}`);
        console.log(`Total bagages: ${dashboardStats.totalBaggages}`);
        console.log(`Passagers embarqués: ${dashboardStats.boardedPassengers}`);
        console.log(`Bagages livrés: ${dashboardStats.deliveredBaggages}`);
        console.log(`Bagages en attente: ${dashboardStats.pendingBaggages}`);
        
        // Vérifier si les données ont les bons champs
        console.log('\n🔍 VÉRIFICATION DES DONNÉES:');
        if (departures.length > 0) {
            const first = departures[0];
            console.log(`Premier passager:`);
            console.log(`  - fullName: ${first.fullName}`);
            console.log(`  - flightNumber: ${first.flightNumber}`);
            console.log(`  - checkedInAt: ${first.checkedInAt}`);
            console.log(`  - boarding_status: ${JSON.stringify(first.boarding_status)}`);
            console.log(`  - baggages: ${first.baggages?.length || 0}`);
        }
        
        console.log('\n✅ SIMULATION TERMINÉE');
        console.log('Les stats devraient s\'afficher correctement dans le dashboard !');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

simulateDashboardDisplay();