import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';

const router = Router();

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
            // Vérifier si le passager existe déjà
            const { data: existing } = await supabase
              .from('passengers')
              .select('id')
              .eq('pnr', parsed.pnr)
              .eq('airport_code', airport_code)
              .single();

            if (!existing) {
              // Créer le passager
              const { error: passError } = await supabase
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
                });

              if (!passError) {
                passengersCreated++;
                console.log(`[SYNC] ✅ Passager créé: ${parsed.pnr}`);
              } else {
                console.error(`[SYNC] ❌ Erreur création passager ${parsed.pnr}:`, passError);
                errors++;
              }
            }
          }
        }

        // Si c'est un bagage tag
        if (scan.scan_type === 'baggage_tag' && scan.status_baggage && scan.baggage_rfid_tag) {
          // Vérifier si le bagage existe déjà (national ou international)
          const { data: existingNational } = await supabase
            .from('baggages')
            .select('id')
            .eq('tag_number', scan.baggage_rfid_tag)
            .single();

          const { data: existingIntl } = await supabase
            .from('international_baggages')
            .select('id')
            .eq('rfid_tag', scan.baggage_rfid_tag)
            .single();

          if (!existingNational && !existingIntl) {
            // Parser le tag bagage pour extraire les infos
            const baggageParsed = parseSimpleBaggageTag(scan.raw_data);

            // Créer un bagage international par défaut
            const { error: bagError } = await supabase
              .from('international_baggages')
              .insert({
                rfid_tag: scan.baggage_rfid_tag,
                status: 'scanned',
                passenger_name: baggageParsed?.passengerName,
                pnr: baggageParsed?.pnr,
                flight_number: baggageParsed?.flightNumber,
                origin: baggageParsed?.origin || airport_code,
                scanned_at: scan.baggage_at || scan.created_at,
                airport_code: airport_code,
                remarks: 'Auto-créé depuis raw_scans'
              });

            if (!bagError) {
              baggagesCreated++;
              console.log(`[SYNC] ✅ Bagage créé: ${scan.baggage_rfid_tag}`);
            } else {
              console.error(`[SYNC] ❌ Erreur création bagage ${scan.baggage_rfid_tag}:`, bagError);
              errors++;
            }
          }
        }
      } catch (error) {
        console.error(`[SYNC] Erreur traitement scan ${scan.id}:`, error);
        errors++;
      }
    }

    console.log(`[SYNC] Terminé: ${passengersCreated} passagers, ${baggagesCreated} bagages créés`);

    res.json({
      success: true,
      message: 'Synchronisation terminée',
      stats: {
        processed,
        passengersCreated,
        baggagesCreated,
        errors,
        totalScans: rawScans.length
      }
    });
  } catch (error) {
    console.error('[SYNC] Erreur générale:', error);
    next(error);
  }
});

// ===== PARSERS SIMPLES =====

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
    // Exemple: M1RAZIOU/MOUSTAPHA    E7T5GVL FIHNBOKQ 0555 335M031G0009
    // Exemple: M1MASIMANGO/ISSIAKA GROIFLBU FIHMDKET 0080 235Y031J0095
    
    // Regex BCBP complète et flexible
    const bcbpMatch = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})\s+(\d{3,4})\s+(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/);
    
    if (bcbpMatch) {
      console.log('[PARSE BP] ✅ Format BCBP structuré détecté');
      fullName = bcbpMatch[1].trim().replace(/\//g, ' ').replace(/\s+/g, ' ');
      pnr = bcbpMatch[2];
      departure = bcbpMatch[3];
      arrival = bcbpMatch[4];
      const companyCode = bcbpMatch[5];
      const flightNum = bcbpMatch[6];
      const seatSeq = bcbpMatch[9];
      const compartment = bcbpMatch[10];
      
      flightNumber = companyCode + flightNum;
      seatNumber = seatSeq + compartment;
      
      // Essayer d'extraire le nombre de bagages
      const checkInSeqNumber = bcbpMatch[11];
      const afterMandatory = rawData.substring(rawData.indexOf(checkInSeqNumber) + 4);
      const baggageMatch = afterMandatory.match(/(\d{1,2})PC/i) || 
                          afterMandatory.match(/\s+(\d)A\d{3,4}\d+/) ||
                          afterMandatory.match(/^\s*(\d{1,2})[^0-9]/);
      
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
      console.log('  - Siège:', seatNumber);
      console.log('  - Bagages:', baggageCount);
    } else {
      console.log('[PARSE BP] ⚠️  Format BCBP non structuré, tentative extraction manuelle');
      
      // Fallback: extraction manuelle
      // Nom: après M1 jusqu'au PNR
      const nameMatch = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})/);
      if (nameMatch) {
        fullName = nameMatch[1].trim().replace(/\//g, ' ').replace(/\s+/g, ' ');
        pnr = nameMatch[2];
      }
      
      // Route: 3 lettres + 3 lettres
      const routeMatch = rawData.match(/([A-Z]{3})([A-Z]{3})/);
      if (routeMatch) {
        departure = routeMatch[1];
        arrival = routeMatch[2];
      }
      
      // Vol: Code compagnie (2 lettres) + numéro (3-4 chiffres)
      const flightMatch = rawData.match(/([A-Z0-9]{2})\s*(\d{3,4})/);
      if (flightMatch) {
        flightNumber = flightMatch[1] + flightMatch[2];
      }
      
      console.log('[PARSE BP] Extraction manuelle:');
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
      rfidTag: tag,
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
