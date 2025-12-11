/**
 * Service de parsing des fichiers BIRS pour l'API
 */

interface BirsItem {
  bagId: string;
  passengerName: string;
  pnr?: string;
  seatNumber?: string;
  class?: string;
  psn?: string;
  weight?: number;
  route?: string;
  categories?: string;
  loaded?: boolean;
  received?: boolean;
}

interface ParsedBirsFile {
  items: BirsItem[];
  totalCount: number;
}

class BirsParserService {
  /**
   * Parse un fichier BIRS (PDF, Excel, TXT, CSV)
   */
  async parseFile(fileName: string, fileContent: string): Promise<ParsedBirsFile> {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    
    console.log(`[BIRS Parser] Parsing ${extension.toUpperCase()} file:`, fileName);

    let items: BirsItem[] = [];

    try {
      switch (extension) {
        case 'pdf':
          items = await this.parsePDF(fileContent);
          break;
        case 'xlsx':
        case 'xls':
          items = await this.parseExcel(fileContent);
          break;
        case 'csv':
          items = await this.parseCSV(fileContent);
          break;
        case 'txt':
        case 'tsv':
          items = await this.parseText(fileContent);
          break;
        default:
          console.warn(`[BIRS Parser] Unknown format: ${extension}`);
      }
    } catch (error) {
      console.error('[BIRS Parser] Parse error:', error);
    }

    console.log(`[BIRS Parser] Found ${items.length} bagages`);

    return {
      items,
      totalCount: items.length
    };
  }

  /**
   * Parse un fichier PDF (contenu texte extrait)
   */
  private async parsePDF(content: string): Promise<BirsItem[]> {
    // Si le contenu est en base64, le décoder
    if (content.startsWith('data:application/pdf;base64,')) {
      const base64 = content.split(',')[1];
      content = Buffer.from(base64, 'base64').toString('utf-8');
    }

    return this.parseTextLines(content);
  }

  /**
   * Parse un fichier Excel (converti en CSV ou JSON)
   */
  private async parseExcel(content: string): Promise<BirsItem[]> {
    // Essayer de parser comme JSON d'abord
    try {
      const jsonData = JSON.parse(content);
      return this.parseExcelJSON(jsonData);
    } catch {
      // Sinon, traiter comme CSV
      return this.parseCSV(content);
    }
  }

  /**
   * Parse Excel JSON
   */
  private parseExcelJSON(data: any): BirsItem[] {
    const items: BirsItem[] = [];
    const rows = Array.isArray(data) ? data : (data.data || []);

    for (const row of rows) {
      if (this.isHeaderRow(row) || this.isEmptyRow(row)) {
        continue;
      }

      const item = this.parseExcelRow(row);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Parse une ligne Excel
   */
  private parseExcelRow(row: any): BirsItem | null {
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
   * Parse un fichier CSV
   */
  private async parseCSV(content: string): Promise<BirsItem[]> {
    const items: BirsItem[] = [];
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

      const item = this.parseExcelRow(row);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Parse un fichier texte
   */
  private async parseText(content: string): Promise<BirsItem[]> {
    return this.parseTextLines(content);
  }

  /**
   * Parse les lignes de texte pour extraire les bagages
   */
  private parseTextLines(content: string): BirsItem[] {
    const items: BirsItem[] = [];
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
   * Parse une ligne de texte
   * Format: "ET1234567890 DUPONT/JEAN ABC123 12A Y 23KG"
   */
  private parseTextLine(line: string): BirsItem | null {
    const trimmed = line.trim();
    
    // Skip lignes vides ou en-têtes
    if (!trimmed || trimmed.length < 10 || this.isHeaderLine(trimmed)) {
      return null;
    }

    // Pattern: Tag(10-13 chars) Nom PNR Siège Classe Poids
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

    // Fallback: au minimum Bag ID et nom
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
   * Vérifie si une ligne est un en-tête
   */
  private isHeaderLine(line: string): boolean {
    const upperLine = line.toUpperCase();
    const headerKeywords = [
      'BAG ID', 'TAG', 'PASSENGER', 'NAME', 'PNR', 'SEAT', 'CLASS',
      'WEIGHT', 'ROUTE', 'FLIGHT', 'DATE', '---', '===', 'BAGGAGE LIST',
      'REPORT', 'BIRS', 'MANIFEST'
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
}

export const birsParserService = new BirsParserService();
