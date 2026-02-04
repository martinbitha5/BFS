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
            // Vérifier si c'est bien un PDF (signature %PDF)
            const pdfSignature = pdfBuffer.slice(0, 5).toString('ascii');
            console.log('[BIRS Parser] PDF signature:', pdfSignature);
            if (!pdfSignature.startsWith('%PDF')) {
                console.warn('[BIRS Parser] Invalid PDF signature, trying as text...');
                // Essayer de décoder comme UTF-8 et parser comme texte
                const textContent = pdfBuffer.toString('utf-8');
                if (textContent.includes('0') && textContent.length > 100) {
                    return this.parseTextLines(textContent);
                }
                return [];
            }
            // Extraire le texte du PDF
            const data = await pdf(pdfBuffer);
            const text = data.text;
            console.log('[BIRS Parser] Extracted text length:', text.length);
            console.log('[BIRS Parser] Text preview (first 500 chars):', text.substring(0, 500));
            console.log('[BIRS Parser] Text preview (sample lines):', text.split('\n').slice(0, 10).join(' | '));
            // Parser le texte extrait
            const items = this.parseTextLines(text);
            // Si aucun item trouvé, essayer avec des patterns alternatifs
            if (items.length === 0) {
                console.log('[BIRS Parser] No items found with primary parser, trying SITA-specific parser...');
                const sitaItems = this.parseSitaBagManagerText(text);
                if (sitaItems.length > 0) {
                    console.log(`[BIRS Parser] SITA parser found ${sitaItems.length} items`);
                    return sitaItems;
                }
            }
            return items;
        }
        catch (error) {
            console.error('[BIRS Parser] PDF parsing error:', error?.message || error);
            console.error('[BIRS Parser] Error stack:', error?.stack);
            // Fallback: essayer de décoder le base64 et parser comme texte brut
            try {
                console.log('[BIRS Parser] Trying fallback: decode base64 and parse as text...');
                let textContent = '';
                if (content.startsWith('data:application/pdf;base64,')) {
                    const base64 = content.split(',')[1];
                    textContent = Buffer.from(base64, 'base64').toString('utf-8');
                }
                else {
                    textContent = Buffer.from(content, 'base64').toString('utf-8');
                }
                // Chercher des patterns de tags bagages dans le contenu brut
                const items = this.parseSitaBagManagerText(textContent);
                if (items.length > 0) {
                    console.log(`[BIRS Parser] Fallback found ${items.length} items`);
                    return items;
                }
            }
            catch (fallbackError) {
                console.error('[BIRS Parser] Fallback also failed:', fallbackError);
            }
            return [];
        }
    }
    /**
     * Parser spécifique pour le format SITA BagManager
     * Format: 0XX123456 Class Origin Dest Surname PNR ... Status
     * Ex: 0DT352712 Prio JNB* BZV MAHOUASSA 88VXQ4 Expected
     */
    parseSitaBagManagerText(text) {
        const items = [];
        // Pattern pour les tags SITA: 0 + 2 lettres + 5-7 chiffres
        // Plus flexible: peut être suivi de n'importe quoi
        const tagPattern = /\b(0[A-Z]{2}\d{5,7})\b/gi;
        // Trouver tous les tags dans le texte
        const matches = text.matchAll(tagPattern);
        const foundTags = new Set();
        for (const match of matches) {
            const tag = match[0].toUpperCase();
            // Éviter les doublons
            if (foundTags.has(tag))
                continue;
            foundTags.add(tag);
            // Extraire le contexte autour du tag (200 caractères après)
            const startIndex = match.index || 0;
            const context = text.substring(startIndex, startIndex + 300);
            // Extraire les informations du contexte
            const parts = context.split(/[\s\t\n]+/).filter(p => p.length > 0);
            let passengerName = '';
            let flightClass = '';
            let origin = '';
            let destination = '';
            let pnr = '';
            let loaded = false;
            let received = false;
            // Parcourir les parties après le tag
            for (let i = 1; i < Math.min(parts.length, 15); i++) {
                const part = parts[i];
                // Ignorer les parties trop courtes
                if (part.length < 2)
                    continue;
                // Classe de vol
                if (/^(Prio|Priority|Econ|Economy|First|Business|J|C|Y|F)$/i.test(part) && !flightClass) {
                    flightClass = part;
                    continue;
                }
                // Code aéroport (3 lettres, peut avoir *)
                if (/^[A-Z]{3}\*?$/i.test(part)) {
                    if (!origin) {
                        origin = part.replace('*', '');
                        continue;
                    }
                    else if (!destination) {
                        destination = part;
                        continue;
                    }
                }
                // Nom du passager (lettres majuscules, 3+ caractères, pas un code aéroport)
                if (/^[A-Z]{3,}$/i.test(part) && !passengerName && destination) {
                    // Vérifier que ce n'est pas un mot-clé
                    const keywords = ['EXPECTED', 'LOADED', 'RECEIVED', 'OFFLOAD', 'RELABEL', 'REFLIGHT', 'ROUTE', 'CAR'];
                    if (!keywords.some(kw => part.toUpperCase().includes(kw))) {
                        passengerName = part;
                        continue;
                    }
                }
                // PNR (5-7 caractères alphanumériques)
                if (/^[A-Z0-9]{5,7}$/i.test(part) && passengerName && !pnr) {
                    // Vérifier que ce n'est pas un mot-clé ou un code commençant par CAR
                    if (!part.toUpperCase().startsWith('CAR') && !/^[A-Z]{5,7}$/.test(part)) {
                        pnr = part;
                    }
                    continue;
                }
                // Statut
                if (part.toUpperCase() === 'LOADED') {
                    loaded = true;
                }
                if (part.toUpperCase() === 'RECEIVED') {
                    received = true;
                }
                // Si on a trouvé un autre tag, arrêter
                if (/^0[A-Z]{2}\d{5,7}$/i.test(part)) {
                    break;
                }
            }
            // Vérifier les statuts dans le contexte complet
            const upperContext = context.toUpperCase();
            if (upperContext.includes('LOADED') && !upperContext.includes('NOT-LOADED') && !upperContext.includes('NOT LOADED')) {
                loaded = true;
            }
            if (upperContext.includes('RECEIVED')) {
                received = true;
            }
            // Ajouter l'item si on a au moins un nom de passager
            if (passengerName && passengerName.length >= 2) {
                items.push({
                    bagId: tag,
                    passengerName: passengerName,
                    class: flightClass || undefined,
                    route: origin && destination ? `${origin}-${destination}` : undefined,
                    pnr: pnr || undefined,
                    loaded: loaded,
                    received: received || loaded
                });
            }
            else {
                // Même sans nom, créer un item basique avec le tag
                // Essayer de trouver un nom dans le contexte
                const nameMatch = context.match(/(?:Prio|Econ|First|Business|J|C|Y|F)\s+[A-Z]{3}\*?\s+[A-Z]{3}\s+([A-Z]{3,})/i);
                if (nameMatch) {
                    items.push({
                        bagId: tag,
                        passengerName: nameMatch[1],
                        loaded: loaded,
                        received: received || loaded
                    });
                }
            }
        }
        console.log(`[BIRS Parser] SITA parser extracted ${items.length} unique tags`);
        return items;
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
        console.log(`[BIRS Parser] parseTextLines - Processing ${lines.length} lines`);
        console.log(`[BIRS Parser] First 5 lines:`, lines.slice(0, 5).map(l => l.substring(0, 80)));
        let parsed = 0;
        let i = 0;
        const processed = new Set(); // Track processed lines
        const foundTags = new Set(); // Éviter les doublons
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
            // Pattern plus flexible: Tag commence par 0 + 2 lettres + 5-7 chiffres
            // Peut être au début de la ligne ou après des espaces
            const sitaTagMatch = line.match(/^[\s]*(0[A-Z]{2}\d{5,7})[\s\t]+/i);
            if (sitaTagMatch) {
                const bagId = sitaTagMatch[1].toUpperCase();
                // Éviter les doublons
                if (foundTags.has(bagId)) {
                    i++;
                    continue;
                }
                const restOfLine = line.substring(sitaTagMatch[0].length);
                // Extraire les parties: Class Route Surname...
                const parts = restOfLine.split(/[\s\t]+/).filter(p => p.length > 0);
                console.log(`[BIRS Parser] Found SITA tag: ${bagId}, parts: ${parts.slice(0, 8).join(', ')}`);
                // Chercher la classe (Prio, Econ, First, Business)
                let flightClass = '';
                let passengerName = '';
                let origin = '';
                let destination = '';
                let pnr = '';
                // Mots-clés à ignorer pour le nom de passager
                const keywords = ['EXPECTED', 'LOADED', 'RECEIVED', 'OFFLOAD', 'RELABEL', 'REFLIGHT', 'ROUTE', 'CAR', 'NOT', 'ON', 'TO', 'DEST'];
                for (let p = 0; p < parts.length; p++) {
                    const part = parts[p];
                    // Ignorer les parties vides ou très courtes
                    if (!part || part.length < 1)
                        continue;
                    // Classe
                    if (/^(Prio|Priority|Econ|Economy|First|Business|J|C|Y|F)$/i.test(part) && !flightClass) {
                        flightClass = part;
                        continue;
                    }
                    // Route (3 lettres, peut avoir *)
                    if (/^[A-Z]{3}\*?$/i.test(part) && !origin) {
                        origin = part.replace('*', '');
                        continue;
                    }
                    if (/^[A-Z]{3}$/i.test(part) && origin && !destination) {
                        destination = part;
                        continue;
                    }
                    // Nom passager (lettres majuscules, au moins 3 caractères)
                    // Doit venir après la destination et ne pas être un mot-clé
                    if (/^[A-Z]{3,}$/i.test(part) && destination && !passengerName) {
                        const upperPart = part.toUpperCase();
                        if (!keywords.some(kw => upperPart === kw || upperPart.startsWith(kw))) {
                            passengerName = part;
                            continue;
                        }
                    }
                    // PNR (5-7 caractères alphanumériques, mélange lettres/chiffres)
                    if (/^[A-Z0-9]{5,7}$/i.test(part) && passengerName && !pnr) {
                        // Vérifier que ce n'est pas juste des lettres (mot-clé) ou commence par CAR
                        const upperPart = part.toUpperCase();
                        if (!upperPart.startsWith('CAR') && !/^[A-Z]{5,7}$/.test(part)) {
                            pnr = part;
                            continue;
                        }
                    }
                    // Si on trouve un autre tag SITA, arrêter
                    if (/^0[A-Z]{2}\d{5,7}$/i.test(part)) {
                        break;
                    }
                }
                // Si on a au moins un tag et un nom de passager
                if (passengerName && passengerName.length >= 2) {
                    // Extraire le statut
                    const upperLine = line.toUpperCase();
                    const loaded = upperLine.includes('LOADED') && !upperLine.includes('NOT-LOADED') && !upperLine.includes('NOT LOADED');
                    foundTags.add(bagId);
                    items.push({
                        bagId: bagId,
                        passengerName: passengerName,
                        class: flightClass || undefined,
                        route: origin && destination ? `${origin}-${destination}` : undefined,
                        pnr: pnr || undefined,
                        loaded: loaded,
                        received: loaded
                    });
                    parsed++;
                    processed.add(i);
                    console.log(`[BIRS Parser] Added bag: ${bagId} - ${passengerName} (loaded: ${loaded})`);
                    i++;
                    continue;
                }
                else {
                    console.log(`[BIRS Parser] Tag ${bagId} skipped: no passenger name found (parts: ${parts.join(', ')})`);
                }
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
        console.log(`[BIRS Parser] Parse complete - Total lines: ${lines.length}, Parsed bags: ${parsed}, Unique tags: ${foundTags.size}`);
        // Si aucun item trouvé, log pour debug
        if (items.length === 0) {
            console.log('[BIRS Parser] WARNING: No items parsed! Checking content...');
            // Chercher des patterns de tags dans tout le contenu
            const allTagMatches = content.match(/0[A-Z]{2}\d{5,7}/gi);
            if (allTagMatches) {
                console.log(`[BIRS Parser] Found ${allTagMatches.length} potential tags in raw content: ${allTagMatches.slice(0, 5).join(', ')}...`);
            }
            else {
                console.log('[BIRS Parser] No SITA tag patterns found in content');
            }
        }
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
