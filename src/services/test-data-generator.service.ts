/**
 * Service de génération de données de test pour le système BIRS
 * Génère des bagages RUSH et des fichiers BIRS de test
 */

import { birsDatabaseService } from './birs-database.service';
import { databaseService } from './database.service';
import { rushService } from './rush.service';

interface TestDataGenerationOptions {
  nationalRushCount: number;
  internationalRushCount: number;
  airportCode: string;
  userId: string;
}

interface BirsTestFileData {
  flightNumber: string;
  flightDate: string;
  origin: string;
  destination: string;
  airline: string;
  items: Array<{
    bagId: string;
    passengerName: string;
    pnr: string;
    seatNumber: string;
    class: string;
    weight: number;
  }>;
}

class TestDataGeneratorService {
  private readonly FIRST_NAMES = [
    'JEAN', 'PIERRE', 'MARIE', 'SOPHIE', 'LUC', 'PAUL', 'ALICE', 'CLAIRE',
    'THOMAS', 'NICOLAS', 'JULIE', 'ISABELLE', 'DAVID', 'MICHEL', 'CHRISTINE',
    'LAURENT', 'PATRICK', 'NATHALIE', 'FRANCOIS', 'CATHERINE', 'EMMANUEL',
    'BERNARD', 'MARTINE', 'JACQUES', 'MONIQUE', 'PHILIPPE', 'BRIGITTE',
    'ANDRE', 'SYLVIE', 'DANIEL', 'PASCALE', 'SERGE', 'DOMINIQUE', 'ALAIN',
    'VERONIQUE', 'CHRISTIAN', 'FRANCOISE', 'ROBERT', 'AGNES', 'HENRI'
  ];

  private readonly LAST_NAMES = [
    'MARTIN', 'BERNARD', 'DUBOIS', 'THOMAS', 'ROBERT', 'RICHARD', 'PETIT',
    'DURAND', 'LEROY', 'MOREAU', 'SIMON', 'LAURENT', 'LEFEBVRE', 'MICHEL',
    'GARCIA', 'DAVID', 'BERTRAND', 'ROUX', 'VINCENT', 'FOURNIER', 'MOREL',
    'GIRARD', 'ANDRE', 'LEFEVRE', 'MERCIER', 'DUPONT', 'LAMBERT', 'BONNET',
    'FRANCOIS', 'MARTINEZ', 'LEGRAND', 'GARNIER', 'FAURE', 'ROUSSEAU',
    'BLANC', 'GUERIN', 'MULLER', 'HENRY', 'ROUSSEL', 'NICOLAS', 'PERRIN'
  ];

  private readonly AIRLINES = [
    { code: 'ET', name: 'Ethiopian Airlines', flights: ['ET701', 'ET702', 'ET4071', 'ET4072'] },
    { code: 'TK', name: 'Turkish Airlines', flights: ['TK1953', 'TK1954'] },
    { code: 'SN', name: 'Brussels Airlines', flights: ['SN469', 'SN470'] },
    { code: '9U', name: 'Air Congo', flights: ['9U721', '9U722', '9U731', '9U732'] },
    { code: 'KQ', name: 'Kenya Airways', flights: ['KQ555', 'KQ556'] }
  ];

  /**
   * Génère un nom de passager aléatoire
   */
  private generateRandomName(): string {
    const lastName = this.LAST_NAMES[Math.floor(Math.random() * this.LAST_NAMES.length)];
    const firstName = this.FIRST_NAMES[Math.floor(Math.random() * this.FIRST_NAMES.length)];
    return `${lastName}/${firstName}`;
  }

  /**
   * Génère un PNR aléatoire
   */
  private generatePNR(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pnr = '';
    for (let i = 0; i < 6; i++) {
      pnr += chars[Math.floor(Math.random() * chars.length)];
    }
    return pnr;
  }

  /**
   * Génère un numéro de siège aléatoire
   */
  private generateSeatNumber(): string {
    const row = Math.floor(Math.random() * 40) + 1;
    const seat = ['A', 'B', 'C', 'D', 'E', 'F'][Math.floor(Math.random() * 6)];
    return `${row}${seat}`;
  }

  /**
   * Génère un tag RFID/Baggage Tag aléatoire
   */
  private generateBagTag(airlineCode: string): string {
    // Format: CODE + 10 chiffres (ex: ET1234567890)
    const number = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    return `${airlineCode}${number}`;
  }

  /**
   * Génère 10 000 bagages RUSH (national + international)
   */
  async generateRushBaggages(options: TestDataGenerationOptions): Promise<{
    nationalCreated: number;
    internationalCreated: number;
    duration: number;
  }> {
    const startTime = Date.now();
    
    console.log('[TEST DATA] Génération de données de test...');
    console.log(`[TEST DATA] National RUSH: ${options.nationalRushCount}`);
    console.log(`[TEST DATA] International RUSH: ${options.internationalRushCount}`);

    let nationalCreated = 0;
    let internationalCreated = 0;

    // Générer bagages nationaux RUSH
    for (let i = 0; i < options.nationalRushCount; i++) {
      try {
        const airline = this.AIRLINES[Math.floor(Math.random() * this.AIRLINES.length)];
        const passengerName = this.generateRandomName();
        const pnr = this.generatePNR();
        const tagNumber = this.generateBagTag(airline.code);

        // Créer un passager fictif
        const passengerId = await this.createTestPassenger(
          passengerName,
          pnr,
          airline.flights[0],
          options.airportCode
        );

        // Créer le bagage
        const baggageId = await this.createTestBaggage(
          passengerId,
          tagNumber,
          options.userId
        );

        // Marquer comme RUSH
        await rushService.declareNationalBaggageAsRush(
          baggageId,
          options.userId,
          'Test - Soute pleine (données de test)',
          airline.flights[0]
        );

        nationalCreated++;

        if (nationalCreated % 1000 === 0) {
          console.log(`[TEST DATA] National RUSH: ${nationalCreated}/${options.nationalRushCount}`);
        }
      } catch (error) {
        console.error(`[TEST DATA] Erreur création bagage national ${i}:`, error);
      }
    }

    // Générer bagages internationaux RUSH
    for (let i = 0; i < options.internationalRushCount; i++) {
      try {
        const airline = this.AIRLINES.filter(a => ['ET', 'TK', 'SN', 'KQ'].includes(a.code))[
          Math.floor(Math.random() * 4)
        ];
        const passengerName = this.generateRandomName();
        const pnr = this.generatePNR();
        const tagNumber = this.generateBagTag(airline.code);
        const flightNumber = airline.flights[Math.floor(Math.random() * airline.flights.length)];

        // Créer le bagage international
        const baggageId = await this.createTestInternationalBaggage(
          tagNumber,
          passengerName,
          pnr,
          flightNumber,
          options.airportCode,
          options.userId
        );

        // Marquer comme RUSH
        await rushService.declareInternationalBaggageAsRush(
          baggageId,
          options.userId,
          'Test - Vol surbooké (données de test)',
          flightNumber
        );

        internationalCreated++;

        if (internationalCreated % 1000 === 0) {
          console.log(`[TEST DATA] International RUSH: ${internationalCreated}/${options.internationalRushCount}`);
        }
      } catch (error) {
        console.error(`[TEST DATA] Erreur création bagage international ${i}:`, error);
      }
    }

    const duration = Date.now() - startTime;

    console.log('[TEST DATA] Génération terminée !');
    console.log(`[TEST DATA] National RUSH créés: ${nationalCreated}`);
    console.log(`[TEST DATA] International RUSH créés: ${internationalCreated}`);
    console.log(`[TEST DATA] Durée: ${(duration / 1000).toFixed(2)}s`);

    return {
      nationalCreated,
      internationalCreated,
      duration
    };
  }

  /**
   * Génère un fichier BIRS de test (CSV)
   */
  generateBirsTestFileCSV(options: {
    flightNumber: string;
    itemCount: number;
    matchPercentage: number; // % qui matchent avec des bagages existants
  }): string {
    console.log('[TEST DATA] Génération fichier BIRS CSV...');

    const airline = this.AIRLINES.find(a => 
      a.flights.some(f => f === options.flightNumber)
    ) || this.AIRLINES[0];

    const today = new Date();
    const flightDate = today.toISOString().split('T')[0];

    let csv = 'Bag ID,Passenger Name,PNR,Seat Number,Class,PSN,Weight,Route\n';

    for (let i = 0; i < options.itemCount; i++) {
      const bagId = this.generateBagTag(airline.code);
      const passengerName = this.generateRandomName();
      const pnr = this.generatePNR();
      const seatNumber = this.generateSeatNumber();
      const classType = ['Y', 'J', 'F'][Math.floor(Math.random() * 3)];
      const psn = (i + 1).toString().padStart(3, '0');
      const weight = Math.floor(Math.random() * 20) + 10;
      const route = 'ADD*FIH';

      csv += `${bagId},${passengerName},${pnr},${seatNumber},${classType},${psn},${weight},${route}\n`;
    }

    console.log(`[TEST DATA] Fichier CSV généré: ${options.itemCount} items`);
    return csv;
  }

  /**
   * Génère un fichier BIRS de test (format texte)
   */
  generateBirsTestFileTXT(options: {
    flightNumber: string;
    itemCount: number;
  }): string {
    console.log('[TEST DATA] Génération fichier BIRS TXT...');

    const airline = this.AIRLINES.find(a => 
      a.flights.some(f => f === options.flightNumber)
    ) || this.AIRLINES[0];

    const today = new Date();
    const flightDate = today.toISOString().split('T')[0];

    let txt = `BIRS REPORT - ${airline.name}\n`;
    txt += `Flight: ${options.flightNumber}\n`;
    txt += `Date: ${flightDate}\n`;
    txt += `Route: ADDIS ABABA (ADD) to KINSHASA (FIH)\n`;
    txt += `\n`;
    txt += `========================================\n`;
    txt += `BAGGAGE LIST\n`;
    txt += `========================================\n`;
    txt += `\n`;

    for (let i = 0; i < options.itemCount; i++) {
      const bagId = this.generateBagTag(airline.code);
      const passengerName = this.generateRandomName().padEnd(30);
      const pnr = this.generatePNR().padEnd(8);
      const seatNumber = this.generateSeatNumber().padEnd(5);
      const classType = ['Y', 'J', 'F'][Math.floor(Math.random() * 3)];
      const weight = Math.floor(Math.random() * 20) + 10;

      txt += `${bagId} ${passengerName} ${pnr} ${seatNumber} ${classType} ${weight}KG\n`;
    }

    txt += `\n`;
    txt += `========================================\n`;
    txt += `Total Baggages: ${options.itemCount}\n`;
    txt += `========================================\n`;

    console.log(`[TEST DATA] Fichier TXT généré: ${options.itemCount} items`);
    return txt;
  }

  /**
   * Génère des données BIRS au format JSON (pour Excel)
   */
  generateBirsTestFileJSON(options: {
    flightNumber: string;
    itemCount: number;
  }): BirsTestFileData {
    console.log('[TEST DATA] Génération fichier BIRS JSON...');

    const airline = this.AIRLINES.find(a => 
      a.flights.some(f => f === options.flightNumber)
    ) || this.AIRLINES[0];

    const today = new Date();
    const flightDate = today.toISOString().split('T')[0];

    const items = [];
    for (let i = 0; i < options.itemCount; i++) {
      items.push({
        bagId: this.generateBagTag(airline.code),
        passengerName: this.generateRandomName(),
        pnr: this.generatePNR(),
        seatNumber: this.generateSeatNumber(),
        class: ['Y', 'J', 'F'][Math.floor(Math.random() * 3)],
        weight: Math.floor(Math.random() * 20) + 10
      });
    }

    console.log(`[TEST DATA] Fichier JSON généré: ${options.itemCount} items`);

    return {
      flightNumber: options.flightNumber,
      flightDate,
      origin: 'ADD',
      destination: 'FIH',
      airline: airline.name,
      items
    };
  }

  /**
   * Crée un passager de test
   */
  private async createTestPassenger(
    fullName: string,
    pnr: string,
    flightNumber: string,
    airportCode: string
  ): Promise<string> {
    const db = databaseService.getDatabase();
    if (!db) throw new Error('Database not initialized');

    const id = `test_passenger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO passengers (
        id, pnr, full_name, first_name, last_name, flight_number,
        departure, arrival, seat_number, boarding_pass_data,
        synced, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, pnr, fullName,
        fullName.split('/')[1] || 'TEST',
        fullName.split('/')[0] || 'TEST',
        flightNumber,
        airportCode === 'FIH' ? 'FIH' : 'GMA',
        airportCode === 'FIH' ? 'GMA' : 'FIH',
        this.generateSeatNumber(),
        'TEST_DATA',
        0, now, now
      ]
    );

    return id;
  }

  /**
   * Crée un bagage de test
   */
  private async createTestBaggage(
    passengerId: string,
    tagNumber: string,
    userId: string
  ): Promise<string> {
    const db = databaseService.getDatabase();
    if (!db) throw new Error('Database not initialized');

    const id = `test_baggage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO baggages (
        id, passenger_id, tag_number, status, checked_at, checked_by,
        synced, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, passengerId, tagNumber, 'checked', now, userId, 0, now, now]
    );

    return id;
  }

  /**
   * Crée un bagage international de test
   */
  private async createTestInternationalBaggage(
    tagNumber: string,
    passengerName: string,
    pnr: string,
    flightNumber: string,
    airportCode: string,
    userId: string
  ): Promise<string> {
    const now = new Date().toISOString();

    const id = await birsDatabaseService.createInternationalBaggage({
      tagNumber,
      scannedAt: now,
      scannedBy: userId,
      airportCode,
      status: 'scanned',
      passengerName,
      pnr,
      flightNumber,
      origin: 'ADD',
      synced: false
    });

    return id;
  }

  /**
   * Nettoie toutes les données de test
   */
  async cleanupTestData(): Promise<void> {
    console.log('[TEST DATA] Nettoyage des données de test...');

    const db = databaseService.getDatabase();
    if (!db) throw new Error('Database not initialized');

    // Supprimer les bagages de test
    await db.runAsync(`DELETE FROM baggages WHERE id LIKE 'test_baggage_%'`);
    
    // Supprimer les passagers de test
    await db.runAsync(`DELETE FROM passengers WHERE id LIKE 'test_passenger_%'`);

    // Supprimer les bagages internationaux de test
    await db.runAsync(`DELETE FROM international_baggages WHERE id LIKE 'intl_bag_%'`);

    console.log('[TEST DATA] Données de test nettoyées');
  }
}

export const testDataGeneratorService = new TestDataGeneratorService();
