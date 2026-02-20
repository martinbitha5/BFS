const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const API_KEY = 'bfs-api-key-secure-2025';

async function debugDataStructure() {
    console.log('🔍 Débogage de la structure des données Dashboard\n');
    
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
        console.log('✅ Connecté:', user.email, 'Compagnie:', user.airline_code);
        
        // Récupérer les données
        console.log('\n2️⃣ Récupération des passagers...');
        const params = new URLSearchParams();
        params.append('airport', 'FIH');
        params.append('airline_code', 'ET');
        
        const response = await axios.get(`${API_BASE}/api/v1/passengers?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-api-key': API_KEY
            }
        });
        
        const passengers = response.data.data;
        console.log('✅ Données reçues:', passengers.length, 'passagers');
        
        if (passengers.length === 0) {
            console.log('❌ AUCUN PASSAGER REÇU!');
            return;
        }
        
        // Analyser la structure complète du premier passager
        console.log('\n3️⃣ Analyse de la structure des données...');
        const firstPassenger = passengers[0];
        
        console.log('\n📋 Structure complète du premier passager:');
        console.log('=====================================');
        
        // Afficher toutes les propriétés avec leurs valeurs
        Object.keys(firstPassenger).forEach(key => {
            const value = firstPassenger[key];
            let displayValue;
            
            if (value === null) {
                displayValue = 'null';
            } else if (value === undefined) {
                displayValue = 'undefined';
            } else if (typeof value === 'object') {
                displayValue = JSON.stringify(value).substring(0, 100) + (JSON.stringify(value).length > 100 ? '...' : '');
            } else if (typeof value === 'string') {
                displayValue = `"${value}"`;
            } else {
                displayValue = value;
            }
            
            console.log(`${key}: ${displayValue}`);
        });
        
        // Vérifier les champs critiques pour le dashboard
        console.log('\n🔍 Vérification des champs critiques pour le Dashboard:');
        console.log('=====================================================');
        
        const criticalFields = [
            'id', 'fullName', 'first_name', 'last_name', 'firstName', 'lastName',
            'pnr', 'flightNumber', 'departure', 'arrival', 'airportCode', 'airline_code',
            'baggages', 'boarding_status', 'checkedInAt', 'seatNumber'
        ];
        
        criticalFields.forEach(field => {
            const value = firstPassenger[field];
            const exists = value !== undefined && value !== null;
            const status = exists ? '✅' : '❌';
            console.log(`${status} ${field}: ${exists ? 'EXISTS' : 'MISSING'}`);
            if (exists) {
                console.log(`   Valeur: ${typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : value}`);
            }
        });
        
        // Comparer avec l'interface TypeScript du Dashboard
        console.log('\n📊 Comparaison avec l\'interface Dashboard:');
        console.log('==========================================');
        
        // Interface du Dashboard (basée sur Dashboard.tsx)
        const dashboardInterface = {
            id: 'string',
            first_name: 'string',
            last_name: 'string',
            fullName: 'string',
            pnr: 'string',
            flightNumber: 'string',
            departure: 'string',
            arrival: 'string',
            seatNumber: 'string | null',
            baggageCount: 'number',
            checkedInAt: 'string | null',
            airportCode: 'string',
            airline_code: 'string',
            baggages: 'array',
            boarding_status: 'array'
        };
        
        Object.entries(dashboardInterface).forEach(([field, expectedType]) => {
            const value = firstPassenger[field];
            const exists = value !== undefined && value !== null;
            const actualType = exists ? Array.isArray(value) ? 'array' : typeof value : 'missing';
            const match = exists && (expectedType.includes(actualType) || expectedType.includes('null') && value === null);
            
            const status = match ? '✅' : exists ? '⚠️' : '❌';
            console.log(`${status} ${field}: ${expectedType} → ${actualType}`);
            
            if (!match && exists) {
                console.log(`   Valeur actuelle: ${JSON.stringify(value).substring(0, 50)}`);
            }
        });
        
        // Vérifier les problèmes potentiels
        console.log('\n🚨 Problèmes potentiels identifiés:');
        console.log('===================================');
        
        const issues = [];
        
        // Vérifier les noms
        if (!firstPassenger.fullName && (!firstPassenger.first_name || !firstPassenger.last_name)) {
            issues.push('❌ Aucun nom complet disponible (ni fullName ni first_name + last_name)');
        }
        
        // Vérifier la structure des baggages
        if (firstPassenger.baggages && !Array.isArray(firstPassenger.baggages)) {
            issues.push('❌ Le champ baggages n\'est pas un array');
        }
        
        // Vérifier la structure du boarding_status
        if (firstPassenger.boarding_status && !Array.isArray(firstPassenger.boarding_status)) {
            issues.push('❌ Le champ boarding_status n\'est pas un array');
        }
        
        // Vérifier les valeurs nulles inattendues
        if (firstPassenger.flightNumber === null) {
            issues.push('❌ Le numéro de vol est null');
        }
        
        if (firstPassenger.pnr === null) {
            issues.push('❌ Le PNR est null');
        }
        
        if (issues.length === 0) {
            console.log('✅ Aucun problème majeur détecté dans la structure');
        } else {
            issues.forEach(issue => console.log(issue));
        }
        
        // Test de transformation des données
        console.log('\n🔄 Test de transformation des données:');
        console.log('======================================');
        
        const transformedPassenger = {
            id: firstPassenger.id,
            first_name: firstPassenger.first_name || firstPassenger.firstName,
            last_name: firstPassenger.last_name || firstPassenger.lastName,
            fullName: firstPassenger.fullName || `${firstPassenger.first_name || ''} ${firstPassenger.last_name || ''}`.trim(),
            pnr: firstPassenger.pnr,
            flightNumber: firstPassenger.flightNumber,
            departure: firstPassenger.departure,
            arrival: firstPassenger.arrival,
            seatNumber: firstPassenger.seatNumber,
            baggageCount: firstPassenger.baggages ? firstPassenger.baggages.length : 0,
            checkedInAt: firstPassenger.checkedInAt,
            airportCode: firstPassenger.airportCode,
            airline_code: firstPassenger.airline_code,
            baggages: firstPassenger.baggages || [],
            boarding_status: firstPassenger.boarding_status || []
        };
        
        console.log('Données transformées:');
        Object.entries(transformedPassenger).forEach(([key, value]) => {
            console.log(`${key}: ${JSON.stringify(value)}`);
        });
        
        // Conclusion
        console.log('\n🎯 CONCLUSION:');
        console.log('===============');
        
        const hasCriticalIssues = !transformedPassenger.fullName || 
                                !transformedPassenger.flightNumber || 
                                !Array.isArray(transformedPassenger.baggages) ||
                                !Array.isArray(transformedPassenger.boarding_status);
        
        if (hasCriticalIssues) {
            console.log('❌ DES PROBLÈMES CRITIQUES ONT ÉTÉ IDENTIFIÉS');
            console.log('');
            console.log('💡 RECOMMANDATIONS:');
            console.log('1. Vérifiez que l\'API renvoie bien les champs attendus');
            console.log('2. Ajoutez une couche de transformation des données');
            console.log('3. Gérez les valeurs null/undefined');
            console.log('4. Assurez-vous que les tableaux sont bien des tableaux');
        } else {
            console.log('✅ La structure des données semble correcte');
            console.log('');
            console.log('💡 Les données devraient s\'afficher correctement dans le dashboard');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du débogage:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

// Lancer le débogage
debugDataStructure();