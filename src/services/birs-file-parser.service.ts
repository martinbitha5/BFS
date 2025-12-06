/**
 * Service de parsing des fichiers BIRS
 * Supporte: PDF, Excel (.xlsx, .xls), Text (.txt, .csv), SVG
 */

import { BirsReportItem, BirsReportType } from '../types/birs.types';

interface ParsedBirsData {
  reportType: BirsReportType;
  flightNumber: string;
  flightDate: string;
  origin: string;
  destination: string;
  airline: string;
  airlineCode?: string;
  items: Array<Omit<BirsReportItem, 'id' | 'birsReportId' | 'createdAt' | 'updatedAt'>>;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
  uri: string;
}

class BirsFileParserService {
  /**
   * Détecte le type de fichier basé sur l'extension et le MIME type
   */
  private detectFileType(file: FileInfo): 'pdf' | 'excel' | 'text' | 'svg' | 'unknown' {
    const extension = file.name.toLowerCase().split('.').pop() || '';
    const mimeType = file.type.toLowerCase();

    // PDF
    if (extension === 'pdf' || mimeType.includes('pdf')) {
      return 'pdf';
    }

    // Excel
    if (['xlsx', 'xls', 'xlsm'].includes(extension) || 
        mimeType.includes('spreadsheet') || 
        mimeType.includes('excel')) {
      return 'excel';
    }

    // Text (CSV, TXT, etc.)
    if (['txt', 'csv', 'tsv'].includes(extension) || 
        mimeType.includes('text') || 
        mimeType.includes('csv')) {
      return 'text';
    }

    // SVG
    if (extension === 'svg' || mimeType.includes('svg')) {
      return 'svg';
    }

    return 'unknown';
  }

  /**
   * Parse un fichier BIRS et retourne les données structurées
   */
  async parseFile(file: FileInfo, content: string): Promise<ParsedBirsData> {
    const fileType = this.detectFileType(file);
    
    console.log('[BIRS Parser] Parsing file:', {
      name: file.name,
      type: fileType,
      size: file.size
    });

    switch (fileType) {
      case 'pdf':
        return this.parsePDF(content, file);
      case 'excel':
        return this.parseExcel(content, file);
      case 'text':
        return this.parseText(content, file);
      case 'svg':
        return this.parseSVG(content, file);
      default:
        throw new Error(`Format de fichier non supporté: ${file.name}`);
    }
  }

  /**
   * Parse un fichier PDF BIRS
   * Format attendu: Texte extrait du PDF avec lignes de bagages
   */
  private async parsePDF(content: string, file: FileInfo): Promise<ParsedBirsData> {
    console.log('[BIRS Parser] Parsing PDF content');
    
    // Extraire les métadonnées du rapport depuis le contenu
    const metadata = this.extractMetadata(content, file.name);
    
    // Parser les lignes de bagages
    const items = this.parseTextLines(content);

    return {
      ...metadata,
      items
    };
  }

  /**
   * Parse un fichier Excel BIRS
   * Pour React Native, on reçoit le contenu déjà converti en CSV ou JSON
   */
  private async parseExcel(content: string, file: FileInfo): Promise<ParsedBirsData> {
    console.log('[BIRS Parser] Parsing Excel content');
    
    try {
      // Essayer de parser comme JSON d'abord (si converti côté client)
      const jsonData = JSON.parse(content);
      return this.parseExcelJSON(jsonData, file.name);
    } catch {
      // Sinon, traiter comme CSV
      return this.parseCSV(content, file.name);
    }
  }

  /**
   * Parse du contenu Excel converti en JSON
   */
  private parseExcelJSON(data: any, fileName: string): ParsedBirsData {
    const metadata = this.extractMetadataFromFileName(fileName);
    const items: Array<Omit<BirsReportItem, 'id' | 'birsReportId' | 'createdAt' | 'updatedAt'>> = [];

    // Structure attendue: tableau d'objets avec colonnes
    // Colonnes typiques: Bag ID, Passenger Name, PNR, Seat, Class, Weight, etc.
    const rows = Array.isArray(data) ? data : (data.data || []);

    for (const row of rows) {
      // Skip les en-têtes et lignes vides
      if (this.isHeaderRow(row) || this.isEmptyRow(row)) {
        continue;
      }

      const item = this.parseExcelRow(row);
      if (item) {
        items.push(item);
      }
    }

    return {
      ...metadata,
      items
    };
  }

  /**
   * Parse une ligne Excel
   */
  private parseExcelRow(row: any): Omit<BirsReportItem, 'id' | 'birsReportId' | 'createdAt' | 'updatedAt'> | null {
    // Différents formats possibles selon la compagnie
    const bagId = this.extractValue(row, ['Bag ID', 'Tag Number', 'Baggage Tag', 'TAG', 'BAG_ID', 'bag_id']);
    const passengerName = this.extractValue(row, ['Passenger Name', 'Name', 'PASSENGER', 'passenger_name', 'PAX_NAME']);
    
    if (!bagId || !passengerName) {
      return null;
    }

    return {
      bagId: bagId.toString().trim(),
      passengerName: passengerName.toString().trim(),
      pnr: this.extractValue(row, ['PNR', 'Booking Ref', 'booking_ref', 'RECORD_LOCATOR'])?.toString(),
      seatNumber: this.extractValue(row, ['Seat', 'Seat Number', 'SEAT', 'seat_number'])?.toString(),
      class: this.extractValue(row, ['Class', 'CLASS', 'class', 'Cabin'])?.toString(),
      psn: this.extractValue(row, ['PSN', 'Seq', 'Sequence', 'psn'])?.toString(),
      weight: this.parseWeight(this.extractValue(row, ['Weight', 'WEIGHT', 'weight', 'WT'])),
      route: this.extractValue(row, ['Route', 'ROUTE', 'route'])?.toString(),
      categories: this.extractValue(row, ['Categories', 'Special', 'SPECIAL'])?.toString(),
      loaded: this.parseBoolean(this.extractValue(row, ['Loaded', 'LOADED', 'loaded'])),
      received: this.parseBoolean(this.extractValue(row, ['Received', 'RECEIVED', 'received']))
    };
  }

  /**
   * Extrait une valeur depuis un objet avec plusieurs clés possibles
   */
  private extractValue(obj: any, possibleKeys: string[]): any {
    for (const key of possibleKeys) {
      if (obj.hasOwnProperty(key) && obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
        return obj[key];
      }
    }
    return undefined;
  }

  /**
   * Parse un fichier texte BIRS (CSV, TXT)
   */
  private async parseText(content: string, file: FileInfo): Promise<ParsedBirsData> {
    console.log('[BIRS Parser] Parsing text content');
    
    // Détecter si c'est un CSV
    if (file.name.toLowerCase().endsWith('.csv') || content.includes(',') || content.includes(';')) {
      return this.parseCSV(content, file.name);
    }
    
    // Sinon, parser comme texte libre
    const metadata = this.extractMetadata(content, file.name);
    const items = this.parseTextLines(content);

    return {
      ...metadata,
      items
    };
  }

  /**
   * Parse un fichier CSV
   */
  private parseCSV(content: string, fileName: string): ParsedBirsData {
    const metadata = this.extractMetadataFromFileName(fileName);
    const items: Array<Omit<BirsReportItem, 'id' | 'birsReportId' | 'createdAt' | 'updatedAt'>> = [];

    const lines = content.split(/\r?\n/);
    const separator = content.includes(';') ? ';' : ',';
    
    // Première ligne = en-têtes
    const headers = lines[0]?.split(separator).map(h => h.trim()) || [];
    
    // Parser chaque ligne
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(separator).map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      const item = this.parseExcelRow(row); // Réutiliser la logique Excel
      if (item) {
        items.push(item);
      }
    }

    return {
      ...metadata,
      items
    };
  }

  /**
   * Parse un fichier SVG (format spécial, potentiellement avec données embarquées)
   */
  private async parseSVG(content: string, file: FileInfo): Promise<ParsedBirsData> {
    console.log('[BIRS Parser] Parsing SVG content');
    
    // SVG peut contenir des données dans des éléments <text> ou <metadata>
    const metadata = this.extractMetadataFromSVG(content, file.name);
    const items = this.extractItemsFromSVG(content);

    return {
      ...metadata,
      items
    };
  }

  /**
   * Extrait les métadonnées depuis un SVG
   */
  private extractMetadataFromSVG(content: string, fileName: string): Omit<ParsedBirsData, 'items'> {
    // Chercher les balises <metadata> ou <text> contenant les infos du vol
    const metadataMatch = content.match(/<metadata>(.*?)<\/metadata>/s);
    
    if (metadataMatch) {
      try {
        const metaContent = metadataMatch[1];
        return this.extractMetadata(metaContent, fileName);
      } catch (error) {
        console.warn('[BIRS Parser] Failed to parse SVG metadata:', error);
      }
    }

    return this.extractMetadataFromFileName(fileName);
  }

  /**
   * Extrait les items depuis un SVG
   */
  private extractItemsFromSVG(content: string): Array<Omit<BirsReportItem, 'id' | 'birsReportId' | 'createdAt' | 'updatedAt'>> {
    const items: Array<Omit<BirsReportItem, 'id' | 'birsReportId' | 'createdAt' | 'updatedAt'>> = [];
    
    // Extraire le texte de tous les éléments <text>
    const textMatches = content.matchAll(/<text[^>]*>(.*?)<\/text>/gs);
    const textContent = Array.from(textMatches).map(m => m[1]).join('\n');
    
    if (textContent) {
      return this.parseTextLines(textContent);
    }

    return items;
  }

  /**
   * Parse les lignes de texte pour extraire les bagages
   */
  private parseTextLines(content: string): Array<Omit<BirsReportItem, 'id' | 'birsReportId' | 'createdAt' | 'updatedAt'>> {
    const items: Array<Omit<BirsReportItem, 'id' | 'birsReportId' | 'createdAt' | 'updatedAt'>> = [];
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const item = this.parseTextLine(line);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Parse une ligne de texte pour extraire un bagage
   * Format attendu (variable selon compagnie):
   * - "ET1234567890 DUPONT/JEAN ABC123 12A Y"
   * - "TK8765432109 MARTIN MARIE DEF456 23B J 23KG"
   */
  private parseTextLine(line: string): Omit<BirsReportItem, 'id' | 'birsReportId' | 'createdAt' | 'updatedAt'> | null {
    const trimmed = line.trim();
    
    // Skip lignes vides ou en-têtes
    if (!trimmed || trimmed.length < 10 || this.isHeaderLine(trimmed)) {
      return null;
    }

    // Pattern générique: Tag(10-13 chars) Nom PNR Siège Classe Poids
    const pattern = /^([A-Z0-9]{10,13})\s+([A-Z\/\s]+?)\s+([A-Z0-9]{6})\s+(\d{1,3}[A-Z])?\s+([A-Z])?\s*(\d+KG)?/i;
    const match = trimmed.match(pattern);

    if (match) {
      return {
        bagId: match[1].trim(),
        passengerName: match[2].trim().replace(/\s+/g, ' '),
        pnr: match[3]?.trim(),
        seatNumber: match[4]?.trim(),
        class: match[5]?.trim(),
        weight: this.parseWeight(match[6])
      };
    }

    // Fallback: essayer de parser au minimum Bag ID et nom
    const simpleParts = trimmed.split(/\s+/);
    if (simpleParts.length >= 2) {
      const bagId = simpleParts[0];
      const passengerName = simpleParts.slice(1).join(' ');
      
      // Valider que le bag ID ressemble à un tag
      if (/^[A-Z0-9]{10,13}$/i.test(bagId)) {
        return {
          bagId: bagId.trim(),
          passengerName: passengerName.trim()
        };
      }
    }

    return null;
  }

  /**
   * Extrait les métadonnées depuis le contenu ou le nom de fichier
   */
  private extractMetadata(content: string, fileName: string): Omit<ParsedBirsData, 'items'> {
    // Chercher dans le contenu d'abord
    const flightMatch = content.match(/FLIGHT[:\s]+([A-Z0-9]{2,3}\s*\d{3,4})/i);
    const dateMatch = content.match(/DATE[:\s]+(\d{2}[-\/]\d{2}[-\/]\d{4}|\d{4}[-\/]\d{2}[-\/]\d{2})/i);
    const routeMatch = content.match(/ROUTE[:\s]+([A-Z]{3})\s*[-*]\s*([A-Z]{3})/i);
    const airlineMatch = content.match(/AIRLINE[:\s]+([A-Z\s]+)/i);

    let metadata = this.extractMetadataFromFileName(fileName);

    if (flightMatch) {
      metadata.flightNumber = flightMatch[1].replace(/\s+/g, '').toUpperCase();
    }
    if (dateMatch) {
      metadata.flightDate = this.normalizeDate(dateMatch[1]);
    }
    if (routeMatch) {
      metadata.origin = routeMatch[1].toUpperCase();
      metadata.destination = routeMatch[2].toUpperCase();
    }
    if (airlineMatch) {
      metadata.airline = airlineMatch[1].trim();
    }

    return metadata;
  }

  /**
   * Extrait les métadonnées depuis le nom du fichier
   * Format: BIRS_ET701_20231206_ADDIS_FIH.pdf
   */
  private extractMetadataFromFileName(fileName: string): Omit<ParsedBirsData, 'items'> {
    const cleanName = fileName.replace(/\.[^.]+$/, ''); // Retirer extension
    const parts = cleanName.split(/[_-]/);

    let reportType: BirsReportType = 'ethiopian';
    let flightNumber = 'UNKNOWN';
    let flightDate = new Date().toISOString().split('T')[0];
    let origin = 'UNK';
    let destination = 'UNK';
    let airline = 'Unknown Airline';

    // Détecter le type de rapport et extraire les infos
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].toUpperCase();

      // Vol (ex: ET701, TK1953)
      if (/^[A-Z]{2}\d{3,4}$/.test(part)) {
        flightNumber = part;
        
        // Déterminer la compagnie
        const airlineCode = part.substring(0, 2);
        if (airlineCode === 'ET') {
          reportType = 'ethiopian';
          airline = 'Ethiopian Airlines';
        } else if (airlineCode === 'TK') {
          reportType = 'turkish';
          airline = 'Turkish Airlines';
        } else if (airlineCode === 'SN') {
          reportType = 'generic';
          airline = 'Brussels Airlines';
        }
      }

      // Date (ex: 20231206, 2023-12-06)
      if (/^\d{8}$/.test(part) || /^\d{4}-?\d{2}-?\d{2}$/.test(part)) {
        flightDate = this.normalizeDate(part);
      }

      // Codes aéroport (3 lettres)
      if (/^[A-Z]{3}$/.test(part) && origin === 'UNK') {
        origin = part;
      } else if (/^[A-Z]{3}$/.test(part) && origin !== 'UNK' && destination === 'UNK') {
        destination = part;
      }
    }

    return {
      reportType,
      flightNumber,
      flightDate,
      origin,
      destination,
      airline,
      airlineCode: flightNumber.substring(0, 2)
    };
  }

  /**
   * Normalise une date au format ISO (YYYY-MM-DD)
   */
  private normalizeDate(dateStr: string): string {
    // Format: 20231206 -> 2023-12-06
    if (/^\d{8}$/.test(dateStr)) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    
    // Format: DD/MM/YYYY -> YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month}-${day}`;
    }

    // Format: DD-MM-YYYY -> YYYY-MM-DD
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('-');
      return `${year}-${month}-${day}`;
    }

    // Déjà au format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    return new Date().toISOString().split('T')[0];
  }

  /**
   * Vérifie si une ligne est un en-tête
   */
  private isHeaderLine(line: string): boolean {
    const upperLine = line.toUpperCase();
    const headerKeywords = [
      'BAG ID', 'TAG', 'PASSENGER', 'NAME', 'PNR', 'SEAT', 'CLASS',
      'WEIGHT', 'ROUTE', 'FLIGHT', 'DATE', '---', '===', 'BAGGAGE LIST',
      'REPORT', 'BIRS'
    ];
    
    return headerKeywords.some(keyword => upperLine.includes(keyword));
  }

  /**
   * Vérifie si une ligne Excel est un en-tête
   */
  private isHeaderRow(row: any): boolean {
    if (typeof row === 'object') {
      const values = Object.values(row).join(' ').toUpperCase();
      return this.isHeaderLine(values);
    }
    return false;
  }

  /**
   * Vérifie si une ligne Excel est vide
   */
  private isEmptyRow(row: any): boolean {
    if (typeof row === 'object') {
      return Object.values(row).every(v => !v || v === '');
    }
    return true;
  }

  /**
   * Parse le poids depuis différents formats
   */
  private parseWeight(value: any): number | undefined {
    if (!value) return undefined;
    
    const str = value.toString().toUpperCase().replace(/[KG\s]/g, '');
    const num = parseFloat(str);
    
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse un booléen depuis différents formats
   */
  private parseBoolean(value: any): boolean | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    
    if (typeof value === 'boolean') {
      return value;
    }
    
    const str = value.toString().toUpperCase();
    if (['YES', 'Y', 'TRUE', '1', 'OUI', 'LOADED', 'RECEIVED'].includes(str)) {
      return true;
    }
    if (['NO', 'N', 'FALSE', '0', 'NON'].includes(str)) {
      return false;
    }
    
    return undefined;
  }

  /**
   * Valide les données parsées
   */
  validateParsedData(data: ParsedBirsData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.flightNumber || data.flightNumber === 'UNKNOWN') {
      errors.push('Numéro de vol manquant ou invalide');
    }

    if (!data.flightDate) {
      errors.push('Date de vol manquante');
    }

    if (data.items.length === 0) {
      errors.push('Aucun bagage trouvé dans le fichier');
    }

    // Valider chaque item
    data.items.forEach((item, index) => {
      if (!item.bagId || item.bagId.length < 10) {
        errors.push(`Item ${index + 1}: Bag ID invalide`);
      }
      if (!item.passengerName) {
        errors.push(`Item ${index + 1}: Nom passager manquant`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const birsFileParserService = new BirsFileParserService();
