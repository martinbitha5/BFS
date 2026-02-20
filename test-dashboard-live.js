const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const DASHBOARD_URL = 'http://localhost:4173';
const API_KEY = 'bfs-api-key-secure-2025';

async function testDashboardLive() {
    console.log('🎯 Test en direct du Dashboard BFS\n');
    
    try {
        // Étape 1: Vérifier que les serveurs sont actifs
        console.log('1️⃣ Vérification des serveurs...');
        
        // Tester le dashboard
        try {
            const dashboardResponse = await axios.get(DASHBOARD_URL, { timeout: 5000 });
            console.log('✅ Dashboard accessible sur', DASHBOARD_URL);
        } catch (error) {
            console.log('❌ Dashboard non accessible:', error.message);
            console.log('💡 Assurez-vous que "npm run preview" tourne dans le dossier dashboard');
            return;
        }
        
        // Tester l'API
        try {
            const apiResponse = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
            console.log('✅ API accessible sur', API_BASE);
        } catch (error) {
            console.log('❌ API non accessible:', error.message);
            console.log('💡 Assurez-vous que l\'API tourne sur le port 3000');
            return;
        }
        
        // Étape 2: Test de connexion
        console.log('\n2️⃣ Test de connexion...');
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
        console.log('   Utilisateur:', user.email);
        console.log('   Rôle:', user.role);
        console.log('   Compagnie:', user.airline_code);
        console.log('   Aéroport:', user.airport_code);
        
        // Étape 3: Récupération des données
        console.log('\n3️⃣ Récupération des données...');
        const params = new URLSearchParams();
        params.append('airport', user.airport_code || 'FIH');
        if (user.airline_code && user.airline_code !== 'ALL') {
            params.append('airline_code', user.airline_code);
        }
        
        const passengersResponse = await axios.get(`${API_BASE}/api/v1/passengers?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        const passengers = passengersResponse.data.data;
        console.log('✅ Données récupérées:', passengers.length, 'passagers');
        
        if (passengers.length > 0) {
            const firstPassenger = passengers[0];
            console.log('   Premier passager:', firstPassenger.fullName);
            console.log('   Vol:', firstPassenger.flightNumber);
            console.log('   Compagnie:', firstPassenger.airline_code);
            console.log('   Aéroport:', firstPassenger.airportCode);
        }
        
        // Étape 4: Analyse des données pour le dashboard
        console.log('\n4️⃣ Analyse des statistiques...');
        
        const stats = {
            totalFlights: new Set(passengers.map(p => p.flightNumber)).size,
            totalPassengers: passengers.length,
            totalBaggages: passengers.reduce((sum, p) => sum + (p.baggages?.length || 0), 0),
            checkedInPassengers: passengers.filter(p => p.checkedInAt).length,
            boardedPassengers: passengers.filter(p => p.boarding_status?.[0]?.boarded).length,
            deliveredBaggages: passengers.flatMap(p => p.baggages || []).filter(b => b.delivered_at).length
        };
        
        console.log('📊 Statistiques calculées:');
        console.log('   Vols actifs:', stats.totalFlights);
        console.log('   Passagers total:', stats.totalPassengers);
        console.log('   Passagers enregistrés:', stats.checkedInPassengers);
        console.log('   Passagers embarqués:', stats.boardedPassengers);
        console.log('   Bagages total:', stats.totalBaggages);
        console.log('   Bagages livrés:', stats.deliveredBaggages);
        
        // Étape 5: Vérification finale
        console.log('\n5️⃣ Vérification finale...');
        
        const checks = {
            'Dashboard accessible': true,
            'API fonctionnelle': true,
            'Connexion réussie': true,
            'Données récupérées': passengers.length > 0,
            'Filtrage par compagnie': passengers.every(p => p.airline_code === user.airline_code),
            'Structure correcte': passengers.every(p => p.fullName && p.flightNumber && p.airline_code),
            'Statistiques calculables': stats.totalPassengers > 0
        };
        
        console.log('\n✅ Résultats des vérifications:');
        Object.entries(checks).forEach(([check, result]) => {
            console.log(`   ${result ? '✅' : '❌'} ${check}`);
        });
        
        const allPassed = Object.values(checks).every(v => v);
        
        console.log('\n' + '='.repeat(60));
        if (allPassed) {
            console.log('🎉 SUCCÈS: Le Dashboard est prêt et fonctionnel!');
            console.log('');
            console.log('💡 Le dashboard devrait maintenant afficher:');
            console.log('   • Les 23 passagers Ethiopian Airlines (ET)');
            console.log('   • Les statistiques des vols FIH');
            console.log('   • Les graphiques d\'embarquement');
            console.log('   • Les données de bagages');
            console.log('');
            console.log('🌐 Ouvrez http://localhost:4173 dans votre navigateur');
            console.log('   Connectez-vous avec: superviseur@bfs.cd / password123');
        } else {
            console.log('⚠️  ATTENTION: Certains tests ont échoué');
            console.log('   Vérifiez les points ci-dessus');
        }
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

// Lancer le test
testDashboardLive();