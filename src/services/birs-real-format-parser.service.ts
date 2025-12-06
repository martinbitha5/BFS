/**
 * Parser pour les formats BIRS réels des compagnies aériennes
 * Basé sur les formats Turkish Airlines, Brussels Airlines, Ethiopian Airlines
 */

import { BirsReportItem, BirsReportType } from '../types/birs.types';

interface ParsedBirsData {
  reportType: BirsReportType;
  flightNumber: string;
  flightDate: string;
  origin: string;
  destination: string;
  airline: string;
  airlineCode: string;
  items: Array<Omit<BirsReportItem, 'id' | 'birsReportId' | 'createdAt' | 'updatedAt'>>;
}

class BirsRealFormatParserService {
  /**
   * Parse un manifeste Turkish Airlines
   * Format: PDF avec colonnes N° TAG, Billet/Expedit, Nom Passager, Poids, Comment, Lib Etat
   * 
   * Exemple:
   * MANIF RCVD TK540 28 NOV
   * Manifeste Bagages reçus du Vol TK540 du 28/11/2025
   * Escale de réception : FIH
   * 
   * N° TAG        Billet/Expedit  Nom Passager/Destinataire  Poids  Comment  Lib Etat
   * 23534523O     EZANIDOMPANGI                              0      LOADED   Received
   */
  parseTurkishAirlines(content: string, fileName: string): ParsedBirsData {
    console.log('[BIRS Parser] 🇹🇷 Parsing Turkish Airlines format');

    // Extraire le numéro de vol et la date
    const flightMatch = content.match(/TK(\d+)/i);
    const dateMatch = content.match(/(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{2,4})/);
    
    const flightNumber = flightMatch ? `TK${flightMatch[1]}` : 'TK000';
    const flightDate = dateMatch ? this.normalizeDate(dateMatch[0]) : new Date().toISOString().split('T')[0];

    // Extraire l'escale (FIH, etc.)
    const escaleMatch = content.match(/[Ee]scale\s+(?:de\s+)?[rR]éception\s*:\s*([A-Z]{3})/);
    const destination = escaleMatch ? escaleMatch[1] : 'FIH';

    const items: any[] = [];

    // Parser les lignes de bagages
    // Format: TAG + Nom + Poids + Comment + Status
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Chercher les lignes avec des tags de bagages (commençant par des chiffres)
      // Format: 23534523O     EZANIDOMPANGI    0    LOADED   Received
      const bagMatch = line.match(/^(\d{7,12}[A-Z]?)\s+([A-Z\s]+?)(?:\s+(\d+))?\s+(LOADED|RECEIVED|UNLOADED)?/i);
      
      if (bagMatch) {
        const [, bagId, passengerName, weight, status] = bagMatch;
        
        items.push({
          bagId: bagId.trim(),
          passengerName: this.normalizeName(passengerName.trim()),
          pnr: '', // Pas dans ce format
          flightNumber,
          origin: 'IST', // Istanbul pour Turkish Airlines
          destination,
          weight: weight ? parseFloat(weight) : 0,
          class: 'Y', // Par défaut
          status: status?.toLowerCase() === 'loaded' ? 'loaded' : 'received',
          reconciledAt: null,
          internationalBaggageId: null
        });
      }
    }

    console.log(`[BIRS Parser] ✅ Turkish Airlines: ${items.length} bagages trouvés`);

    return {
      reportType: 'turkish',
      flightNumber,
      flightDate,
      origin: 'IST',
      destination,
      airline: 'Turkish Airlines',
      airlineCode: 'TK',
      items
    };
  }

  /**
   * Parse un manifeste Brussels Airlines
   * Format: Texte avec colonnes structurées
   * 
   * Exemple:
   * DEVICE ID: AKE10802ET    TYPE: LOCAL    Total Bags: 29
   * Route: FIH
   * 
   * Bag ID       Pax Surname      PNR      LSeq  Class  PSN  KG    Route      Categories
   * 9ET336602    MBAKA            GHMKYS   6     Econ   244  29.5  BRU*-FIH
   */
  parseBrusselsAirlines(content: string, fileName: string): ParsedBirsData {
    console.log('[BIRS Parser] 🇧🇪 Parsing Brussels Airlines format');

    // Extraire le numéro de vol du nom de fichier ou du contenu
    const flightMatch = fileName.match(/SN(\d+)/i) || content.match(/SN(\d+)/i);
    const flightNumber = flightMatch ? `SN${flightMatch[1]}` : 'SN000';

    // Extraire la date
    const dateMatch = fileName.match(/(\d{2,4})[-_]?(\d{2})[-_]?(\d{2})/);
    const flightDate = dateMatch ? this.normalizeDate(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`) : new Date().toISOString().split('T')[0];

    // Extraire la route
    const routeMatch = content.match(/Route:\s*([A-Z]{3})/i);
    const destination = routeMatch ? routeMatch[1] : 'FIH';

    // Extraire le total de bagages
    const totalMatch = content.match(/Total\s+Bags:\s*(\d+)/i);
    const expectedCount = totalMatch ? parseInt(totalMatch[1]) : 0;

    const items: any[] = [];

    // Parser les lignes de bagages
    // Format: 9ET336602    MBAKA    GHMKYS   6   Econ   244  29.5  BRU*-FIH
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Chercher les lignes avec Bag ID (format: 9ET suivi de chiffres)
      const bagMatch = line.match(/^(9ET\d{6})\s+([A-Z\s]+?)\s+([A-Z0-9]{6})\s+(\d+)\s+(Econ|Prio|Business|First)?\s+(\d+)\s+([\d.]+)\s+([A-Z*\-]+)/i);
      
      if (bagMatch) {
        const [, bagId, surname, pnr, lseq, classType, psn, weight, route] = bagMatch;
        
        items.push({
          bagId: bagId.trim(),
          passengerName: this.normalizeName(surname.trim()),
          pnr: pnr.trim(),
          flightNumber,
          origin: 'BRU', // Brussels pour SN
          destination,
          weight: parseFloat(weight),
          class: this.mapClass(classType || 'Econ'),
          seatNumber: lseq || '',
          psn: psn || '',
          status: 'received',
          reconciledAt: null,
          internationalBaggageId: null
        });
      }
    }

    console.log(`[BIRS Parser] ✅ Brussels Airlines: ${items.length} bagages trouvés (attendus: ${expectedCount})`);

    if (items.length !== expectedCount && expectedCount > 0) {
      console.warn(`[BIRS Parser] ⚠️ Nombre de bagages différent: trouvés ${items.length}, attendus ${expectedCount}`);
    }

    return {
      reportType: 'generic',
      flightNumber,
      flightDate,
      origin: 'BRU',
      destination,
      airline: 'Brussels Airlines',
      airlineCode: 'SN',
      items
    };
  }

  /**
   * Parse un manifeste Ethiopian Airlines
   * Format: CSV ou texte structuré
   * 
   * Exemple:
   * Bag ID,Passenger Name,PNR,Seat Number,Class,PSN,Weight,Route
   * ET1234567890,MARTIN/JEAN,ABC123,12A,Y,001,15,ADD*FIH
   */
  parseEthiopianAirlines(content: string, fileName: string): ParsedBirsData {
    console.log('[BIRS Parser] 🇪🇹 Parsing Ethiopian Airlines format');

    // Extraire le numéro de vol
    const flightMatch = fileName.match(/ET(\d+)/i) || content.match(/ET(\d+)/i);
    const flightNumber = flightMatch ? `ET${flightMatch[1]}` : 'ET000';

    // Extraire la date
    const dateMatch = fileName.match(/(\d{2,4})[-_]?(\d{2})[-_]?(\d{2})/);
    const flightDate = dateMatch ? this.normalizeDate(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`) : new Date().toISOString().split('T')[0];

    const items: any[] = [];
    const lines = content.split('\n');

    // Déterminer si c'est du CSV ou du texte structuré
    const isCSV = content.includes(',') && lines.some(l => l.split(',').length > 3);

    if (isCSV) {
      // Format CSV
      for (let i = 1; i < lines.length; i++) { // Skip header
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length < 4) continue;

        const [bagId, passengerName, pnr, seatNumber, classType, psn, weight, route] = parts;

        if (bagId && bagId.startsWith('ET')) {
          items.push({
            bagId: bagId.trim(),
            passengerName: this.normalizeName(passengerName?.trim() || ''),
            pnr: pnr?.trim() || '',
            flightNumber,
            origin: 'ADD', // Addis Ababa pour ET
            destination: 'FIH',
            weight: weight ? parseFloat(weight) : 0,
            class: classType?.trim() || 'Y',
            seatNumber: seatNumber?.trim() || '',
            psn: psn?.trim() || '',
            status: 'received',
            reconciledAt: null,
            internationalBaggageId: null
          });
        }
      }
    } else {
      // Format texte structuré (colonnes fixes)
      for (const line of lines) {
        const bagMatch = line.match(/^(ET\d{10})\s+([A-Z\/\s]+?)\s+([A-Z0-9]{6})\s+(\w+)\s+([A-Z])\s+(\d+)/i);
        
        if (bagMatch) {
          const [, bagId, passengerName, pnr, seatNumber, classType, weight] = bagMatch;
          
          items.push({
            bagId: bagId.trim(),
            passengerName: this.normalizeName(passengerName.trim()),
            pnr: pnr.trim(),
            flightNumber,
            origin: 'ADD',
            destination: 'FIH',
            weight: parseFloat(weight),
            class: classType,
            seatNumber: seatNumber,
            status: 'received',
            reconciledAt: null,
            internationalBaggageId: null
          });
        }
      }
    }

    console.log(`[BIRS Parser] ✅ Ethiopian Airlines: ${items.length} bagages trouvés`);

    return {
      reportType: 'ethiopian',
      flightNumber,
      flightDate,
      origin: 'ADD',
      destination: 'FIH',
      airline: 'Ethiopian Airlines',
      airlineCode: 'ET',
      items
    };
  }

  /**
   * Parse automatiquement en détectant la compagnie
   */
  parseAutoDetect(content: string, fileName: string): ParsedBirsData {
    console.log('[BIRS Parser] 🔍 Auto-détection du format...');

    // Détecter la compagnie
    if (content.match(/TURKISH\s*AIRLINES/i) || fileName.match(/TK\d+/i) || content.match(/TK\d+/)) {
      return this.parseTurkishAirlines(content, fileName);
    }

    if (content.match(/BRUSSELS\s*AIRLINES/i) || fileName.match(/SN\d+/i) || content.match(/9ET\d{6}/)) {
      return this.parseBrusselsAirlines(content, fileName);
    }

    if (content.match(/ETHIOPIAN\s*AIRLINES/i) || fileName.match(/ET\d+/i) || content.match(/ET\d{10}/)) {
      return this.parseEthiopianAirlines(content, fileName);
    }

    // Par défaut, essayer Ethiopian (le plus commun)
    console.log('[BIRS Parser] ⚠️ Format non détecté, tentative Ethiopian par défaut');
    return this.parseEthiopianAirlines(content, fileName);
  }

  /**
   * Normalise un nom de passager
   */
  private normalizeName(name: string): string {
    // Convertir en format NOM/PRENOM
    name = name.trim().toUpperCase();
    
    // Si déjà au format NOM/PRENOM
    if (name.includes('/')) {
      return name;
    }

    // Si format "SURNAME FIRSTNAME", convertir en "SURNAME/FIRSTNAME"
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]}/${parts.slice(1).join(' ')}`;
    }

    return name;
  }

  /**
   * Mappe les classes de voyage
   */
  private mapClass(classType: string): string {
    const normalized = classType.toLowerCase();
    
    if (normalized.includes('econ') || normalized === 'y') return 'Y';
    if (normalized.includes('business') || normalized === 'j' || normalized === 'c') return 'J';
    if (normalized.includes('first') || normalized === 'f') return 'F';
    if (normalized.includes('prio') || normalized.includes('premium')) return 'J';
    
    return 'Y'; // Par défaut
  }

  /**
   * Normalise une date
   */
  private normalizeDate(dateStr: string): string {
    // Format: DD/MM/YYYY ou DD-MM-YYYY ou YYYYMMDD
    const patterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, // DD/MM/YYYY
      /(\d{4})[-\/]?(\d{2})[-\/]?(\d{2})/, // YYYY-MM-DD or YYYYMMDD
    ];

    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        let [, a, b, c] = match;
        
        // Si format DD/MM/YYYY
        if (a.length <= 2) {
          const day = a.padStart(2, '0');
          const month = b.padStart(2, '0');
          let year = c;
          if (year.length === 2) {
            year = `20${year}`;
          }
          return `${year}-${month}-${day}`;
        }
        
        // Si format YYYY-MM-DD
        return `${a}-${b}-${c}`;
      }
    }

    // Par défaut, date du jour
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Validation des données parsées
   */
  validateParsedData(data: ParsedBirsData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.flightNumber || data.flightNumber.length < 4) {
      errors.push('Numéro de vol invalide');
    }

    if (!data.flightDate) {
      errors.push('Date de vol manquante');
    }

    if (data.items.length === 0) {
      errors.push('Aucun bagage trouvé dans le rapport');
    }

    // Vérifier que chaque item a au moins un bag ID
    const invalidItems = data.items.filter(item => !item.bagId || item.bagId.length < 5);
    if (invalidItems.length > 0) {
      errors.push(`${invalidItems.length} bagages sans ID valide`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const birsRealFormatParserService = new BirsRealFormatParserService();
export { ParsedBirsData };
