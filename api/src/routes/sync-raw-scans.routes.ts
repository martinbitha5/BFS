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
    // Format attendu : "M3EYAKOI/BALA MARIE ELECTRIE FEIMBA0J GB52 3YRPK1ANSU 2780BEJP9AI1 SU"
    // Ou autre format avec PNR visible
    
    // Essayer d'extraire le PNR (6 caractères alphanumériques)
    const pnrMatch = rawData.match(/\b([A-Z0-9]{6})\b/);
    const pnr = pnrMatch ? pnrMatch[1] : null;

    // Essayer d'extraire le nom (généralement au début après M1/M2/M3)
    const nameMatch = rawData.match(/M[123]([A-Z\s/]+)\s/);
    const fullName = nameMatch ? nameMatch[1].replace(/\//g, ' ').trim() : 'UNKNOWN';

    // Essayer d'extraire le numéro de vol (2 lettres + 2-4 chiffres)
    const flightMatch = rawData.match(/\b([A-Z]{2}\d{2,4})\b/);
    const flightNumber = flightMatch ? flightMatch[1] : null;

    // Essayer d'extraire les codes aéroports (3 lettres majuscules)
    const airportMatches = rawData.match(/\b([A-Z]{3})\b/g);
    const airports = airportMatches || [];

    return {
      pnr,
      fullName,
      flightNumber,
      departure: airports[0] || null,
      arrival: airports[1] || null,
      seatNumber: null,
      baggageCount: 0,
      rawData
    };
  } catch (error) {
    console.error('[PARSE] Erreur parsing boarding pass:', error);
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
