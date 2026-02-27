/**
 * Script de test pour l'intégration BagJourney
 * Teste la connexion et les différents endpoints de l'API BagJourney
 */

import { initializeBagJourneyService, getBagJourneyService } from '../src/services/bagjourney.service';
import { BagJourneyConfig } from '../src/types/bagjourney.types';

async function testBagJourneyIntegration() {
  console.log('🧪 Testing BagJourney Integration...\n');

  // Configuration de test - à adapter selon vos credentials SITA
  const testConfig: BagJourneyConfig = {
    apiKey: process.env.BAGJOURNEY_API_KEY || 'test-api-key',
    baseUrl: process.env.BAGJOURNEY_BASE_URL || 'https://bagjourney.sita.aero/baggage/history/v1.0',
    timeout: 30000,
  };

  try {
    // Initialiser le service
    console.log('1️⃣ Initializing BagJourney service...');
    initializeBagJourneyService(testConfig);
    
    const service = getBagJourneyService();
    if (!service) {
      console.error('❌ Failed to initialize BagJourney service');
      return;
    }
    console.log('✅ BagJourney service initialized successfully\n');

    // Test 1: Vérifier la configuration
    console.log('2️⃣ Testing configuration...');
    const config = service.getConfig();
    console.log('📋 Configuration:', {
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      isEnabled: service.isServiceEnabled(),
    });

    // Test 2: Récupérer l'historique d'un bagage (avec données de test)
    console.log('\n3️⃣ Testing bag history retrieval...');
    const testTagNumber = '0125243458'; // Exemple SITA
    const testFlightDate = '2014-10-21'; // Exemple SITA
    
    try {
      const historyResponse = await service.getBagHistory({
        tagNumber: testTagNumber,
        flightDate: testFlightDate,
      });

      if (historyResponse.success) {
        console.log('✅ Bag history retrieved successfully');
        console.log('📦 Data:', {
          tagNumber: historyResponse.data?.tagNumber,
          flightDate: historyResponse.data?.flightDate,
          eventCount: historyResponse.data?.events.length,
          currentStatus: historyResponse.data?.currentStatus,
        });
      } else {
        console.log('⚠️  Bag history retrieval failed:', historyResponse.error);
      }
    } catch (error) {
      console.log('⚠️  Bag history test failed (expected if API key is invalid):', error);
    }

    // Test 3: Récupérer les bagages pour un vol
    console.log('\n4️⃣ Testing flight bags retrieval...');
    const testFlightNumber = 'ET840';
    const testFlightDate2 = new Date().toISOString().split('T')[0];
    
    try {
      const flightResponse = await service.getBagsForFlight({
        flightNumber: testFlightNumber,
        flightDate: testFlightDate2,
      });

      if (flightResponse.success) {
        console.log('✅ Flight bags retrieved successfully');
        console.log('✈️  Data:', {
          flightNumber: flightResponse.data?.flightNumber,
          totalBags: flightResponse.data?.totalBags,
          delayedBags: flightResponse.data?.delayedBags,
          rushBags: flightResponse.data?.rushBags,
        });
      } else {
        console.log('⚠️  Flight bags retrieval failed:', flightResponse.error);
      }
    } catch (error) {
      console.log('⚠️  Flight bags test failed (expected if API key is invalid):', error);
    }

    // Test 4: Synchronisation de données
    console.log('\n5️⃣ Testing data synchronization...');
    const testTagNumbers = ['0125243458', '0125243459', '0125243460'];
    
    try {
      const syncResponse = await service.syncBaggageData(testTagNumbers, {
        enableRealTimeSync: true,
        syncInterval: 5,
        batchSize: 10,
        retryAttempts: 3,
      });

      if (syncResponse.success) {
        console.log('✅ Data synchronization completed successfully');
        console.log('🔄 Sync Results:', syncResponse.data);
      } else {
        console.log('⚠️  Data synchronization failed:', syncResponse.error);
      }
    } catch (error) {
      console.log('⚠️  Data sync test failed (expected if API key is invalid):', error);
    }

    console.log('\n🎉 BagJourney integration test completed!');
    console.log('\n💡 Notes:');
    console.log('   - If tests failed with authentication errors, check your BAGJOURNEY_API_KEY');
    console.log('   - Some tests may fail with test data - use real SITA data in production');
    console.log('   - Ensure your SITA BagJourney account has proper permissions');

  } catch (error) {
    console.error('❌ BagJourney integration test failed:', error);
    process.exit(1);
  }
}

// Exécuter le test si ce script est lancé directement
if (require.main === module) {
  testBagJourneyIntegration()
    .then(() => {
      console.log('\n✅ Test script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

export { testBagJourneyIntegration };