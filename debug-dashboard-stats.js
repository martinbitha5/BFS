const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const API_KEY = 'bfs-api-key-secure-2025';

async function debugDashboardStats() {
    console.log('🔍 DEBUG - Analyse des statistiques Dashboard\n');
    
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
        
        // Récupérer les données comme le Dashboard
        console.log('\n📊 Récupération des données...');
        
        // Départs
        const depParams = new URLSearchParams();
        depParams.append('airport', user.airport_code);
        if (user.airline_code && user.airline_code !== 'ALL') {
            depParams.append('airline_code', user.airline_code);
        }
        const depResponse = await axios.get(`${API_BASE}/api/v1/passengers?${depParams}`, { headers });
        const departures = depResponse.data.data || [];
        console.log(`Départs: ${departures.length} passagers`);
        
        // Arrivées
        const arrParams = new URLSearchParams();
        arrParams.append('airport', user.airport_code);
        arrParams.append('filter', 'arrival');
        if (user.airline_code && user.airline_code !== 'ALL') {
            arrParams.append('airline_code', user.airline_code);
        }
        const arrResponse = await axios.get(`${API_BASE}/api/v1/passengers?${arrParams}`, { headers });
        const arrivals = arrResponse.data.data || [];
        console.log(`Arrivées: ${arrivals.length} passagers`);
        
        // Calculer les stats comme le Dashboard
        const allPassengers = [...departures, ...arrivals];
        const allBaggages = allPassengers.flatMap(p => p.baggages || []);
        
        console.log('\n📈 STATISTIQUES CALCULÉES:');
        console.log('===========================');
        
        const stats = {
            totalFlights: new Set([...departures, ...arrivals].map(p => p.flightNumber)).size,
            totalPassengers: allPassengers.length,
            totalBaggages: allBaggages.length,
            checkedInPassengers: allPassengers.filter(p => p.checkedInAt).length,
            boardedPassengers: allPassengers.filter(p => p.boarding_status?.[0]?.boarded).length,
            deliveredBaggages: allBaggages.filter(b => b.delivered_at).length,
            pendingBaggages: allBaggages.filter(b => !b.delivered_at && b.arrived_at).length,
            avgBaggagesPerPassenger: allPassengers.length > 0 ? Math.round((allBaggages.length / allPassengers.length) * 10) / 10 : 0
        };
        
        console.log(`Total vols: ${stats.totalFlights}`);
        console.log(`Total passagers: ${stats.totalPassengers}`);
        console.log(`Total bagages: ${stats.totalBaggages}`);
        console.log(`Passagers enregistrés: ${stats.checkedInPassengers}`);
        console.log(`Passagers embarqués: ${stats.boardedPassengers}`);
        console.log(`Bagages livrés: ${stats.deliveredBaggages}`);
        console.log(`Bagages en attente: ${stats.pendingBaggages}`);
        console.log(`Moyenne bagages/passager: ${stats.avgBaggagesPerPassenger}`);
        
        // Analyser les vols
        console.log('\n✈️ DÉTAILS DES VOLS:');
        console.log('====================');
        const flightMap = new Map();
        allPassengers.forEach(p => {
            if (!flightMap.has(p.flightNumber)) {
                flightMap.set(p.flightNumber, {
                    flight: p.flightNumber,
                    passengers: 0,
                    boarded: 0,
                    baggages: 0,
                    delivered: 0
                });
            }
            const data = flightMap.get(p.flightNumber);
            data.passengers++;
            if (p.boarding_status?.[0]?.boarded) data.boarded++;
            if (p.baggages && Array.isArray(p.baggages)) {
                data.baggages += p.baggages.length;
                data.delivered += p.baggages.filter(b => b.delivered_at).length;
            }
        });
        
        const flightData = Array.from(flightMap.values());
        flightData.forEach(flight => {
            console.log(`Vol ${flight.flight}:`);
            console.log(`  - Passagers: ${flight.passengers}`);
            console.log(`  - Embarqués: ${flight.boarded}`);
            console.log(`  - Bagages: ${flight.baggages}`);
            console.log(`  - Livrés: ${flight.delivered}`);
        });
        
        // Vérifier les données des passagers
        console.log('\n👥 EXEMPLE DE DONNÉES PASSAGER:');
        console.log('=================================');
        if (departures.length > 0) {
            const first = departures[0];
            console.log('Premier passager départ:');
            console.log(`  - Nom: ${first.fullName}`);
            console.log(`  - Vol: ${first.flightNumber}`);
            console.log(`  - Enregistré à: ${first.checkedInAt || 'Non enregistré'}`);
            console.log(`  - Statut embarquement: ${JSON.stringify(first.boarding_status)}`);
            console.log(`  - Bagages: ${first.baggages?.length || 0}`);
        }
        
        console.log('\n✅ CONCLUSION:');
        console.log(`Les stats devraient montrer ${stats.totalPassengers} passagers, ${stats.totalFlights} vols, etc.`);
        console.log(`Si le dashboard affiche 0, c'est un problème d'affichage React !`);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

debugDashboardStats();