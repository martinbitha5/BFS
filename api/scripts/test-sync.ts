import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY;

async function testSync() {
  console.log('🔄 Test de synchronisation des raw_scans...\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`API KEY: ${API_KEY ? '✅ Configurée' : '❌ NON configurée'}\n`);

  if (!API_KEY) {
    console.log('⚠️  ATTENTION: API_KEY manquante !');
    console.log('   Créez un fichier .env dans /api avec:');
    console.log('   API_KEY=votre_cle_api\n');
    return;
  }

  try {
    // Test de l'endpoint de synchronisation
    const airport_code = 'FIH'; // Changez selon votre aéroport

    console.log(`📡 Appel POST /api/v1/sync-raw-scans pour ${airport_code}...`);
    
    const response = await axios.post(
      `${API_URL}/api/v1/sync-raw-scans`,
      { airport_code },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n✅ Réponse de l\'API:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.stats) {
      const stats = response.data.stats;
      console.log('\n📊 Statistiques:');
      console.log(`  • Scans traités: ${stats.processed}/${stats.totalScans}`);
      console.log(`  • Passagers créés: ${stats.passengersCreated}`);
      console.log(`  • Bagages créés: ${stats.baggagesCreated}`);
      console.log(`  • Erreurs: ${stats.errors}`);
    }

  } catch (error: any) {
    console.error('\n❌ Erreur lors de la synchronisation:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Message:', error.response.data?.error || error.response.data);
    } else {
      console.error('  ', error.message);
    }
  }
}

testSync();
