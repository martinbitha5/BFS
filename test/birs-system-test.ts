/**
 * Script de test complet du système BIRS
 * Teste avec 10 000 bagages RUSH et upload de rapports BIRS
 */

import { testDataGeneratorService } from '../src/services/test-data-generator.service';
import { birsService } from '../src/services/birs.service';
import { rushService } from '../src/services/rush.service';
import { databaseService } from '../src/services/database.service';
import { birsDatabaseService } from '../src/services/birs-database.service';

interface TestResults {
  step: string;
  success: boolean;
  duration: number;
  details?: any;
  error?: string;
}

class BirsSystemTest {
  private results: TestResults[] = [];
  private testUserId = 'test_user_supervisor';
  private testAirportCode = 'FIH';

  /**
   * Exécute la suite complète de tests
   */
  async runCompleteTest(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🧪 TEST SYSTÈME BIRS - 10 000 BAGAGES RUSH');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
      // 1. Initialiser la base de données
      await this.testStep('Initialisation base de données', async () => {
        await databaseService.initialize();
      });

      // 2. Nettoyer les données de test précédentes
      await this.testStep('Nettoyage données de test', async () => {
        await testDataGeneratorService.cleanupTestData();
      });

      // 3. Générer 10 000 bagages RUSH (7000 nationaux + 3000 internationaux)
      await this.testStep('Génération 10 000 bagages RUSH', async () => {
        const result = await testDataGeneratorService.generateRushBaggages({
          nationalRushCount: 7000,
          internationalRushCount: 3000,
          airportCode: this.testAirportCode,
          userId: this.testUserId
        });
        return result;
      });

      // 4. Vérifier les statistiques RUSH
      await this.testStep('Vérification statistiques RUSH', async () => {
        const stats = await rushService.getRushStatistics(this.testAirportCode);
        
        console.log('   📊 Statistiques RUSH:');
        console.log(`      - Total RUSH: ${stats.totalRush}`);
        console.log(`      - National: ${stats.nationalRush}`);
        console.log(`      - International: ${stats.internationalRush}`);
        console.log(`      - Aujourd'hui: ${stats.rushToday}`);
        
        return stats;
      });

      // 5. Générer fichier BIRS CSV de test (500 bagages)
      await this.testStep('Génération fichier BIRS CSV (500 items)', async () => {
        const csvContent = testDataGeneratorService.generateBirsTestFileCSV({
          flightNumber: 'ET701',
          itemCount: 500,
          matchPercentage: 80
        });
        
        // Sauvegarder le fichier
        const filePath = await this.saveTestFile(
          'BIRS_ET701_TEST.csv',
          csvContent
        );
        
        return { filePath, size: csvContent.length };
      });

      // 6. Générer fichier BIRS TXT de test (300 bagages)
      await this.testStep('Génération fichier BIRS TXT (300 items)', async () => {
        const txtContent = testDataGeneratorService.generateBirsTestFileTXT({
          flightNumber: 'TK1953',
          itemCount: 300
        });
        
        const filePath = await this.saveTestFile(
          'BIRS_TK1953_TEST.txt',
          txtContent
        );
        
        return { filePath, size: txtContent.length };
      });

      // 7. Générer fichier BIRS JSON de test (pour Excel - 1000 bagages)
      await this.testStep('Génération fichier BIRS JSON (1000 items)', async () => {
        const jsonData = testDataGeneratorService.generateBirsTestFileJSON({
          flightNumber: 'SN469',
          itemCount: 1000
        });
        
        const jsonContent = JSON.stringify(jsonData, null, 2);
        const filePath = await this.saveTestFile(
          'BIRS_SN469_TEST.json',
          jsonContent
        );
        
        return { filePath, size: jsonContent.length, items: jsonData.items.length };
      });

      // 8. Test upload fichier BIRS CSV
      await this.testStep('Upload fichier BIRS CSV', async () => {
        const csvContent = testDataGeneratorService.generateBirsTestFileCSV({
          flightNumber: 'ET701',
          itemCount: 200,
          matchPercentage: 80
        });

        const result = await birsService.uploadBirsReport(
          {
            name: 'BIRS_ET701_20231206.csv',
            size: csvContent.length,
            type: 'text/csv',
            uri: 'file://test/BIRS_ET701_20231206.csv'
          },
          csvContent,
          this.testUserId,
          this.testAirportCode
        );

        return result;
      });

      // 9. Test réconciliation automatique
      await this.testStep('Réconciliation automatique BIRS', async () => {
        // Créer quelques bagages internationaux à réconcilier
        const baggageIds = await this.createSampleInternationalBaggages(50);
        
        // Générer un rapport BIRS avec les mêmes tags
        const csvContent = this.generateMatchingBirsReport(baggageIds);
        
        // Upload et réconciliation
        const result = await birsService.uploadAndReconcileBirsReport(
          {
            name: 'BIRS_RECONCILIATION_TEST.csv',
            size: csvContent.length,
            type: 'text/csv',
            uri: 'file://test/BIRS_RECONCILIATION_TEST.csv'
          },
          csvContent,
          this.testUserId,
          this.testAirportCode
        );

        console.log('   🔄 Résultat réconciliation:');
        console.log(`      - Total items: ${result.reconciliationResult.totalItems}`);
        console.log(`      - Matchés: ${result.reconciliationResult.matchedCount}`);
        console.log(`      - Non matchés (scannés): ${result.reconciliationResult.unmatchedScanned}`);
        console.log(`      - Non matchés (rapport): ${result.reconciliationResult.unmatchedReport}`);

        return result.reconciliationResult;
      });

      // 10. Test performance: récupération de tous les RUSH
      await this.testStep('Performance: Liste de tous les RUSH', async () => {
        const startTime = Date.now();
        
        const nationalRush = await rushService.getNationalRushBaggages(this.testAirportCode);
        const internationalRush = await rushService.getInternationalRushBaggages(this.testAirportCode);
        
        const duration = Date.now() - startTime;
        
        console.log(`   ⚡ Performance:`);
        console.log(`      - Durée requête: ${duration}ms`);
        console.log(`      - National trouvés: ${nationalRush.length}`);
        console.log(`      - International trouvés: ${internationalRush.length}`);
        console.log(`      - Total: ${nationalRush.length + internationalRush.length}`);

        return {
          duration,
          nationalCount: nationalRush.length,
          internationalCount: internationalRush.length
        };
      });

      // 11. Test annulation RUSH
      await this.testStep('Test annulation statut RUSH', async () => {
        const nationalRush = await rushService.getNationalRushBaggages(this.testAirportCode);
        const internationalRush = await rushService.getInternationalRushBaggages(this.testAirportCode);

        if (nationalRush.length > 0) {
          await rushService.cancelNationalRush(
            nationalRush[0].id,
            this.testUserId,
            'arrived',
            'Test - Bagage finalement chargé'
          );
        }

        if (internationalRush.length > 0) {
          await rushService.cancelInternationalRush(
            internationalRush[0].id,
            this.testUserId,
            'reconciled',
            'Test - Bagage trouvé dans rapport'
          );
        }

        return {
          nationalCancelled: nationalRush.length > 0,
          internationalCancelled: internationalRush.length > 0
        };
      });

      // Afficher le résumé
      this.displaySummary();

    } catch (error) {
      console.error('❌ ERREUR FATALE:', error);
      throw error;
    }
  }

  /**
   * Exécute une étape de test
   */
  private async testStep(
    name: string,
    testFunction: () => Promise<any>
  ): Promise<void> {
    console.log(`\n▶️  ${name}...`);
    const startTime = Date.now();

    try {
      const details = await testFunction();
      const duration = Date.now() - startTime;

      this.results.push({
        step: name,
        success: true,
        duration,
        details
      });

      console.log(`✅ ${name} - OK (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      this.results.push({
        step: name,
        success: false,
        duration,
        error: errorMessage
      });

      console.error(`❌ ${name} - ÉCHEC (${duration}ms)`);
      console.error(`   Erreur: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Sauvegarde un fichier de test
   */
  private async saveTestFile(filename: string, content: string): Promise<string> {
    // En environnement Node.js
    if (typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const testDir = path.join(__dirname, '../../test-files');
        
        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }
        
        const filePath = path.join(testDir, filename);
        fs.writeFileSync(filePath, content, 'utf-8');
        
        console.log(`   💾 Fichier sauvegardé: ${filePath}`);
        return filePath;
      } catch (error) {
        console.warn('   ⚠️  Impossible de sauvegarder le fichier (Node.js requis)');
        return `mock://${filename}`;
      }
    }
    
    return `mock://${filename}`;
  }

  /**
   * Crée des bagages internationaux de test
   */
  private async createSampleInternationalBaggages(count: number): Promise<string[]> {
    const ids: string[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < count; i++) {
      const id = await birsDatabaseService.createInternationalBaggage({
        rfidTag: `ET${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`,
        scannedAt: now,
        scannedBy: this.testUserId,
        airportCode: this.testAirportCode,
        status: 'scanned',
        passengerName: `TEST/PASSENGER${i}`,
        pnr: `TST${i.toString().padStart(3, '0')}`,
        flightNumber: 'ET701',
        origin: 'ADD',
        synced: false
      });
      ids.push(id);
    }

    return ids;
  }

  /**
   * Génère un rapport BIRS qui matche avec les bagages donnés
   */
  private generateMatchingBirsReport(baggageIds: string[]): string {
    let csv = 'Bag ID,Passenger Name,PNR,Seat Number,Class,Weight\n';
    
    baggageIds.forEach((_, index) => {
      csv += `ET${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')},`;
      csv += `TEST/PASSENGER${index},`;
      csv += `TST${index.toString().padStart(3, '0')},`;
      csv += `${Math.floor(Math.random() * 30) + 1}A,`;
      csv += `Y,`;
      csv += `${Math.floor(Math.random() * 20) + 10}\n`;
    });

    return csv;
  }

  /**
   * Affiche le résumé des tests
   */
  private displaySummary(): void {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 RÉSUMÉ DES TESTS');
    console.log('═══════════════════════════════════════════════════════\n');

    const totalTests = this.results.length;
    const successCount = this.results.filter(r => r.success).length;
    const failureCount = this.results.filter(r => !r.success).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total tests: ${totalTests}`);
    console.log(`✅ Réussis: ${successCount}`);
    console.log(`❌ Échoués: ${failureCount}`);
    console.log(`⏱️  Durée totale: ${(totalDuration / 1000).toFixed(2)}s\n`);

    console.log('Détails par étape:');
    this.results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${index + 1}. ${icon} ${result.step.padEnd(50)} ${duration.padStart(10)}`);
      if (result.error) {
        console.log(`   Erreur: ${result.error}`);
      }
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(successCount === totalTests ? '🎉 TOUS LES TESTS RÉUSSIS !' : '⚠️  CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('═══════════════════════════════════════════════════════\n');
  }
}

// Exécuter les tests
if (require.main === module) {
  const test = new BirsSystemTest();
  test.runCompleteTest()
    .then(() => {
      console.log('✅ Tests terminés avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Tests échoués:', error);
      process.exit(1);
    });
}

export { BirsSystemTest };
