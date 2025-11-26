/**
 * Script de test de flux complet pour tous les agents et aéroports
 * 
 * Ce script teste le flux complet de l'application :
 * 1. Check-in : Enregistrement des passagers
 * 2. Baggage : Enregistrement des bagages RFID
 * 3. Boarding : Embarquement des passagers
 * 4. Arrival : Confirmation de l'arrivée des bagages
 * 5. Supervisor : Consultation des données
 * 
 * Pour chaque aéroport et chaque rôle, le script vérifie que :
 * - Les données sont correctement créées
 * - Les validations d'aéroport fonctionnent
 * - Les filtres par aéroport fonctionnent
 * - Le flux complet fonctionne sans erreur
 */

import * as SQLite from 'expo-sqlite';
import { SQLITE_SCHEMA } from '../src/database/schema';
import { databaseService } from '../src/services/database.service';
import { parserService } from '../src/services/parser.service';
import { AIRPORTS } from '../src/constants/airports';
import { UserRole } from '../src/types/user.types';
import { Passenger } from '../src/types/passenger.types';
import { Baggage } from '../src/types/baggage.types';
import { BoardingStatus } from '../src/types/boarding.types';

// Types pour les résultats de test
interface TestResult {
  airport: string;
  role: UserRole;
  test: string;
  success: boolean;
  error?: string;
  details?: any;
}

interface FlowTestResult {
  airport: string;
  passengerId?: string;
  baggageIds?: string[];
  boardingStatusId?: string;
  success: boolean;
  errors: string[];
  results: TestResult[];
}

// Résultats globaux
const allResults: TestResult[] = [];
const flowResults: FlowTestResult[] = [];

// Fonction pour générer un PNR unique
function generatePNR(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pnr = '';
  for (let i = 0; i < 6; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pnr;
}

// Fonction pour générer un tag RFID unique
function generateRFIDTag(base: number = 4071161863): string {
  return (base + Math.floor(Math.random() * 1000)).toString();
}

// Fonction pour créer un boarding pass mock
function createMockBoardingPass(
  pnr: string,
  fullName: string,
  flightNumber: string,
  departure: string,
  arrival: string,
  flightTime: string = '14:30',
  baggageCount: number = 1
): string {
  // Format Air Congo simplifié
  const baggageBase = 4071161863 + Math.floor(Math.random() * 100);
  const baggageCode = baggageBase.toString() + String(baggageCount).padStart(2, '0');
  
  // Format: M1[NOM]PNR[DEP][ARR][TIME][SEAT][BAGGAGE]
  const namePart = fullName.replace(/\s+/g, '').toUpperCase();
  const seat = `${Math.floor(Math.random() * 30) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`;
  
  return `M1${namePart}${pnr}${departure}${arrival}${flightTime.replace(':', '')}${seat}${baggageCode}`;
}

// Fonction pour créer un utilisateur mock
function createMockUser(
  airportCode: string,
  role: UserRole,
  index: number
): { id: string; email: string; fullName: string; airportCode: string; role: UserRole } {
  const roleNames: Record<UserRole, string> = {
    checkin: 'Check-in',
    baggage: 'Bagages',
    boarding: 'Embarquement',
    arrival: 'Arrivée',
    supervisor: 'Superviseur',
  };

  return {
    id: `user_${airportCode}_${role}_${index}`,
    email: `${role}_${airportCode.toLowerCase()}_${index}@test.com`,
    fullName: `Agent ${roleNames[role]} ${airportCode}`,
    airportCode,
    role,
  };
}

// Fonction pour tester le check-in
async function testCheckIn(
  user: ReturnType<typeof createMockUser>,
  departure: string,
  arrival: string
): Promise<{ success: boolean; passengerId?: string; error?: string; pnr?: string }> {
  try {
    const pnr = generatePNR();
    const fullName = `TEST PASSENGER ${pnr}`;
    const flightNumber = `9U${Math.floor(Math.random() * 900) + 100}`;
    const boardingPass = createMockBoardingPass(pnr, fullName, flightNumber, departure, arrival, '14:30', 2);

    // Parser le boarding pass
    const passengerData = parserService.parse(boardingPass);

    // Vérifier que le vol concerne l'aéroport de l'agent
    if (passengerData.departure !== user.airportCode && passengerData.arrival !== user.airportCode) {
      return {
        success: false,
        error: `Le vol ne concerne pas l'aéroport de l'agent (${user.airportCode}). Vol: ${passengerData.departure}-${passengerData.arrival}`,
      };
    }

    // Vérifier si le passager existe déjà
    const existing = await databaseService.getPassengerByPnr(pnr);
    if (existing) {
      return {
        success: false,
        error: `Passager déjà enregistré avec PNR ${pnr}`,
        passengerId: existing.id,
      };
    }

    // Créer le passager
    const passengerId = await databaseService.createPassenger({
      pnr: passengerData.pnr,
      fullName: passengerData.fullName,
      lastName: passengerData.lastName,
      firstName: passengerData.firstName,
      flightNumber: passengerData.flightNumber,
      flightTime: passengerData.flightTime,
      airline: passengerData.airline,
      airlineCode: passengerData.companyCode,
      departure: passengerData.departure,
      arrival: passengerData.arrival,
      route: passengerData.route,
      companyCode: passengerData.companyCode,
      ticketNumber: passengerData.ticketNumber,
      seatNumber: passengerData.seatNumber,
      cabinClass: undefined,
      baggageCount: passengerData.baggageInfo?.count || 0,
      baggageBaseNumber: passengerData.baggageInfo?.baseNumber,
      rawData: passengerData.rawData,
      format: passengerData.format,
      checkedInAt: new Date().toISOString(),
      checkedInBy: user.id,
      synced: false,
    });

    // Vérifier que le passager a été créé
    const created = await databaseService.getPassengerById(passengerId);
    if (!created) {
      return {
        success: false,
        error: 'Passager non trouvé après création',
      };
    }

    return {
      success: true,
      passengerId,
      pnr,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

// Fonction pour tester l'enregistrement des bagages
async function testBaggage(
  user: ReturnType<typeof createMockUser>,
  passengerId: string,
  pnr: string
): Promise<{ success: boolean; baggageIds?: string[]; error?: string }> {
  try {
    // Récupérer le passager
    const passenger = await databaseService.getPassengerById(passengerId);
    if (!passenger) {
      return {
        success: false,
        error: 'Passager non trouvé',
      };
    }

    // Vérifier que le vol concerne l'aéroport de l'agent
    if (passenger.departure !== user.airportCode && passenger.arrival !== user.airportCode) {
      return {
        success: false,
        error: `Le vol ne concerne pas l'aéroport de l'agent (${user.airportCode})`,
      };
    }

    const baggageIds: string[] = [];
    const baggageCount = passenger.baggageCount || 1;

    // Créer les bagages
    for (let i = 0; i < baggageCount; i++) {
      const rfidTag = passenger.baggageBaseNumber
        ? (parseInt(passenger.baggageBaseNumber) + i).toString()
        : generateRFIDTag();

      // Vérifier si le bagage existe déjà
      const existing = await databaseService.getBaggageByRfidTag(rfidTag);
      if (existing) {
        baggageIds.push(existing.id);
        continue;
      }

      const baggageId = await databaseService.createBaggage({
        passengerId: passenger.id,
        rfidTag,
        expectedTag: passenger.baggageBaseNumber ? rfidTag : undefined,
        status: 'checked',
        checkedAt: new Date().toISOString(),
        checkedBy: user.id,
        synced: false,
      });

      baggageIds.push(baggageId);
    }

    // Vérifier que les bagages ont été créés
    const baggages = await databaseService.getBaggagesByPassengerId(passengerId);
    if (baggages.length !== baggageCount) {
      return {
        success: false,
        error: `Nombre de bagages incorrect. Attendu: ${baggageCount}, Trouvé: ${baggages.length}`,
        baggageIds,
      };
    }

    return {
      success: true,
      baggageIds,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

// Fonction pour tester l'embarquement
async function testBoarding(
  user: ReturnType<typeof createMockUser>,
  passengerId: string,
  pnr: string
): Promise<{ success: boolean; boardingStatusId?: string; error?: string }> {
  try {
    // Récupérer le passager
    const passenger = await databaseService.getPassengerById(passengerId);
    if (!passenger) {
      return {
        success: false,
        error: 'Passager non trouvé',
      };
    }

    // Vérifier que le passager part de cet aéroport
    if (passenger.departure !== user.airportCode) {
      return {
        success: false,
        error: `Le passager ne part pas de cet aéroport (${user.airportCode}). Départ: ${passenger.departure}`,
      };
    }

    // Vérifier si déjà embarqué
    const existing = await databaseService.getBoardingStatusByPassengerId(passengerId);
    if (existing?.boarded) {
      return {
        success: false,
        error: 'Passager déjà embarqué',
        boardingStatusId: existing.id,
      };
    }

    // Créer ou mettre à jour le statut d'embarquement
    const boardingStatusId = await databaseService.createOrUpdateBoardingStatus({
      passengerId: passenger.id,
      boarded: true,
      boardedAt: new Date().toISOString(),
      boardedBy: user.id,
      synced: false,
    });

    // Vérifier que le statut a été créé
    const status = await databaseService.getBoardingStatusByPassengerId(passengerId);
    if (!status || !status.boarded) {
      return {
        success: false,
        error: 'Statut d\'embarquement non confirmé',
      };
    }

    return {
      success: true,
      boardingStatusId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

// Fonction pour tester l'arrivée des bagages
async function testArrival(
  user: ReturnType<typeof createMockUser>,
  baggageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Récupérer tous les bagages de l'aéroport pour trouver celui avec l'ID
    const allBaggages = await databaseService.getBaggagesByAirport(user.airportCode);
    const targetBaggage = allBaggages.find(b => b.id === baggageId);
    
    // Si pas trouvé dans l'aéroport, chercher dans tous les bagages (pour les bagages en transit)
    if (!targetBaggage) {
      // Récupérer le bagage via le passager
      // On doit chercher dans tous les passagers qui arrivent à cet aéroport
      const allPassengers = await databaseService.getPassengersByAirport(user.airportCode);
      const arrivalPassengers = allPassengers.filter(p => p.arrival === user.airportCode);
      
      let foundBaggage: Baggage | null = null;
      for (const passenger of arrivalPassengers) {
        const passengerBaggages = await databaseService.getBaggagesByPassengerId(passenger.id);
        const baggage = passengerBaggages.find(b => b.id === baggageId);
        if (baggage) {
          foundBaggage = baggage;
          break;
        }
      }
      
      if (!foundBaggage) {
        return {
          success: false,
          error: `Bagage non trouvé avec ID ${baggageId}`,
        };
      }
      
      // Utiliser le bagage trouvé
      const passenger = await databaseService.getPassengerById(foundBaggage.passengerId);
      if (!passenger) {
        return {
          success: false,
          error: 'Passager non trouvé',
        };
      }

      // Vérifier que le bagage arrive à cet aéroport
      if (passenger.arrival !== user.airportCode) {
        return {
          success: false,
          error: `Le bagage n'arrive pas à cet aéroport (${user.airportCode}). Destination: ${passenger.arrival}`,
        };
      }

      // Vérifier si déjà arrivé
      if (foundBaggage.status === 'arrived') {
        return {
          success: true, // Déjà arrivé, c'est OK
        };
      }

      // Mettre à jour le statut
      await databaseService.updateBaggageStatus(foundBaggage.id, 'arrived', user.id);

      // Vérifier que le statut a été mis à jour
      const updated = await databaseService.getBaggageByRfidTag(foundBaggage.rfidTag);
      if (!updated || updated.status !== 'arrived') {
        return {
          success: false,
          error: 'Statut du bagage non mis à jour',
        };
      }

      return {
        success: true,
      };
    }

    // Récupérer le passager
    const passenger = await databaseService.getPassengerById(targetBaggage.passengerId);
    if (!passenger) {
      return {
        success: false,
        error: 'Passager non trouvé',
      };
    }

    // Vérifier que le bagage arrive à cet aéroport
    if (passenger.arrival !== user.airportCode) {
      return {
        success: false,
        error: `Le bagage n'arrive pas à cet aéroport (${user.airportCode}). Destination: ${passenger.arrival}`,
      };
    }

    // Vérifier si déjà arrivé
    if (targetBaggage.status === 'arrived') {
      return {
        success: true, // Déjà arrivé, c'est OK
      };
    }

    // Mettre à jour le statut
    await databaseService.updateBaggageStatus(targetBaggage.id, 'arrived', user.id);

    // Vérifier que le statut a été mis à jour
    const updated = await databaseService.getBaggageByRfidTag(targetBaggage.rfidTag);
    if (!updated || updated.status !== 'arrived') {
      return {
        success: false,
        error: 'Statut du bagage non mis à jour',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

// Fonction pour tester la consultation superviseur
async function testSupervisor(
  user: ReturnType<typeof createMockUser>
): Promise<{ success: boolean; error?: string; stats?: any }> {
  try {
    // Récupérer tous les passagers de l'aéroport
    const passengers = await databaseService.getPassengersByAirport(user.airportCode);
    
    // Récupérer tous les bagages de l'aéroport
    const baggages = await databaseService.getBaggagesByAirport(user.airportCode);
    
    // Récupérer tous les statuts d'embarquement de l'aéroport
    const boardingStatuses = await databaseService.getBoardingStatusesByAirport(user.airportCode);

    // Vérifier que les données sont filtrées par aéroport
    const invalidPassengers = passengers.filter(
      p => p.departure !== user.airportCode && p.arrival !== user.airportCode
    );
    if (invalidPassengers.length > 0) {
      return {
        success: false,
        error: `Passagers non filtrés correctement. ${invalidPassengers.length} passagers invalides trouvés`,
      };
    }

    const stats = {
      totalPassengers: passengers.length,
      totalBaggages: baggages.length,
      totalBoardingStatuses: boardingStatuses.length,
      boardedPassengers: boardingStatuses.filter(bs => bs.boarded).length,
      arrivedBaggages: baggages.filter(b => b.status === 'arrived').length,
    };

    return {
      success: true,
      stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

// Fonction principale pour tester le flux complet d'un aéroport
async function testAirportFlow(airportCode: string): Promise<FlowTestResult> {
  const result: FlowTestResult = {
    airport: airportCode,
    success: true,
    errors: [],
    results: [],
  };

  console.log(`\n🛫 Test du flux pour l'aéroport ${airportCode}...`);

  // Créer les utilisateurs pour chaque rôle
  const users: Record<UserRole, ReturnType<typeof createMockUser>> = {
    checkin: createMockUser(airportCode, 'checkin', 1),
    baggage: createMockUser(airportCode, 'baggage', 1),
    boarding: createMockUser(airportCode, 'boarding', 1),
    arrival: createMockUser(airportCode, 'arrival', 1),
    supervisor: createMockUser(airportCode, 'supervisor', 1),
  };

  // Trouver un aéroport de destination différent
  const destinationAirport = AIRPORTS.find(a => a.code !== airportCode);
  if (!destinationAirport) {
    result.success = false;
    result.errors.push('Aucun aéroport de destination trouvé');
    return result;
  }

  // 1. TEST CHECK-IN
  console.log(`  ✓ Test Check-in...`);
  const checkInResult = await testCheckIn(users.checkin, airportCode, destinationAirport.code);
  result.results.push({
    airport: airportCode,
    role: 'checkin',
    test: 'Check-in passager',
    success: checkInResult.success,
    error: checkInResult.error,
  });

  if (!checkInResult.success || !checkInResult.passengerId) {
    result.success = false;
    result.errors.push(`Check-in échoué: ${checkInResult.error}`);
    return result;
  }

  result.passengerId = checkInResult.passengerId;
  const pnr = checkInResult.pnr || '';

  // 2. TEST BAGGAGE
  console.log(`  ✓ Test Baggage...`);
  const baggageResult = await testBaggage(users.baggage, result.passengerId, pnr);
  result.results.push({
    airport: airportCode,
    role: 'baggage',
    test: 'Enregistrement bagages',
    success: baggageResult.success,
    error: baggageResult.error,
  });

  if (!baggageResult.success || !baggageResult.baggageIds || baggageResult.baggageIds.length === 0) {
    result.success = false;
    result.errors.push(`Baggage échoué: ${baggageResult.error}`);
    return result;
  }

  result.baggageIds = baggageResult.baggageIds;

  // 3. TEST BOARDING
  console.log(`  ✓ Test Boarding...`);
  const boardingResult = await testBoarding(users.boarding, result.passengerId, pnr);
  result.results.push({
    airport: airportCode,
    role: 'boarding',
    test: 'Embarquement passager',
    success: boardingResult.success,
    error: boardingResult.error,
  });

  if (!boardingResult.success) {
    result.success = false;
    result.errors.push(`Boarding échoué: ${boardingResult.error}`);
    return result;
  }

  result.boardingStatusId = boardingResult.boardingStatusId;

  // 4. TEST ARRIVAL (pour l'aéroport de destination)
  // Créer un utilisateur arrival pour l'aéroport de destination
  const arrivalUser = createMockUser(destinationAirport.code, 'arrival', 1);
  console.log(`  ✓ Test Arrival (${destinationAirport.code})...`);
  
  // Tester l'arrivée pour chaque bagage
  for (const baggageId of result.baggageIds) {
    const arrivalResult = await testArrival(arrivalUser, baggageId);
    result.results.push({
      airport: destinationAirport.code,
      role: 'arrival',
      test: `Arrivée bagage ${baggageId}`,
      success: arrivalResult.success,
      error: arrivalResult.error,
    });

    if (!arrivalResult.success) {
      result.errors.push(`Arrival échoué pour bagage ${baggageId}: ${arrivalResult.error}`);
    }
  }

  // 5. TEST SUPERVISOR (pour les deux aéroports)
  console.log(`  ✓ Test Supervisor (${airportCode})...`);
  const supervisorResult1 = await testSupervisor(users.supervisor);
  result.results.push({
    airport: airportCode,
    role: 'supervisor',
    test: 'Consultation superviseur',
    success: supervisorResult1.success,
    error: supervisorResult1.error,
    details: supervisorResult1.stats,
  });

  if (!supervisorResult1.success) {
    result.errors.push(`Supervisor échoué: ${supervisorResult1.error}`);
  }

  console.log(`  ✓ Test Supervisor (${destinationAirport.code})...`);
  const supervisorUser2 = createMockUser(destinationAirport.code, 'supervisor', 1);
  const supervisorResult2 = await testSupervisor(supervisorUser2);
  result.results.push({
    airport: destinationAirport.code,
    role: 'supervisor',
    test: 'Consultation superviseur',
    success: supervisorResult2.success,
    error: supervisorResult2.error,
    details: supervisorResult2.stats,
  });

  if (!supervisorResult2.success) {
    result.errors.push(`Supervisor échoué pour ${destinationAirport.code}: ${supervisorResult2.error}`);
  }

  if (result.errors.length > 0) {
    result.success = false;
  }

  return result;
}

// Fonction principale
async function main() {
  console.log('🚀 Démarrage du test de flux complet...\n');

  // Initialiser la base de données
  try {
    await databaseService.initialize();
    console.log('✓ Base de données initialisée\n');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  }

  // Tester chaque aéroport
  for (const airport of AIRPORTS) {
    try {
      const flowResult = await testAirportFlow(airport.code);
      flowResults.push(flowResult);
      allResults.push(...flowResult.results);

      if (flowResult.success) {
        console.log(`✅ Flux complet réussi pour ${airport.code}\n`);
      } else {
        console.log(`❌ Flux complet échoué pour ${airport.code}:`);
        flowResult.errors.forEach(err => console.log(`   - ${err}`));
        console.log();
      }
    } catch (error) {
      console.error(`❌ Erreur lors du test pour ${airport.code}:`, error);
      flowResults.push({
        airport: airport.code,
        success: false,
        errors: [error instanceof Error ? error.message : 'Erreur inconnue'],
        results: [],
      });
    }
  }

  // Afficher les résultats
  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSULTATS FINAUX');
  console.log('='.repeat(80) + '\n');

  const totalTests = allResults.length;
  const successfulTests = allResults.filter(r => r.success).length;
  const failedTests = totalTests - successfulTests;

  console.log(`Total de tests: ${totalTests}`);
  console.log(`✅ Tests réussis: ${successfulTests}`);
  console.log(`❌ Tests échoués: ${failedTests}`);
  console.log(`📈 Taux de réussite: ${((successfulTests / totalTests) * 100).toFixed(2)}%\n`);

  const successfulFlows = flowResults.filter(r => r.success).length;
  const failedFlows = flowResults.filter(r => !r.success).length;

  console.log(`Flux complets réussis: ${successfulFlows}/${flowResults.length}`);
  console.log(`Flux complets échoués: ${failedFlows}/${flowResults.length}\n`);

  // Afficher les détails des échecs
  if (failedTests > 0) {
    console.log('❌ DÉTAILS DES ÉCHECS:\n');
    allResults
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - ${r.airport} / ${r.role} / ${r.test}`);
        console.log(`    Erreur: ${r.error}\n`);
      });
  }

  // Afficher les statistiques par aéroport
  console.log('\n📊 STATISTIQUES PAR AÉROPORT:\n');
  for (const airport of AIRPORTS) {
    const airportResults = allResults.filter(r => r.airport === airport.code);
    const airportSuccess = airportResults.filter(r => r.success).length;
    const airportFailed = airportResults.filter(r => !r.success).length;
    const flowResult = flowResults.find(r => r.airport === airport.code);

    console.log(`  ${airport.code} (${airport.name}):`);
    console.log(`    Tests: ${airportSuccess}/${airportResults.length} réussis`);
    console.log(`    Flux complet: ${flowResult?.success ? '✅' : '❌'}`);
    if (flowResult && !flowResult.success && flowResult.errors.length > 0) {
      flowResult.errors.forEach(err => console.log(`      - ${err}`));
    }
    console.log();
  }

  // Fermer la base de données
  await databaseService.close();

  // Code de sortie
  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('✅ Tous les tests sont passés avec succès!\n');
    process.exit(0);
  }
}

// Exécuter le script
main().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

