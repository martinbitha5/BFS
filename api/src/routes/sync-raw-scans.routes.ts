import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';
import { notifyStatsUpdate, notifySyncComplete } from './realtime.routes';

const router = Router();

/**
 * Valider qu'un vol est bien programmé avant d'accepter le scan
 * @param flightNumber - Numéro du vol (ex: ET0080)
 * @param airportCode - Code aéroport (ex: FIH)
 * @param scanDate - Date du scan
 * @returns true si le vol est valide, false sinon
 */
async function validateFlightBeforeScan(
  flightNumber: string,
  airportCode: string,
  scanDate: Date
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Extraire le jour de la semaine du scan (0 = dimanche, 1 = lundi, ...)
    const dayOfWeek = scanDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // Vérifier si le vol existe dans flight_schedule
    const { data: scheduledFlight, error } = await supabase
      .from('flight_schedule')
      .select('*')
      .eq('flight_number', flightNumber)
      .eq('airport_code', airportCode)
      .eq('active', true)
      .single();

    if (error || !scheduledFlight) {
      return {
        valid: false,
        reason: `Vol ${flightNumber} non programmé à l'aéroport ${airportCode}`
      };
    }

    // Vérifier que le vol opère aujourd'hui
    if (!scheduledFlight[dayName]) {
      const frenchDays: any = {
        sunday: 'dimanche',
        monday: 'lundi',
        tuesday: 'mardi',
        wednesday: 'mercredi',
        thursday: 'jeudi',
        friday: 'vendredi',
        saturday: 'samedi'
      };
      return {
        valid: false,
        reason: `Vol ${flightNumber} ne vole pas le ${frenchDays[dayName]}`
      };
    }

    // Vol valide !
    return { valid: true };
  } catch (err) {
    console.error('[VALIDATION] Erreur validation vol:', err);
    return {
      valid: false,
      reason: 'Erreur lors de la validation du vol'
    };
  }
}

/**
 * POST /api/v1/sync-raw-scans
 * Parse tous les raw_scans et crée les passagers/bagages manquants
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport_code } = req.body;
    
    if (!airport_code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Le code aéroport est requis' 
      });
    }

    console.log(`[SYNC] Démarrage de la synchronisation des raw_scans pour ${airport_code}`);

    // 1. Récupérer tous les raw_scans pour cet aéroport
    const { data: rawScans, error: scanError } = await supabase
      .from('raw_scans')
      .select('*')
      .eq('airport_code', airport_code)
      .order('created_at', { ascending: false });

    if (scanError) {
      console.error('[SYNC] Erreur récupération raw_scans:', scanError);
      throw scanError;
    }

    if (!rawScans || rawScans.length === 0) {
      return res.json({
        success: true,
        message: 'Aucun raw scan trouvé',
        stats: { processed: 0, passengersCreated: 0, baggagesCreated: 0, errors: 0 }
      });
    }

    console.log(`[SYNC] ${rawScans.length} raw_scans trouvés`);

    let passengersCreated = 0;
    let baggagesCreated = 0;
    let processed = 0;
    let errors = 0;

    // 2. Parser chaque raw_scan
    for (const scan of rawScans) {
      try {
        processed++;

        // Si c'est un boarding pass (check-in)
        if (scan.scan_type === 'boarding_pass' && scan.status_checkin) {
          // Extraire les infos du boarding pass (format simple)
          const parsed = parseSimpleBoardingPass(scan.raw_data);
          
          if (parsed && parsed.pnr) {
            // ✅ VALIDATION : Vérifier que le vol est programmé
            const validation = await validateFlightBeforeScan(
              parsed.flightNumber,
              airport_code,
              new Date(scan.checkin_at || scan.created_at)
            );

            if (!validation.valid) {
              console.log(`[SYNC] ❌ Scan refusé: ${validation.reason}`);
              errors++;
              // Marquer le scan comme traité mais refusé
              await supabase
                .from('raw_scans')
                .update({ 
                  processed: true,
                  processing_error: validation.reason
                })
                .eq('id', scan.id);
              continue; // Passer au scan suivant
            }
            // Vérifier si le passager existe déjà
            const { data: existing } = await supabase
              .from('passengers')
              .select('id')
              .eq('pnr', parsed.pnr)
              .eq('airport_code', airport_code)
              .single();

            if (!existing) {
              // Créer le passager
              const { data: newPassenger, error: passError } = await supabase
                .from('passengers')
                .insert({
                  full_name: parsed.fullName || 'UNKNOWN',
                  pnr: parsed.pnr,
                  flight_number: parsed.flightNumber || 'UNKNOWN',
                  departure: parsed.departure || airport_code,
                  arrival: parsed.arrival || 'UNK',
                  seat_number: parsed.seatNumber,
                  baggage_count: parsed.baggageCount || 0,
                  checked_in_at: scan.checkin_at || scan.created_at,
                  airport_code: airport_code
                })
                .select()
                .single();

              if (!passError && newPassenger) {
                passengersCreated++;
                console.log(`[SYNC] ✅ Passager créé: ${parsed.pnr} (${parsed.fullName})`);

                // Créer des bagages si baggageCount > 0
                if (parsed.baggageCount > 0) {
                  for (let i = 1; i <= parsed.baggageCount; i++) {
                    const { error: bagError } = await supabase
                      .from('baggages')
                      .insert({
                        passenger_id: newPassenger.id,
                        tag_number: `${parsed.pnr}-BAG${i}`,
                        status: 'checked_in',
                        flight_number: parsed.flightNumber,
                        airport_code: airport_code,
                        scanned_at: scan.checkin_at || scan.created_at
                      });

                    if (!bagError) {
                      baggagesCreated++;
                      console.log(`[SYNC] ✅ Bagage ${i}/${parsed.baggageCount} créé pour ${parsed.pnr}`);
                    }
                  }
                }
              } else {
                console.error(`[SYNC] ❌ Erreur création passager ${parsed.pnr}:`, passError);
                errors++;
              }
            }
          }
        }

        // Si c'est un boarding pass au checkpoint EMBARQUEMENT
        if (scan.scan_type === 'boarding_pass' && scan.status_boarding) {
          const parsed = parseSimpleBoardingPass(scan.raw_data);
          
          if (parsed && parsed.pnr) {
            // Trouver le passager par PNR
            const { data: passenger } = await supabase
              .from('passengers')
              .select('id')
              .eq('pnr', parsed.pnr)
              .eq('airport_code', airport_code)
              .single();

            if (passenger) {
              // Créer ou mettre à jour le boarding_status
              const { error: boardError } = await supabase
                .from('boarding_status')
                .upsert({
                  passenger_id: passenger.id,
                  boarded: true,
                  boarded_at: scan.boarding_at || new Date().toISOString(),
                  gate: null
                }, { onConflict: 'passenger_id' });

              if (!boardError) {
                console.log(`[SYNC] ✅ Passager embarqué: ${parsed.pnr}`);
              } else {
                console.error(`[SYNC] ❌ Erreur embarquement ${parsed.pnr}:`, boardError);
              }
            }
          }
        }

        // Si c'est un bagage tag
        if (scan.scan_type === 'baggage_tag' && scan.status_baggage && scan.baggage_rfid_tag) {
          // Extraire les infos du tag bagage
          const baggageParsed = parseSimpleBaggageTag(scan.raw_data);
          
          // ✅ VALIDATION : Vérifier que le vol du bagage est programmé
          if (baggageParsed?.flightNumber) {
            const validation = await validateFlightBeforeScan(
              baggageParsed.flightNumber,
              airport_code,
              new Date(scan.baggage_at || scan.created_at)
            );

            if (!validation.valid) {
              console.log(`[SYNC] ❌ Bagage refusé: ${validation.reason}`);
              errors++;
              // Marquer le scan comme traité mais refusé
              await supabase
                .from('raw_scans')
                .update({ 
                  processed: true,
                  processing_error: validation.reason
                })
                .eq('id', scan.id);
              continue; // Passer au scan suivant
            }
          }
          // Vérifier si le bagage existe déjà (national ou international)
          const { data: existingNational } = await supabase
            .from('baggages')
            .select('id')
            .eq('tag_number', scan.baggage_rfid_tag)
            .single();

          const { data: existingIntl } = await supabase
            .from('international_baggages')
            .select('id')
            .eq('tag_number', scan.baggage_rfid_tag)
            .single();

          if (!existingNational && !existingIntl) {
            // Parser le tag bagage pour extraire les infos
            const baggageParsed = parseSimpleBaggageTag(scan.raw_data);
            
            // Extraire le PNR du tag s'il est disponible
            const pnrFromTag = baggageParsed?.pnr || extractPNRFromTag(scan.baggage_rfid_tag);

            // Chercher si un passager avec ce PNR existe
            let passengerId = null;
            if (pnrFromTag) {
              const { data: passenger } = await supabase
                .from('passengers')
                .select('id, flight_number')
                .eq('pnr', pnrFromTag)
                .eq('airport_code', airport_code)
                .single();
              
              if (passenger) {
                passengerId = passenger.id;
                console.log(`[SYNC] 🔗 Passager trouvé pour bagage ${scan.baggage_rfid_tag}: PNR ${pnrFromTag}`);
              }
            }

            if (passengerId) {
              // Créer un bagage national lié au passager
              const { error: bagError } = await supabase
                .from('baggages')
                .insert({
                  passenger_id: passengerId,
                  tag_number: scan.baggage_rfid_tag,
                  status: 'arrived',
                  flight_number: baggageParsed?.flightNumber,
                  airport_code: airport_code,
                  scanned_at: scan.baggage_at || scan.created_at
                });

              if (!bagError) {
                baggagesCreated++;
                console.log(`[SYNC] ✅ Bagage national créé: ${scan.baggage_rfid_tag} (lié au passager)`);
              } else {
                console.error(`[SYNC] ❌ Erreur création bagage national ${scan.baggage_rfid_tag}:`, bagError);
                errors++;
              }
            } else {
              // Créer un bagage international (passager non trouvé)
              const { error: bagError } = await supabase
                .from('international_baggages')
                .insert({
                  tag_number: scan.baggage_rfid_tag,
                  status: 'scanned',
                  passenger_name: baggageParsed?.passengerName,
                  pnr: pnrFromTag,
                  flight_number: baggageParsed?.flightNumber,
                  origin: baggageParsed?.origin || airport_code,
                  scanned_at: scan.baggage_at || scan.created_at,
                  airport_code: airport_code,
                  remarks: 'Auto-créé depuis raw_scans - passager non trouvé'
                });

              if (!bagError) {
                baggagesCreated++;
                console.log(`[SYNC] ✅ Bagage international créé: ${scan.baggage_rfid_tag}`);
              } else {
                console.error(`[SYNC] ❌ Erreur création bagage international ${scan.baggage_rfid_tag}:`, bagError);
                errors++;
              }
            }
          }
        }
      } catch (error) {
        console.error(`[SYNC] Erreur traitement scan ${scan.id}:`, error);
        errors++;
      }
    }

    console.log(`[SYNC] Terminé: ${passengersCreated} passagers, ${baggagesCreated} bagages créés`);

    const syncStats = {
      processed,
      passengersCreated,
      baggagesCreated,
      errors,
      totalScans: rawScans.length
    };

    // ✅ TEMPS RÉEL: Notifier tous les clients SSE
    notifySyncComplete(airport_code, syncStats);
    // Envoyer les stats mises à jour
    await notifyStatsUpdate(airport_code);

    res.json({
      success: true,
      message: 'Synchronisation terminée',
      stats: syncStats
    });
  } catch (error) {
    console.error('[SYNC] Erreur générale:', error);
    next(error);
  }
});

// ===== PARSERS SIMPLES =====

/**
 * Extrait le PNR depuis un tag RFID de bagage
 * Format attendu: PNR (6 lettres) suivi de chiffres
 * Exemple: ABCDEF123456 → ABCDEF
 */
function extractPNRFromTag(tag: string): string | null {
  if (!tag || tag.length < 6) return null;
  
  // Chercher 6 lettres consécutives au début
  const pnrMatch = tag.match(/^([A-Z]{6})/);
  if (pnrMatch) {
    return pnrMatch[1];
  }
  
  // Chercher 6 caractères alphanumériques
  const alphaMatch = tag.match(/^([A-Z0-9]{6})/);
  if (alphaMatch) {
    return alphaMatch[1];
  }
  
  return null;
}

function parseSimpleBoardingPass(rawData: string): any {
  try {
    console.log('[PARSE BP] === DÉBUT PARSING ===');
    console.log('[PARSE BP] Données brutes:', rawData.substring(0, 100) + '...');
    console.log('[PARSE BP] Longueur:', rawData.length);
    
    if (!rawData || !rawData.startsWith('M')) {
      console.log('[PARSE BP] ❌ Format non reconnu (ne commence pas par M)');
      return null;
    }

    let fullName = 'UNKNOWN';
    let pnr = null;
    let departure = null;
    let arrival = null;
    let flightNumber = null;
    let seatNumber = null;
    let baggageCount = 0;

    // Format BCBP standard : M1 + Nom(variable) + PNR(6-7) + Dep(3) + Arr(3) + Code(2) + Vol(4) + ...
    // Exemples réels vus :
    // M1RAZIOU/MOUSTAPHA    E7T5GVL FIHNBOKQ 0555 335M031G0009 (avec espaces)
    // M1MASIMANGO/ISSIAKA GROIFLBU FIHMDKET 0080 235Y031J0095 (collé)
    
    // STRATÉGIE 1: Essayer regex BCBP standard avec espaces
    let bcbpMatch = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})\s+(\d{3,4})\s+(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/);
    
    // STRATÉGIE 2: Si échec, essayer sans espaces (format collé)
    // Pattern: M1 + Nom + espace + PNR(6) + DEP(3) + ARR(3) + CODE(2) + VOL(4)
    if (!bcbpMatch) {
      console.log('[PARSE BP] Format avec espaces non détecté, essai format collé...');
      bcbpMatch = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6})\s+([A-Z]{3})([A-Z]{3})([A-Z]{2})\s*(\d{3,4})/);
    }
    
    if (bcbpMatch) {
      console.log('[PARSE BP] ✅ Format BCBP détecté');
      fullName = bcbpMatch[1].trim().replace(/\//g, ' ').replace(/\s+/g, ' ');
      pnr = bcbpMatch[2];
      departure = bcbpMatch[3];
      arrival = bcbpMatch[4];
      const companyCode = bcbpMatch[5];
      const flightNum = bcbpMatch[6];
      
      flightNumber = companyCode + flightNum;
      
      // Siège (si présent dans le match)
      if (bcbpMatch.length > 9) {
        const seatSeq = bcbpMatch[9];
        const compartment = bcbpMatch[10];
        seatNumber = seatSeq + compartment;
      }
      
      // Essayer d'extraire le nombre de bagages
      // Chercher après le numéro de vol
      const afterFlight = rawData.substring(rawData.indexOf(flightNum) + flightNum.length);
      const baggageMatch = afterFlight.match(/(\d{1,2})PC/i) || 
                          afterFlight.match(/\s+(\d)A\d{3,4}/) ||
                          afterFlight.match(/^\s*(\d{3})[A-Z](\d{3})[A-Z](\d{4})/); // Format BCBP standard
      
      if (baggageMatch) {
        const count = parseInt(baggageMatch[1], 10);
        if (count > 0 && count <= 9) {
          baggageCount = count;
        }
      }
      
      console.log('[PARSE BP] Données extraites BCBP:');
      console.log('  - Nom:', fullName);
      console.log('  - PNR:', pnr);
      console.log('  - Route:', `${departure}-${arrival}`);
      console.log('  - Vol:', flightNumber);
      console.log('  - Siège:', seatNumber || 'N/A');
      console.log('  - Bagages:', baggageCount);
    } else {
      console.log('[PARSE BP] ⚠️  Format BCBP structuré non détecté, extraction intelligente...');
      
      // EXTRACTION INTELLIGENTE (sans regex BCBP complète)
      // Étape 1: Extraire le nom et PNR
      const nameAndPnrMatch = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6})/);
      if (nameAndPnrMatch) {
        fullName = nameAndPnrMatch[1].trim().replace(/\//g, ' ').replace(/\s+/g, ' ');
        pnr = nameAndPnrMatch[2];
        console.log('[PARSE BP] Nom et PNR extraits:', fullName, '/', pnr);
      }
      
      // Étape 2: Trouver les codes aéroport (3 lettres consécutives)
      // Chercher après le PNR
      const afterPnr = pnr ? rawData.substring(rawData.indexOf(pnr) + 6) : rawData;
      
      // Pattern pour trouver DEP(3) + ARR(3) + CODE(2)
      // Ex: FIHMDKET → FIH (départ) + MDK (arrivée) + ET (code compagnie)
      const routeAndCodeMatch = afterPnr.match(/\s*([A-Z]{3})([A-Z]{3})([A-Z]{2})/);
      if (routeAndCodeMatch) {
        departure = routeAndCodeMatch[1];
        arrival = routeAndCodeMatch[2];
        const companyCode = routeAndCodeMatch[3];
        
        // Chercher le numéro de vol après le code compagnie
        const afterCode = afterPnr.substring(afterPnr.indexOf(companyCode) + 2);
        const flightNumMatch = afterCode.match(/\s*(\d{3,4})/);
        if (flightNumMatch) {
          flightNumber = companyCode + flightNumMatch[1];
        }
        
        console.log('[PARSE BP] Route et vol extraits:', `${departure}-${arrival}`, '/', flightNumber);
      }
      
      console.log('[PARSE BP] Extraction intelligente:');
      console.log('  - Nom:', fullName);
      console.log('  - PNR:', pnr);
      console.log('  - Route:', departure && arrival ? `${departure}-${arrival}` : 'non trouvé');
      console.log('  - Vol:', flightNumber || 'non trouvé');
    }

    if (!pnr) {
      console.log('[PARSE BP] ❌ PNR non trouvé, scan ignoré');
      return null;
    }

    const result = {
      pnr,
      fullName,
      flightNumber: flightNumber || 'UNKNOWN',
      departure: departure || 'UNK',
      arrival: arrival || 'UNK',
      seatNumber,
      baggageCount,
      rawData
    };
    
    console.log('[PARSE BP] ✅ Résultat final:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('[PARSE BP] ❌ Erreur parsing boarding pass:', error);
    return null;
  }
}

function parseSimpleBaggageTag(rawData: string): any {
  try {
    // Format attendu : tag numérique simple (ex: "0235171598")
    const tag = rawData.trim();

    return {
      tagNumber: tag,
      passengerName: null,
      pnr: null,
      flightNumber: null,
      origin: null,
      rawData
    };
  } catch (error) {
    console.error('[PARSE] Erreur parsing baggage tag:', error);
    return null;
  }
}

export default router;
