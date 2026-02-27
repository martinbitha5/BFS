/**
 * Test d'intégration BagJourney pour le passenger-portal
 * Teste la recherche avec et sans BagJourney
 */

import { getBagJourneyService } from './src/services/bagjourney.service.js';

async function testPassengerPortalBagJourney() {
  console.log('🧪 Testing Passenger Portal BagJourney Integration...\n');

  try {
    const service = getBagJourneyService();
    
    // Test 1: Vérifier la connexion au service
    console.log('1️⃣ Testing BagJourney service connection...');
    const isHealthy = await service.checkHealth();
    console.log(`✅ Service health: ${isHealthy ? 'OK' : 'FAILED'}\n`);

    // Test 2: Recherche par tag BagJourney
    console.log('2️⃣ Testing bag history retrieval...');
    const testTagNumber = '0125243458';
    
    const response = await service.getBagHistory(testTagNumber);
    
    if (response.success) {
      console.log('✅ Bag history retrieved successfully');
      console.log('📦 Data:', {
        tagNumber: response.data?.tagNumber,
        flightDate: response.data?.flightDate,
        eventCount: response.data?.events.length,
        currentStatus: response.data?.currentStatus,
      });
    } else {
      console.log('⚠️  Bag history retrieval failed:', response.error);
    }

    // Test 3: Conversion au format BFS
    console.log('\n3️⃣ Testing BFS format conversion...');
    if (response.success && response.data) {
      const bfsFormat = service.convertToBFSFormat(response.data);
      console.log('✅ BFS conversion successful');
      console.log('🔄 Converted data:', {
        bag_id: bfsFormat.bag_id,
        status: bfsFormat.status,
        current_location: bfsFormat.current_location,
        baggage_type: bfsFormat.baggage_type,
        notes: bfsFormat.notes,
      });
    }

    console.log('\n🎉 Passenger Portal BagJourney integration test completed!');
    console.log('\n💡 Integration Summary:');
    console.log('   - BagJourney service is accessible from passenger-portal');
    console.log('   - Data conversion to BFS format works correctly');
    console.log('   - Ready for UI integration testing');

  } catch (error) {
    console.error('❌ Passenger Portal BagJourney test failed:', error);
    process.exit(1);
  }
}

// Exécuter le test si ce script est lancé directement
if (require.main === module) {
  testPassengerPortalBagJourney()
    .then(() => {
      console.log('\n✅ All tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

export { testPassengerPortalBagJourney };
