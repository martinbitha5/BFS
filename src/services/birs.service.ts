/**
 * Service principal pour le système BIRS
 * Gère le flux complet de détection, upload et réconciliation
 */

import {
  BirsReport,
  BirsReportItem,
  InternationalBaggage,
  ReconciliationOptions,
  ReconciliationResult
} from '../types/birs.types';
import { birsDatabaseService } from './birs-database.service';
import { birsReconciliationService } from './birs-reconciliation.service';
import { birsFileParserService } from './birs-file-parser.service';

class BirsService {
  /**
   * S'assure que birsDatabaseService est initialisé
   * Tente de l'initialiser si nécessaire
   */
  private async ensureBirsDatabaseInitialized(): Promise<void> {
    // Vérifier d'abord si déjà initialisé
    if (birsDatabaseService.isInitialized()) {
      return;
    }

    console.log('[BIRS] 🔧 birsDatabaseService n\'est pas initialisé, tentative d\'initialisation...');
    
    // Importer le service de base de données et obtenir la référence
    const { databaseServiceInstance } = await import('./index');
    
    // Attendre un peu pour que la base soit prête
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      const db = databaseServiceInstance.getDatabase();
      
      if (db) {
        console.log('[BIRS] ✅ Base de données principale trouvée, initialisation de BIRS...');
        birsDatabaseService.initialize(db);
        return;
      }
      
      attempts++;
      console.warn(`[BIRS] ⏳ Base de données principale non prête, tentative ${attempts}/${maxAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    throw new Error('Impossible d\'initialiser la base de données BIRS après plusieurs tentatives. La base de données principale n\'est pas prête.');
  }

  /**
   * Vérifie si un aéroport est domestique (RDC)
   */
  async isDomesticAirport(airportCode: string): Promise<boolean> {
    try {
      const { AIRPORTS } = await import('../constants/airports');
      const airport = AIRPORTS.find((a: any) => a.code === airportCode);
      return airport?.countryCode === 'CD' || false;
    } catch (error) {
      console.error('[BIRS] Erreur chargement AIRPORTS:', error);
      return false;
    }
  }

  /**
   * Vérifie si un aéroport est international
   */
  async isInternationalAirport(airportCode: string): Promise<boolean> {
    try {
      const { AIRPORTS } = await import('../constants/airports');
      const airport = AIRPORTS.find((a: any) => a.code === airportCode);
      return airport ? airport.countryCode !== 'CD' : false;
    } catch (error) {
      console.error('[BIRS] Erreur chargement AIRPORTS:', error);
      return false;
    }
  }

  /**
   * Crée un bagage international lors du scan à l'arrivée
   * Appelé quand un bagage est scanné mais non trouvé dans le système
   * Si le bagage existe déjà, retourne le bagage existant
   */
  async createInternationalBaggage(
    rfidTag: string,
    scannedBy: string,
    airportCode: string,
    passengerName?: string,
    pnr?: string,
    flightNumber?: string,
    origin?: string
  ): Promise<InternationalBaggage> {
    // Assurer que la base de données BIRS est initialisée
    await this.ensureBirsDatabaseInitialized();
    
    try {
      // Vérifier si un bagage international avec ce tag existe déjà
      const existing = await birsDatabaseService.getInternationalBaggageByRfidTag(rfidTag);
      if (existing) {
        console.log('[BIRS] 🔄 Bagage international déjà existant:', existing.id);
        return existing;
      }
    } catch (error) {
      if (error instanceof Error && error.message !== 'Database not initialized') {
        throw error;
      }
      // Si erreur d'initialisation, on continue pour essayer de créer
    }

    const now = new Date().toISOString();

    try {
      const id = await birsDatabaseService.createInternationalBaggage({
        rfidTag,
        scannedAt: now,
        scannedBy,
        airportCode,
        status: 'scanned',
        passengerName,
        pnr,
        flightNumber,
        origin,
        synced: false
      });

      const baggage = await birsDatabaseService.getInternationalBaggageById(id);
      if (!baggage) {
        throw new Error('Failed to create international baggage');
      }

      console.log('[BIRS] ✅ Nouveau bagage international créé:', baggage.id);
      return baggage;
    } catch (error) {
      // Gérer l'erreur de contrainte UNIQUE (le bagage a été créé entre temps)
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        console.log('[BIRS] 🔄 Contrainte UNIQUE - Le bagage existe déjà, récupération...');
        const existing = await birsDatabaseService.getInternationalBaggageByRfidTag(rfidTag);
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  /**
   * Lance la réconciliation automatique pour un rapport
   */
  async reconcileReport(
    reportId: string,
    airportCode: string,
    userId: string,
    options?: ReconciliationOptions
  ): Promise<ReconciliationResult> {
    // Récupérer les bagages internationaux non réconciliés
    const unreconciledBaggages = await birsDatabaseService.getUnreconciledBaggages(airportCode);

    // Récupérer les items du rapport
    const reportItems = await birsDatabaseService.getBirsReportItemsByReportId(reportId);

    if (reportItems.length === 0) {
      throw new Error('Aucun item trouvé dans le rapport');
    }

    // Effectuer la réconciliation
    const result = await birsReconciliationService.reconcileBaggages(
      unreconciledBaggages,
      reportItems,
      options
    );

    // Mettre à jour les bagages et items réconciliés
    const now = new Date().toISOString();
    
    for (const match of result.matches) {
      // Mettre à jour le bagage international
      await birsDatabaseService.updateInternationalBaggage(match.internationalBaggageId, {
        status: 'reconciled',
        reconciledAt: now,
        reconciledBy: userId,
        birsReportId: reportId
      });

      // Mettre à jour l'item du rapport
      await birsDatabaseService.updateBirsReportItem(match.birsReportItemId, {
        internationalBaggageId: match.internationalBaggageId,
        reconciledAt: now
      });
    }

    // Marquer les bagages non matchés comme unmatched
    for (const baggageId of result.unmatchedScannedBags) {
      await birsDatabaseService.updateInternationalBaggage(baggageId, {
        status: 'unmatched'
      });
    }

    // Mettre à jour les statistiques du rapport
    await birsDatabaseService.updateBirsReport(reportId, {
      reconciledCount: result.matchedCount,
      unmatchedCount: result.unmatchedReport,
      processedAt: now
    });

    return result;
  }

  /**
   * Obtient les statistiques BIRS pour le dashboard
   */
  async getStatistics(airportCode: string) {
    return birsDatabaseService.getBirsStatistics(airportCode);
  }

  /**
   * Obtient tous les rapports BIRS pour un aéroport
   */
  async getReports(airportCode: string): Promise<BirsReport[]> {
    return birsDatabaseService.getBirsReportsByAirport(airportCode);
  }

  /**
   * Obtient tous les bagages internationaux non réconciliés
   */
  async getUnreconciledBaggages(airportCode: string): Promise<InternationalBaggage[]> {
    return birsDatabaseService.getUnreconciledBaggages(airportCode);
  }

  /**
   * Obtient un rapport par ID avec ses items
   */
  async getReportWithItems(reportId: string): Promise<{
    report: BirsReport;
    items: BirsReportItem[];
  } | null> {
    const report = await birsDatabaseService.getBirsReportById(reportId);
    if (!report) return null;

    const items = await birsDatabaseService.getBirsReportItemsByReportId(reportId);
    
    return { report, items };
  }

  /**
   * Réconcilie manuellement un bagage avec un item du rapport
   */
  async manualReconciliation(
    baggageId: string,
    itemId: string,
    userId: string
  ): Promise<void> {
    const now = new Date().toISOString();

    // Récupérer l'item pour obtenir le reportId
    const items = await birsDatabaseService.getBirsReportItemsByReportId('');
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
      throw new Error('Item non trouvé');
    }

    // Mettre à jour le bagage
    await birsDatabaseService.updateInternationalBaggage(baggageId, {
      status: 'reconciled',
      reconciledAt: now,
      reconciledBy: userId,
      birsReportId: item.birsReportId
    });

    // Mettre à jour l'item
    await birsDatabaseService.updateBirsReportItem(itemId, {
      internationalBaggageId: baggageId,
      reconciledAt: now
    });

    // Mettre à jour les statistiques du rapport
    const report = await birsDatabaseService.getBirsReportById(item.birsReportId);
    if (report) {
      await birsDatabaseService.updateBirsReport(report.id, {
        reconciledCount: report.reconciledCount + 1
      });
    }
  }

  /**
   * Upload et parse un rapport BIRS
   * Formats acceptés: PDF, Excel (.xlsx, .xls), Text (.txt, .csv), SVG
   */
  async uploadBirsReport(
    file: {
      name: string;
      size: number;
      type: string;
      uri: string;
    },
    fileContent: string,
    uploadedBy: string,
    airportCode: string
  ): Promise<{ reportId: string; itemCount: number; validation: { valid: boolean; errors: string[] } }> {
    // Assurer que la base de données BIRS est initialisée
    await this.ensureBirsDatabaseInitialized();

    console.log('[BIRS] 📄 Upload de rapport BIRS:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Parser le fichier
    const parsedData = await birsFileParserService.parseFile(file, fileContent);

    // Valider les données parsées
    const validation = birsFileParserService.validateParsedData(parsedData);
    
    if (!validation.valid) {
      console.warn('[BIRS] ⚠️ Validation échouée:', validation.errors);
      throw new Error(`Fichier invalide: ${validation.errors.join(', ')}`);
    }

    console.log('[BIRS] ✅ Fichier parsé avec succès:', {
      flightNumber: parsedData.flightNumber,
      itemCount: parsedData.items.length,
      airline: parsedData.airline
    });

    const now = new Date().toISOString();

    // Créer le rapport BIRS
    const reportId = await birsDatabaseService.createBirsReport({
      reportType: parsedData.reportType,
      flightNumber: parsedData.flightNumber,
      flightDate: parsedData.flightDate,
      origin: parsedData.origin,
      destination: parsedData.destination,
      airline: parsedData.airline,
      airlineCode: parsedData.airlineCode,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: now,
      uploadedBy,
      airportCode,
      totalBaggages: parsedData.items.length,
      reconciledCount: 0,
      unmatchedCount: 0,
      rawData: JSON.stringify(parsedData),
      synced: false
    });

    console.log('[BIRS] 💾 Rapport créé:', reportId);

    // Créer les items du rapport
    for (const item of parsedData.items) {
      await birsDatabaseService.createBirsReportItem({
        birsReportId: reportId,
        ...item
      });
    }

    console.log('[BIRS] ✅ Tous les items créés:', parsedData.items.length);

    return {
      reportId,
      itemCount: parsedData.items.length,
      validation
    };
  }

  /**
   * Upload et réconcilie automatiquement un rapport BIRS
   */
  async uploadAndReconcileBirsReport(
    file: {
      name: string;
      size: number;
      type: string;
      uri: string;
    },
    fileContent: string,
    uploadedBy: string,
    airportCode: string,
    reconciliationOptions?: ReconciliationOptions
  ): Promise<{
    reportId: string;
    itemCount: number;
    reconciliationResult: ReconciliationResult;
  }> {
    // Upload le rapport
    const uploadResult = await this.uploadBirsReport(
      file,
      fileContent,
      uploadedBy,
      airportCode
    );

    console.log('[BIRS] 🔄 Lancement de la réconciliation automatique...');

    // Lancer la réconciliation automatique
    const reconciliationResult = await this.reconcileReport(
      uploadResult.reportId,
      airportCode,
      uploadedBy,
      reconciliationOptions
    );

    console.log('[BIRS] ✅ Réconciliation terminée:', {
      matched: reconciliationResult.matchedCount,
      unmatchedScanned: reconciliationResult.unmatchedScanned,
      unmatchedReport: reconciliationResult.unmatchedReport
    });

    return {
      reportId: uploadResult.reportId,
      itemCount: uploadResult.itemCount,
      reconciliationResult
    };
  }
}

export const birsService = new BirsService();
