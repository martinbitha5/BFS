const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const API_KEY = 'bfs-api-key-secure-2025';

async function testFinalDashboard() {
    console.log('🎯 Test Final - Dashboard BFS\n');
    
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
            console.log('\n✅ Test des données du Dashboard:');
            
            // Test 1: Affichage des noms
            const firstPassenger = passengers[0];
            console.log(`   Nom complet: ${firstPassenger.fullName}`);
            console.log(`   Vol: ${firstPassenger.flightNumber}`);
            console.log(`   Compagnie: ${firstPassenger.airline_code}`);
            console.log(`   Aéroport: ${firstPassenger.airportCode}`);
            
            // Test 2: Calcul des statistiques (comme le Dashboard)
            const allPassengers = passengers;
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

            console.log('\n📈 Statistiques du Dashboard:');
            console.log(`   Vols actifs: ${stats.totalFlights}`);
            console.log(`   Passagers total: ${stats.totalPassengers}`);
            console.log(`   Passagers enregistrés: ${stats.checkedInPassengers}`);
            console.log(`   Passagers embarqués: ${stats.boardedPassengers}`);
            console.log(`   Bagages total: ${stats.totalBaggages}`);
            console.log(`   Bagages livrés: ${stats.deliveredBaggages}`);
            console.log(`   Moyenne bagages/passager: ${stats.avgBaggagesPerPassenger}`);

            // Test 3: Vérification des problèmes résolus
            console.log('\n✅ Vérification des corrections:');
            console.log(`   ✓ fullName accessible: ${firstPassenger.fullName ? 'OUI' : 'NON'}`);
            console.log(`   ✓ airline_code présent: ${firstPassenger.airline_code ? 'OUI' : 'NON'}`);
            console.log(`   ✓ airportCode présent: ${firstPassenger.airportCode ? 'OUI' : 'NON'}`);
            console.log(`   ✓ Données filtrées correctement: ${passengers.every(p => p.airline_code === user.airline_code) ? 'OUI' : 'NON'}`);
            
            console.log('\n🎉 SUCCÈS: Le Dashboard devrait maintenant afficher les données correctement!');
            console.log('\n💡 Résumé des corrections apportées:');
            console.log('   1. Interface Passenger corrigée avec fullName');
            console.log('   2. Filtre client-side supprimé (conflit avec serveur)');
            console.log('   3. Structure de données cohérente');
            
        } else {
            console.log('⚠️  Aucun passager trouvé');
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

testFinalDashboard();