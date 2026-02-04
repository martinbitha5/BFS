/**
 * Service de parsing des fichiers BIRS pour l'API
 */

const pdf = require('pdf-parse') as any;

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
    console.log(`[BIRS Parser] Content length:`, fileContent.length);
    console.log(`[BIRS Parser] Content type:`, typeof fileContent);

    let items: BirsItem[] = [];

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
    } catch (error: any) {
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
  private async parsePDF(content: string): Promise<BirsItem[]> {
    console.log('[BIRS Parser] PDF parsing - content length:', content.length);
    
    try {
      // Le contenu est en base64, le décoder en Buffer
      let pdfBuffer: Buffer;
      
      if (content.startsWith('data:application/pdf;base64,')) {
        const base64 = content.split(',')[1];
        pdfBuffer = Buffer.from(base64, 'base64');
      } else {
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
    } catch (error: any) {
      console.error('[BIRS Parser] PDF parsing error:', error?.message || error);
      console.error('[BIRS Parser] Error stack:', error?.stack);
      
      // Fallback: essayer de décoder le base64 et parser comme texte brut
      try {
        console.log('[BIRS Parser] Trying fallback: decode base64 and parse as text...');
        let textContent = '';
        
        if (content.startsWith('data:application/pdf;base64,')) {
          const base64 = content.split(',')[1];
          textContent = Buffer.from(base64, 'base64').toString('utf-8');
        } else {
          textContent = Buffer.from(content, 'base64').toString('utf-8');
        }
        
        // Chercher des patterns de tags bagages dans le contenu brut
        const items = this.parseSitaBagManagerText(textContent);
        if (items.length > 0) {
          console.log(`[BIRS Parser] Fallback found ${items.length} items`);
          return items;
        }
      } catch (fallbackError) {
        console.error('[BIRS Parser] Fallback also failed:', fallbackError);
      }
      
      return [];
    }
  }

  /**
   * Parser spécifique pour le format SITA BagManager
   * GÈRE LE FORMAT CONCATÉNÉ (pdf-parse supprime souvent les espaces)
   * Ex: 0DT352712PrioJNB* BZVMAHOUASSA88VXQ4Expected
   */
  private parseSitaBagManagerText(text: string): BirsItem[] {
    const items: BirsItem[] = [];
    
    // Pattern pour les tags SITA: 0 + 2 lettres + 5-7 chiffres
    const tagPattern = /(0[A-Z]{2}\d{5,7})/gi;
    
    // Trouver tous les tags dans le texte
    const allMatches = [...text.matchAll(tagPattern)];
    const foundTags = new Set<string>();
    
    console.log(`[BIRS Parser SITA] Found ${allMatches.length} potential tags`);
    
    for (let m = 0; m < allMatches.length; m++) {
      const match = allMatches[m];
      const tag = match[1].toUpperCase();
      
      // Éviter les doublons
      if (foundTags.has(tag)) continue;
      
      const startIndex = (match.index || 0) + tag.length;
      
      // Trouver la fin du contexte (jusqu'au prochain tag ou 150 chars)
      let endIndex = startIndex + 150;
      if (m + 1 < allMatches.length && allMatches[m + 1].index) {
        endIndex = Math.min(endIndex, allMatches[m + 1].index);
      }
      
      // Extraire le contexte après le tag
      const afterTag = text.substring(startIndex, endIndex);
      
      let passengerName = '';
      let flightClass = '';
      let origin = '';
      let destination = '';
      let pnr = '';
      
      // PATTERN CONCATÉNÉ: PrioJNB* BZVMAHOUASSA88VXQ4Expected
      // Format: [Class][Origin*][ ][Dest][Surname][PNR][Status]
      // Exemple: "PrioJNB* BZVMAHOUASSA88VXQ4Expected"
      const concatPattern = /^(Prio|Priority|Econ|Economy|First|Business)?([A-Z]{3}\*?)[\s]*([A-Z]{3})([A-Z]{3,})([A-Z0-9]{5,8})?(Expected|Loaded|Not-Loaded|NotLoaded|Received|Y|N)?/i;
      const concatMatch = afterTag.match(concatPattern);
      
      if (concatMatch) {
        flightClass = concatMatch[1] || '';
        origin = (concatMatch[2] || '').replace('*', '');
        destination = concatMatch[3] || '';
        
        // Le groupe 4 contient le nom + potentiellement le PNR collé
        let nameAndMaybePnr = concatMatch[4] || '';
        
        // Vérifier si un PNR est collé à la fin du nom
        // Un PNR contient des chiffres, un nom non
        const pnrInName = nameAndMaybePnr.match(/^([A-Z]+?)([A-Z0-9]*\d[A-Z0-9]*)$/i);
        if (pnrInName && pnrInName[1].length >= 3) {
          passengerName = pnrInName[1];
          // Le PNR peut être dans group 2 ou dans concatMatch[5]
          if (pnrInName[2] && pnrInName[2].length >= 5) {
            pnr = pnrInName[2];
          } else if (concatMatch[5]) {
            pnr = concatMatch[5];
          }
        } else if (nameAndMaybePnr.length >= 3) {
          passengerName = nameAndMaybePnr;
          if (concatMatch[5]) {
            pnr = concatMatch[5];
          }
        }
        
        // Nettoyer le nom: enlever les suffixes de statut
        const statusSuffixes = ['EXPECTED', 'LOADED', 'RECEIVED', 'NOTLOADED'];
        for (const suffix of statusSuffixes) {
          if (passengerName.toUpperCase().endsWith(suffix)) {
            passengerName = passengerName.slice(0, -suffix.length);
          }
        }
        
        // Nettoyer le PNR: enlever s'il commence par CAR (c'est un numéro de container)
        if (pnr && pnr.toUpperCase().startsWith('CAR')) {
          pnr = '';
        }
      }
      
      // Vérifier les statuts
      const upperContext = afterTag.toUpperCase();
      const loaded = (upperContext.includes('LOADED') || upperContext.includes('Y')) && 
                     !upperContext.includes('NOT-LOADED') && !upperContext.includes('NOTLOADED');
      
      // Ajouter l'item si on a un nom valide
      if (passengerName && passengerName.length >= 3) {
        foundTags.add(tag);
        items.push({
          bagId: tag,
          passengerName: passengerName,
          class: flightClass || undefined,
          route: origin && destination ? `${origin}-${destination}` : undefined,
          pnr: pnr || undefined,
          loaded: loaded,
          received: loaded
        });
        console.log(`[BIRS Parser SITA] Added: ${tag} - ${passengerName} (${origin}-${destination})`);
      } else {
        console.log(`[BIRS Parser SITA] Skipped ${tag}: name="${passengerName}" from "${afterTag.substring(0, 40)}..."`);
      }
    }
    
    console.log(`[BIRS Parser] SITA parser extracted ${items.length} unique bags`);
    return items;
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
   * Gère plusieurs formats:
   * 1. SITA BagManager: "0DT357756 Prio NBJ FIH MARQUES CAR0044DT 22 Loaded Y" (TAAG Angola, etc.)
   * 2. Format tabulation: "235345230\tEZANDOMPANGI\t0 LOADED Received" (Turkish Airlines, etc.)
   * 3. Single-line: "235345230EZANDOMPANGI0 LOADED Received"
   * 4. Multi-lignes: Tag seul, puis nom sur ligne suivante
   */
  private parseTextLines(content: string): BirsItem[] {
    const items: BirsItem[] = [];
    const lines = content.split(/\r?\n/);
    
    console.log(`[BIRS Parser] parseTextLines - Processing ${lines.length} lines`);
    console.log(`[BIRS Parser] First 5 lines:`, lines.slice(0, 5).map(l => l.substring(0, 80)));
    
    let parsed = 0;
    let i = 0;
    const processed = new Set<number>(); // Track processed lines
    const foundTags = new Set<string>(); // Éviter les doublons

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
      // ATTENTION: pdf-parse peut concaténer les colonnes sans espaces!
      // Ex: "0DT357756PrioNBJ FIHMARQUESCAR0044DT22LoadedY"
      // Ex: "0DT356221EconCPT* FIHBOKOSOXHYWKWCAR0044DT1LoadedY"
      // Format: TAG+CLASS+ORIGIN DEST+SURNAME+PNR+LOCATION+SEQ+STATUS+OK
      // =====================================================
      
      // Pattern flexible: Tag commence par 0 + 2 lettres + 5-7 chiffres
      // SANS exiger d'espace après (car pdf-parse les supprime souvent)
      const sitaTagMatch = line.match(/^[\s]*(0[A-Z]{2}\d{5,7})/i);
      
      if (sitaTagMatch) {
        const bagId = sitaTagMatch[1].toUpperCase();
        
        // Éviter les doublons
        if (foundTags.has(bagId)) {
          i++;
          continue;
        }
        
        // Le reste de la ligne après le tag (peut être collé ou avec espace)
        const restOfLine = line.substring(sitaTagMatch[0].length);
        
        console.log(`[BIRS Parser] Found SITA tag: ${bagId}, rest: "${restOfLine.substring(0, 60)}..."`);
        
        // Parser le format concaténé SITA
        // Pattern: (Prio|Econ)(ORIGIN*? DEST)(SURNAME)(PNR)(reste...)
        let flightClass = '';
        let passengerName = '';
        let origin = '';
        let destination = '';
        let pnr = '';
        
        // Parser le format SITA BagManager concaténé étape par étape
        // Format: [CLASS][ORIGIN*?] [DEST][SURNAME][PNR/CAR][STATUS]
        // Ex: "PrioJNB* BZVMAHOUASSA88VXQ4Expected"
        // Ex: "EconNBJ FIHMARQUESCAR0044DT22LoadedY"
        
        let remaining = restOfLine;
        
        // 1. Extraire la classe (optionnel, 4-8 caractères au début)
        const classMatch = remaining.match(/^(Prio|Priority|Econ|Economy|First|Business)/i);
        if (classMatch) {
          flightClass = classMatch[1];
          remaining = remaining.substring(classMatch[0].length);
        }
        
        // 2. Extraire l'origine (3 lettres + optionnel *) suivie d'un ESPACE puis destination (3 lettres)
        // Pattern: "JNB* BZV" ou "NBJ FIH" ou "CPT* FIH"
        const routeMatch = remaining.match(/^([A-Z]{3}\*?)\s+([A-Z]{3})/i);
        
        if (routeMatch) {
          origin = routeMatch[1].replace('*', '');
          destination = routeMatch[2];
          remaining = remaining.substring(routeMatch[0].length);
          
          // 3. Extraire le nom du passager
          // Le nom est collé juste après la destination
          // Ex: "MAHOUASSA88VXQ4Expected" -> MAHOUASSA + PNR: 88VXQ4
          // Ex: "LODIBRE2OTExpected" -> LODI + PNR: BRE2OT (attention: le PNR peut commencer par des lettres!)
          // Ex: "MARQUESCAR0044DT22LoadedY" -> MARQUES + CAR0044DT
          
          // Stratégie: le nom est la partie qui ne contient QUE des lettres avant:
          // 1. Un chiffre (début du PNR ou numéro)
          // 2. "CAR" (début du numéro de container)
          // 3. Un mot de statut
          
          // D'abord, extraire tout ce qui est lettres
          const allLettersMatch = remaining.match(/^([A-Z]+)/i);
          
          if (allLettersMatch) {
            let allLetters = allLettersMatch[1];
            let candidateName = allLetters;
            
            // Couper au premier CAR (numéro de container)
            const carIndex = allLetters.toUpperCase().indexOf('CAR');
            if (carIndex > 2) {
              candidateName = allLetters.substring(0, carIndex);
              // Le PNR serait juste avant CAR si présent
              // Dans "MARQUESCAR0044", MARQUES est le nom, pas de PNR séparé
            } else {
              // Pas de CAR dans les lettres, le nom se termine avant le premier pattern PNR
              // Le PNR est un code de 5-7 chars alphanumérique AVEC au moins un chiffre
              // Il peut être collé à la fin du nom
              
              // Chercher le point où le PNR commence dans remaining
              // Ex: "LODIBRE2OT..." -> on cherche où "BRE2OT" commence
              // Le PNR a un chiffre, donc on cherche la position du premier chiffre
              const afterDest = remaining; // "LODIBRE2OTExpected..."
              const firstDigitMatch = afterDest.match(/\d/);
              
              if (firstDigitMatch && firstDigitMatch.index !== undefined) {
                const digitPos = firstDigitMatch.index;
                
                // Le PNR commence quelques caractères AVANT le premier chiffre
                // Car le format PNR est comme "BRE2OT" où les lettres viennent avant le chiffre
                // On essaie de trouver où le nom se termine et le PNR commence
                
                // Heuristique: un nom de passager fait généralement 4-15 caractères
                // Un PNR fait 5-7 caractères et contient au moins un chiffre
                
                // Si le premier chiffre est à la position 4+, le nom est probablement avant le pattern PNR
                // Le PNR est de forme: 2-3 lettres + chiffres + lettres (ex: BRE2OT, ZG3F69, 88VXQ4)
                
                if (digitPos >= 3) {
                  // Chercher le début du PNR (peut être quelques lettres avant le chiffre)
                  // Pattern PNR typique: lettre(s) + chiffre(s) + lettre(s) ou tout chiffres avec lettres
                  
                  // On va chercher 6-7 chars qui contiennent un chiffre, en reculant depuis digitPos
                  const potentialPnrStart = Math.max(0, digitPos - 3); // Le PNR peut avoir jusqu'à 3 lettres avant le chiffre
                  
                  // Essayer différentes positions de début pour trouver un PNR valide
                  for (let pnrStartOffset = 0; pnrStartOffset <= 3 && potentialPnrStart + pnrStartOffset < digitPos; pnrStartOffset++) {
                    const pnrStart = potentialPnrStart + pnrStartOffset;
                    const potentialPnr = afterDest.substring(pnrStart, pnrStart + 7).match(/^[A-Z0-9]{5,7}/i);
                    
                    if (potentialPnr && /\d/.test(potentialPnr[0]) && /[A-Z]/i.test(potentialPnr[0])) {
                      // Trouvé un PNR valide
                      pnr = potentialPnr[0];
                      candidateName = afterDest.substring(0, pnrStart);
                      break;
                    }
                  }
                  
                  // Si on n'a pas trouvé de PNR mais le nom est trop long, couper au premier chiffre
                  if (!pnr && candidateName.length > 12) {
                    candidateName = allLetters.substring(0, digitPos);
                  }
                }
              }
            }
            
            // Enlever les suffixes de statut qui auraient pu être collés
            const statusSuffixes = ['EXPECTED', 'LOADED', 'RECEIVED', 'NOTLOADED', 'NOT', 'TOREFLIGHTY', 'TOREFLIGHT'];
            for (const suffix of statusSuffixes) {
              if (candidateName.toUpperCase().endsWith(suffix)) {
                candidateName = candidateName.slice(0, -suffix.length);
              }
            }
            
            if (candidateName.length >= 3) {
              passengerName = candidateName;
            }
          }
        }
        
        // Si le format concaténé n'a pas marché, essayer avec des espaces
        if (!passengerName) {
          const parts = restOfLine.split(/[\s\t]+/).filter(p => p.length > 0);
          
          const keywords = ['EXPECTED', 'LOADED', 'RECEIVED', 'OFFLOAD', 'RELABEL', 'REFLIGHT', 'ROUTE', 'CAR', 'NOT', 'ON', 'TO', 'DEST'];
          
          for (let p = 0; p < parts.length; p++) {
            const part = parts[p];
            if (!part || part.length < 1) continue;
            
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
            
            // Nom passager
            if (/^[A-Z]{3,}$/i.test(part) && destination && !passengerName) {
              const upperPart = part.toUpperCase();
              if (!keywords.some(kw => upperPart === kw || upperPart.startsWith(kw))) {
                passengerName = part;
                continue;
              }
            }
            
            // PNR
            if (/^[A-Z0-9]{5,7}$/i.test(part) && passengerName && !pnr) {
              const upperPart = part.toUpperCase();
              if (!upperPart.startsWith('CAR') && !/^[A-Z]{5,7}$/.test(part)) {
                pnr = part;
                continue;
              }
            }
          }
        }
        
        // Si on a au moins un tag et un nom de passager
        if (passengerName && passengerName.length >= 2) {
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
          console.log(`[BIRS Parser] Added bag: ${bagId} - ${passengerName} (${origin}-${destination}) loaded: ${loaded}`);
          i++;
          continue;
        } else {
          console.log(`[BIRS Parser] Tag ${bagId} skipped: could not extract passenger name from "${restOfLine.substring(0, 50)}"`);
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
      } else {
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
      } else {
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
  private parseTextLine(line: string): BirsItem | null {
    const trimmed = line.trim();
    
    // Skip lignes vides ou en-têtes
    // Ligne minimum: Bag ID (9 chars) + nom (2 chars) = 11 chars
    if (!trimmed || trimmed.length < 11 || this.isHeaderLine(trimmed)) {
      return null;
    }

    let bagId: string;
    let passengerName: string;
    let restOfLine: string;

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
