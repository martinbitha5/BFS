const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const API_KEY = 'bfs-api-key-secure-2025';

async function simulateDashboardDisplay() {
    console.log('🎭 Simulation de l\'affichage Dashboard (avec clé API)\n');
    
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
        
        // Récupérer les données exactement comme le dashboard (CORRIGÉ)
        console.log('\n2️⃣ Récupération des données (avec clé API)...');
        
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-api-key': API_KEY  // ✅ CLÉ API AJOUTÉE
        };

        // Fetch departures (comme dans Dashboard.tsx)
        const depParams = new URLSearchParams(`airport=${encodeURIComponent(user.airport_code)}`);
        if (user.airline_code && user.airline_code !== 'ALL') {
            depParams.append('airline_code', user.airline_code);
            console.log(`   Filtrage départs par compagnie: ${user.airline_code}`);
        }
        
        console.log(`   URL départs: /api/v1/passengers?${depParams}`);
        const depResponse = await axios.get(`${API_BASE}/api/v1/passengers?${depParams}`, { headers });
        const depData = depResponse.data;
        console.log(`   Réponse départs: success=${depData.success}, data.length=${depData.data?.length || 0}`);
        
        // Fetch arrivals (comme dans Dashboard.tsx)
        const arrParams = new URLSearchParams(`airport=${encodeURIComponent(user.airport_code)}&filter=arrival`);
        if (user.airline_code && user.airline_code !== 'ALL') {
            arrParams.append('airline_code', user.airline_code);
            console.log(`   Filtrage arrivées par compagnie: ${user.airline_code}`);
        }
        
        console.log(`   URL arrivées: /api/v1/passengers?${arrParams}`);
        const arrResponse = await axios.get(`${API_BASE}/api/v1/passengers?${arrParams}`, { headers });
        const arrData = arrResponse.data;
        console.log(`   Réponse arrivées: success=${arrData.success}, data.length=${arrData.data?.length || 0}`);
        
        // Simulation des états du dashboard
        const departures = depData.success && Array.isArray(depData.data) ? depData.data : [];
        const arrivals = arrData.success && Array.isArray(arrData.data) ? arrData.data : [];
        
        console.log('\n3️⃣ Simulation des états du Dashboard:');
        console.log('====================================');
        
        // Vérifier le loading
        const loading = departures.length === 0 && arrivals.length === 0;
        console.log(`Loading: ${loading} (départs: ${departures.length}, arrivées: ${arrivals.length})`);
        
        // Calculer les statistiques (comme dans Dashboard.tsx)
        const allPassengers = [...departures, ...arrivals];
        const allBaggages = allPassengers.flatMap(p => p.baggages || []);
        
        console.log(`Total passagers: ${allPassengers.length}`);
        console.log(`Total baggages: ${allBaggages.length}`);
        console.log(`Total vols: ${new Set([...departures, ...arrivals].map(p => p.flightNumber)).size}`);
        
        // Vérifier s'il y a des données
        const hasData = allPassengers.length > 0;
        console.log(`Has data: ${hasData}`);
        
        // Simulation de l'affichage
        console.log('\n4️⃣ Simulation de l\'affichage:');
        console.log('===========================');
        
        if (loading) {
            console.log('📊 AFFICHAGE: Loading spinner (LoadingPlane component)');
        } else if (!hasData) {
            console.log('📊 AFFICHAGE: Dashboard vide avec cartes à zéro');
            console.log('   - Vols Actifs: 0');
            console.log('   - Passagers: 0');
            console.log('   - Bagages: 0');
            console.log('   - Embarqués: 0');
            console.log('   - Graphiques: vides ou avec données vides');
        } else {
            console.log('📊 AFFICHAGE: Dashboard complet avec données');
            console.log(`   - Vols Actifs: ${new Set([...departures, ...arrivals].map(p => p.flightNumber)).size}`);
            console.log(`   - Passagers: ${allPassengers.length}`);
            console.log(`   - Bagages: ${allBaggages.length}`);
            console.log(`   - Embarqués: ${allPassengers.filter(p => p.boarding_status?.[0]?.boarded).length}`);
            console.log(`   - Graphiques: avec ${allPassengers.length} points de données`);
        }
        
        // Vérifier les problèmes potentiels
        console.log('\n5️⃣ Vérification des problèmes potentiels:');
        console.log('========================================');
        
        if (depData.success === false) {
            console.log('❌ Problème: Les données départs ont success=false');
            console.log('   Message:', depData.message);
        }
        
        if (arrData.success === false) {
            console.log('❌ Problème: Les données arrivées ont success=false');
            console.log('   Message:', arrData.message);
        }
        
        if (!Array.isArray(depData.data)) {
            console.log('❌ Problème: depData.data n\'est pas un array');
            console.log('   Type:', typeof depData.data);
        }
        
        if (!Array.isArray(arrData.data)) {
            console.log('❌ Problème: arrData.data n\'est pas un array');
            console.log('   Type:', typeof arrData.data);
        }
        
        // Vérifier les données individuelles
        if (allPassengers.length > 0) {
            const firstPassenger = allPassengers[0];
            console.log('\n6️⃣ Premier passager (vérification structure):');
            console.log('==============================================');
            console.log('ID:', firstPassenger.id);
            console.log('Nom:', firstPassenger.fullName);
            console.log('Vol:', firstPassenger.flightNumber);
            console.log('Compagnie:', firstPassenger.airline_code);
            console.log('PNR:', firstPassenger.pnr);
            console.log('Siège:', firstPassenger.seatNumber);
            console.log('Baggages:', firstPassenger.baggages?.length || 0);
            console.log('Embarqué:', firstPassenger.boarding_status?.[0]?.boarded || false);
            
            // Vérifier les champs critiques
            const criticalFields = ['id', 'fullName', 'flightNumber', 'airline_code'];
            const missingFields = criticalFields.filter(field => !firstPassenger[field]);
            
            if (missingFields.length > 0) {
                console.log('❌ Champs critiques manquants:', missingFields);
            } else {
                console.log('✅ Tous les champs critiques présents');
            }
        }
        
        // Conclusion
        console.log('\n🎯 CONCLUSION:');
        console.log('===============');
        
        if (allPassengers.length === 0) {
            console.log('❌ AUCUNE DONNÉE À AFFICHER');
            console.log('');
            console.log('💡 Le dashboard s\'affiche mais avec des zéros partout');
            console.log('   C\'est pourquoi vous ne voyez "rien" - tout est à 0');
        } else {
            console.log('✅ DONNÉES DISPONIBLES');
            console.log('');
            console.log('💡 Le dashboard devrait afficher:');
            console.log(`   - ${allPassengers.length} passagers`);
            console.log(`   - ${new Set([...departures, ...arrivals].map(p => p.flightNumber)).size} vols`);
            console.log(`   - ${allBaggages.length} bagages`);
            console.log('   - Graphiques avec données');
            
            console.log('');
            console.log('🔧 SI VOUS NE VOYEZ TOUJOURS RIEN:');
            console.log('   1. Rebuild le dashboard: npm run build');
            console.log('   2. Redéployer le dashboard');
            console.log('   3. Vider le cache du navigateur');
            console.log('   4. Vérifier la console du navigateur (F12)');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la simulation:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

// Lancer la simulation
simulateDashboardDisplay();