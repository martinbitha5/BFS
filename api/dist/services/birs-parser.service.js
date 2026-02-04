"use strict";
/**
 * Service de parsing des fichiers BIRS pour l'API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.birsParserService = void 0;
const pdf = require('pdf-parse');
class BirsParserService {
    /**
     * Parse un fichier BIRS (PDF, Excel, TXT, CSV)
     */
    async parseFile(fileName, fileContent) {
        const extension = fileName.toLowerCase().split('.').pop() || '';
        console.log(`[BIRS Parser] Parsing ${extension.toUpperCase()} file:`, fileName);
        console.log(`[BIRS Parser] Content length:`, fileContent.length);
        console.log(`[BIRS Parser] Content type:`, typeof fileContent);
        let items = [];
        try {
            switch (extension) {
                case 'pdf':
                    console.log('[BIRS Parser] Calling parsePDF...');
                    items = await this.parsePDF(fileContent);
                    console.log(`[BIRS Parser] parsePDF returned ${items.length} items`);
                    break;
                case 'xlsx':
                case 'xls':
                    console.log('[BIRS Parser] Calling parseExcel...');
                    items = await this.parseExcel(fileContent);
                    break;
                case 'csv':
                    console.log('[BIRS Parser] Calling parseCSV...');
                    items = await this.parseCSV(fileContent);
                    break;
                case 'txt':
                case 'tsv':
                    console.log('[BIRS Parser] Calling parseText...');
                    items = await this.parseText(fileContent);
                    break;
                default:
                    console.warn(`[BIRS Parser] Unknown format: ${extension}`);
            }
        }
        catch (error) {
            console.error('[BIRS Parser] Parse error:', error);
            console.error('[BIRS Parser] Error stack:', error.stack);
        }
        console.log(`[BIRS Parser] Final result: Found ${items.length} bagages`);
        return {
            items,
            totalCount: items.length
        };
    }
    /**
     * Parse un fichier PDF (contenu texte extrait)
     */
    async parsePDF(content) {
        console.log('[BIRS Parser] PDF parsing - content length:', content.length);
        try {
            // Le contenu est en base64, le décoder en Buffer
            let pdfBuffer;
            if (content.startsWith('data:application/pdf;base64,')) {
                const base64 = content.split(',')[1];
                pdfBuffer = Buffer.from(base64, 'base64');
            }
            else {
                // Assumer que c'est déjà du base64
                pdfBuffer = Buffer.from(content, 'base64');
            }
            console.log('[BIRS Parser] PDF buffer size:', pdfBuffer.length);
            // Extraire le texte du PDF
            const data = await pdf(pdfBuffer);
            const text = data.text;
            console.log('[BIRS Parser] Extracted text length:', text.length);
            console.log('[BIRS Parser] Text preview:', text.substring(0, 300));
            // Parser le texte extrait
            return this.parseTextLines(text);
        }
        catch (error) {
            console.error('[BIRS Parser] PDF parsing error:', error);
            // Fallback: essayer de parser comme texte si le contenu ressemble à du texte
            if (content.includes('\n') || content.includes('Bag') || content.includes('TAG')) {
                console.log('[BIRS Parser] Fallback to text parsing');
                return this.parseTextLines(content);
            }
            return [];
        }
    }
    /**
     * Parse un fichier Excel (converti en CSV ou JSON)
     */
    async parseExcel(content) {
        // Essayer de parser comme JSON d'abord
        try {
            const jsonData = JSON.parse(content);
            return this.parseExcelJSON(jsonData);
        }
        catch {
            // Sinon, traiter comme CSV
            return this.parseCSV(content);
        }
    }
    /**
     * Parse Excel JSON
     */
    parseExcelJSON(data) {
        const items = [];
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
    parseExcelRow(row) {
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
    async parseCSV(content) {
        const items = [];
        const lines = content.split(/\r?\n/);
        const separator = content.includes(';') ? ';' : ',';
        // Première ligne = en-têtes
        const headers = lines[0]?.split(separator).map(h => h.trim()) || [];
        // Parser chaque ligne
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line)
                continue;
            const values = line.split(separator).map(v => v.trim());
            const row = {};
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
    async parseText(content) {
        return this.parseTextLines(content);
    }
    /**
     * Parse les lignes de texte pour extraire les bagages
     * Gère plusieurs formats:
     * 1. SITA BagManager: "0DT357756 Prio NBJ FIH MARQUES CAR0044DT 22 Loaded Y" (TAAG Angola, etc.)
     * 2. Format tabulation: "235345230\tEZANDOMPANGI\t0 LOADED Received" (Turkish Airlines, etc.)
     * 3. Single-line: "235345230EZANDOMPANGI0 LOADED Received"
     * 4. Multi-lignes: Tag seul, puis nom sur ligne suivante
     */
    parseTextLines(content) {
        const items = [];
        const lines = content.split(/\r?\n/);
        let parsed = 0;
        let i = 0;
        const processed = new Set(); // Track processed lines
        while (i < lines.length) {
            if (processed.has(i)) {
                i++;
                continue;
            }
            const line = lines[i].trim();
            // Ignorer les lignes vides et très courtes
            if (!line || line.length < 5) {
                i++;
                continue;
            }
            // Ignorer les en-têtes de page et lignes de métadonnées
            if (this.isHeaderLine(line) || line.startsWith('Page ') || line.includes('-- ') || line.includes('Manifeste') || line.includes('Escale') || line.includes('SITA BagManager') || line.startsWith('Departure Flight') || line.startsWith('Bag Information') || line.startsWith('Class Route')) {
                i++;
                continue;
            }
            // =====================================================
            // FORMAT SITA BagManager (TAAG Angola, etc.)
            // Ex: "0DT357756 Prio NBJ FIH MARQUES CAR0044DT 22 Loaded Y"
            // Ex: "0DT356221 Econ CPT* FIH BOKOSO XHYWKW CAR0044DT 1 Loaded	Y"
            // Format: TAG CLASS ORIGIN DEST SURNAME PNR LOCATION SEQ STATUS OK
            // =====================================================
            const sitaMatch = line.match(/^(0[A-Z]{2}\d{6})\s+(Prio|Econ|First|Business)\s+([A-Z]{3}\*?)\s+([A-Z]{3})\s+([A-Z]+)\s+/i);
            if (sitaMatch) {
                const bagId = sitaMatch[1];
                const flightClass = sitaMatch[2];
                const origin = sitaMatch[3].replace('*', '');
                const destination = sitaMatch[4];
                const passengerName = sitaMatch[5];
                // Extraire le statut
                const loaded = line.toUpperCase().includes('LOADED');
                const notLoaded = line.toUpperCase().includes('NOT-LOADED') || line.toUpperCase().includes('NOT LOADED');
                const expected = line.toUpperCase().includes('EXPECTED');
                // Extraire le PNR (6 caractères alphanumériques après le nom)
                const pnrMatch = line.match(/[A-Z]+\s+([A-Z0-9]{5,7})\s+/i);
                const pnr = pnrMatch ? pnrMatch[1] : undefined;
                items.push({
                    bagId: bagId,
                    passengerName: passengerName,
                    class: flightClass,
                    route: `${origin}-${destination}`,
                    pnr: pnr,
                    loaded: loaded && !notLoaded,
                    received: loaded && !notLoaded
                });
                parsed++;
                processed.add(i);
                i++;
                continue;
            }
            // =====================================================
            // FORMAT 2: Colonnes séparées par tabulation ou espaces multiples
            // Ex: "235345230\tEZANDOMPANGI\t0 LOADED Received"
            // Ex: "235345230    EZANDOMPANGI    0 LOADED Received"
            // =====================================================
            const columns = line.split(/\t+|\s{2,}/);
            if (columns.length >= 2) {
                const firstCol = columns[0].trim();
                const secondCol = columns[1]?.trim() || '';
                const restOfLine = columns.slice(2).join(' ').trim();
                // Vérifier si la première colonne est un tag valide (6-13 chiffres)
                if (/^\d{6,13}$/.test(firstCol) && secondCol.length >= 2 && /^[A-Z]/i.test(secondCol)) {
                    // Ignorer les entrées ZZZZZZ (bagages inconnus)
                    if (secondCol.toUpperCase() === 'ZZZZZZ' || secondCol.toUpperCase() === 'UNKNOWN') {
                        i++;
                        continue;
                    }
                    const bagId = firstCol;
                    const passengerName = secondCol.replace(/\s+/g, ' ');
                    // Extraire le poids et les statuts du reste de la ligne
                    let weight = 0;
                    let loaded = false;
                    let received = false;
                    const weightMatch = restOfLine.match(/^(\d+)/);
                    if (weightMatch) {
                        weight = parseInt(weightMatch[1]);
                    }
                    loaded = restOfLine.toUpperCase().includes('LOADED');
                    received = restOfLine.toUpperCase().includes('RECEIVED');
                    items.push({
                        bagId: bagId,
                        passengerName: passengerName,
                        weight: weight || undefined,
                        loaded: loaded,
                        received: received
                    });
                    parsed++;
                    processed.add(i);
                    i++;
                    continue;
                }
            }
            // =====================================================
            // FORMAT 2: Single-line sans séparateur (TAG + NAME collés)
            // Ex: "235345230EZANDOMPANGI0 LOADED Received"
            // =====================================================
            let match = line.match(/^(\d{9})([A-Z]+?)(\d+)\s+(LOADED|RECEIVED|UNLOADED|ACCEPTED|REJECTED)(.*)$/i);
            if (match && match[2].length >= 2) {
                const bagId = match[1];
                const passengerName = match[2].trim().replace(/\s+/g, ' ');
                const weight = parseInt(match[3]);
                const status1 = match[4];
                items.push({
                    bagId: bagId,
                    passengerName: passengerName,
                    weight: weight || undefined,
                    loaded: status1?.toUpperCase().includes('LOADED'),
                    received: status1?.toUpperCase().includes('RECEIVED')
                });
                parsed++;
                processed.add(i);
                i++;
                continue;
            }
            // =====================================================
            // FORMAT 3: Multi-lignes (Tag seul sur une ligne)
            // =====================================================
            match = line.match(/^(\d{9,13})\s*$/);
            if (match) {
                const bagId = match[1];
                let passengerName = '';
                let weight = 0;
                let loaded = false;
                let received = false;
                // Lire les lignes suivantes pour ce bagage
                let j = i + 1;
                let linesRead = 0;
                while (j < lines.length && linesRead < 10) {
                    const nextLine = lines[j].trim();
                    // Si on trouve un nouveau tag, arrêter
                    if (nextLine.match(/^\d{9,13}\s*$/)) {
                        break;
                    }
                    // Extraire le nom du passager (ligne avec des lettres majuscules)
                    if (!passengerName && nextLine.match(/^[A-Z\/\s\-']{2,}$/)) {
                        passengerName = nextLine;
                    }
                    // Extraire le poids
                    const weightMatch = nextLine.match(/(\d+)\s*$/);
                    if (weightMatch && !weight) {
                        weight = parseInt(weightMatch[1]);
                    }
                    // Vérifier LOADED et Received
                    if (nextLine.includes('LOADED')) {
                        loaded = true;
                    }
                    if (nextLine.includes('Received')) {
                        received = true;
                    }
                    j++;
                    linesRead++;
                }
                // Créer l'item si on a au moins un nom
                if (passengerName) {
                    items.push({
                        bagId: bagId,
                        passengerName: passengerName,
                        weight: weight || undefined,
                        loaded: loaded,
                        received: received
                    });
                    parsed++;
                }
                // Mark all processed lines
                for (let k = i; k < j; k++) {
                    processed.add(k);
                }
                i = j; // Sauter au prochain tag potentiel
            }
            else {
                i++;
            }
        }
        console.log(`[BIRS Parser] Parse complete - Total lines: ${lines.length}, Parsed bags: ${parsed}`);
        return items;
    }
    /**
     * Parse une ligne de texte
     * Formats supportés:
     * - "ET1234567890 DUPONT/JEAN [ABC123] [12A] [Y] [23KG]" (avec espaces)
     * - "235345230EZANDOMPANGI0 LOADED Received" (sans espaces entre TAG et NAME - Turkish Airlines PDF format)
     */
    parseTextLine(line) {
        const trimmed = line.trim();
        // Skip lignes vides ou en-têtes
        // Ligne minimum: Bag ID (9 chars) + nom (2 chars) = 11 chars
        if (!trimmed || trimmed.length < 11 || this.isHeaderLine(trimmed)) {
            return null;
        }
        let bagId;
        let passengerName;
        let restOfLine;
        // Format 1: Avec espace après TAG - "ET1234567890 DUPONT/JEAN..."
        let match = trimmed.match(/^([A-Z0-9]{9,13})\s+(.+)$/i);
        if (match) {
            bagId = match[1].trim();
            restOfLine = match[2].trim();
            // Extraire le nom (tout jusqu'au premier code PNR potentiel ou fin)
            // Nom peut contenir: lettres, /, espaces
            const namePattern = /^([A-Z\/\s\-']+?)(?:\s+([A-Z0-9]{5,7}))?(?:\s+(\d{1,3}[A-Z]))?(?:\s+([A-Z]))?(?:\s+(\d+\.?\d*)\s*KG)?/i;
            const nameMatch = restOfLine.match(namePattern);
            if (nameMatch) {
                const extractedName = nameMatch[1].trim().replace(/\s+/g, ' ');
                // Ne garder que les noms qui ont au moins 2 caractères
                if (extractedName.length < 2) {
                    return null;
                }
                return {
                    bagId: bagId,
                    passengerName: extractedName,
                    pnr: nameMatch[2]?.trim(),
                    seatNumber: nameMatch[3]?.trim(),
                    class: nameMatch[4]?.trim(),
                    weight: this.parseWeight(nameMatch[5])
                };
            }
            // Fallback: Bag ID + tout le reste comme nom
            if (restOfLine.length >= 2) {
                const simpleName = restOfLine.split(/\s+/);
                let fallbackName = simpleName[0];
                // Essayer d'ajouter le deuxième mot si ça ressemble à un nom
                if (simpleName.length > 1 && /^[A-Z\/\-']+$/i.test(simpleName[1])) {
                    fallbackName += ' ' + simpleName[1];
                }
                if (fallbackName.length >= 2) {
                    return {
                        bagId: bagId,
                        passengerName: fallbackName.trim().replace(/\s+/g, ' ')
                    };
                }
            }
            return null;
        }
        // Format 2: Sans espace - "235345230EZANDOMPANGI0 LOADED Received"
        // Pattern: 9 digits + letters (name) + digit (weight) + status words
        match = trimmed.match(/^(\d{9})([A-Z]+?)(\d+)\s+(LOADED|RECEIVED|UNLOADED|ACCEPTED|REJECTED)(.*)$/i);
        if (match && match[2].length >= 2) {
            bagId = match[1];
            passengerName = match[2].trim().replace(/\s+/g, ' ');
            const weight = match[3];
            const status1 = match[4];
            return {
                bagId: bagId,
                passengerName: passengerName,
                weight: weight ? parseInt(weight) : undefined,
                loaded: status1?.toUpperCase().includes('LOADED'),
                received: status1?.toUpperCase().includes('RECEIVED')
            };
        }
        return null;
    }
    /**
     * Extrait une valeur depuis un objet avec plusieurs clés possibles
     */
    extractValue(obj, possibleKeys) {
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
    isHeaderLine(line) {
        const upperLine = line.toUpperCase();
        // En-têtes évidents (lignes qui contiennent principalement des mots-clés)
        const headerKeywords = [
            'BAGGAGE LIST', 'PASSENGER LIST', 'MANIFEST',
            '---', '===', '___', '***',
            'PAGE', 'TOTAL', 'REPORT', 'SUMMARY'
        ];
        // Si la ligne contient un de ces mots-clés évidents, c'est un en-tête
        if (headerKeywords.some(keyword => upperLine.includes(keyword))) {
            return true;
        }
        // Si la ligne est très courte (< 15 chars), probablement un en-tête
        if (line.trim().length < 15) {
            return true;
        }
        // Si la ligne contient "BAG ID" + "PASSENGER" ensemble, c'est un en-tête de colonne
        if (upperLine.includes('BAG') && upperLine.includes('PASSENGER')) {
            return true;
        }
        // Si la ligne ne commence pas par un code alphanumérique de 10+ chars, 
        // et contient des mots comme "FLIGHT", "DATE", c'est probablement un en-tête
        if (!/^[A-Z0-9]{10}/.test(line) && (upperLine.includes('FLIGHT') || upperLine.includes('DATE'))) {
            return true;
        }
        return false;
    }
    /**
     * Vérifie si une ligne Excel est un en-tête
     */
    isHeaderRow(row) {
        if (typeof row === 'object') {
            const values = Object.values(row).join(' ').toUpperCase();
            return this.isHeaderLine(values);
        }
        return false;
    }
    /**
     * Vérifie si une ligne Excel est vide
     */
    isEmptyRow(row) {
        if (typeof row === 'object') {
            return Object.values(row).every(v => !v || v === '');
        }
        return true;
    }
    /**
     * Parse le poids depuis différents formats
     */
    parseWeight(value) {
        if (!value)
            return undefined;
        const str = value.toString().toUpperCase().replace(/[KG\s]/g, '');
        const num = parseFloat(str);
        return isNaN(num) ? undefined : num;
    }
    /**
     * Parse un booléen depuis différents formats
     */
    parseBoolean(value) {
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
exports.birsParserService = new BirsParserService();
