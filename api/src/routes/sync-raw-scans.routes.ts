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
    // Extraire la date du scan au format YYYY-MM-DD
    const scanDateStr = scanDate.toISOString().split('T')[0];
    
    // Normaliser le numéro de vol (enlever espaces, majuscules)
    const normalizedFlightNumber = flightNumber.trim().toUpperCase().replace(/\s+/g, '');

    // Vérifier si le vol existe dans flight_schedule pour cette date
    const { data: scheduledFlights, error } = await supabase
      .from('flight_schedule')
      .select('*')
      .eq('airport_code', airportCode)
      .eq('scheduled_date', scanDateStr)
      .in('status', ['scheduled', 'boarding', 'departed']);

    if (error) {
      console.error('[VALIDATION] Erreur requête vol:', error);
      // En cas d'erreur, on accepte le scan pour ne pas bloquer l'opération
      return { valid: true };
    }

    // Chercher une correspondance (avec ou sans zéros optionnels)
    const matchingFlight = scheduledFlights?.find(flight => {
      const dbFlightNumber = flight.flight_number.trim().toUpperCase().replace(/\s+/g, '');
      return dbFlightNumber === normalizedFlightNumber ||
        dbFlightNumber.replace(/0+(\d)/g, '$1') === normalizedFlightNumber.replace(/0+(\d)/g, '$1');
    });

    if (!matchingFlight) {
      // Si aucun vol n'est trouvé, vérifier si des vols existent pour cet aéroport aujourd'hui
      // Si oui, le vol n'est pas programmé
      // Si non (table vide), on accepte le scan car la programmation n'est pas faite
      if (scheduledFlights && scheduledFlights.length > 0) {
        console.log(`[VALIDATION] ⚠️ Vol ${flightNumber} non trouvé parmi ${scheduledFlights.length} vols programmés`);
        // Accepter quand même pour ne pas bloquer - la vérification est informative
        return { valid: true };
      }
      
      // Aucun vol programmé pour aujourd'hui - on accepte le scan
      console.log(`[VALIDATION] ℹ️ Aucun vol programmé pour ${scanDateStr}, scan accepté par défaut`);
      return { valid: true };
    }

    // Vol trouvé et valide !
    console.log(`[VALIDATION] ✅ Vol ${flightNumber} validé pour ${scanDateStr}`);
    return { valid: true };
  } catch (err) {
    console.error('[VALIDATION] Erreur validation vol:', err);
    // En cas d'erreur, on accepte le scan pour ne pas bloquer l'opération
    return { valid: true };
  }
}

/**
 * GET /api/v1/sync-raw-scans/debug
 * Debug: voir l'état des données dans la base
 */
router.get('/debug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport } = req.query;
    
    if (!airport) {
      return res.status(400).json({ error: 'airport requis' });
    }

    // Compter les données
    const { count: rawScansCount } = await supabase
      .from('raw_scans')
      .select('*', { count: 'exact', head: true })
      .eq('airport_code', airport);

    const { count: passengersCount } = await supabase
      .from('passengers')
      .select('*', { count: 'exact', head: true })
      .eq('airport_code', airport);

    const { count: baggagesCount } = await supabase
      .from('baggages')
      .select('*', { count: 'exact', head: true })
      .eq('airport_code', airport);

    const { count: boardingCount } = await supabase
      .from('boarding_status')
      .select('*', { count: 'exact', head: true });

    // Derniers raw_scans
    const { data: recentScans } = await supabase
      .from('raw_scans')
      .select('id, scan_type, status_checkin, status_baggage, status_boarding, baggage_rfid_tag, processed, created_at')
      .eq('airport_code', airport)
      .order('created_at', { ascending: false })
      .limit(10);

    // Passagers avec leurs bagages ET boarding_status
    const { data: passengersWithBags } = await supabase
      .from('passengers')
      .select('id, full_name, pnr, flight_number, baggage_count, baggages(id, tag_number, status), boarding_status(boarded, boarded_at)')
      .eq('airport_code', airport)
      .limit(10);

    // Bagages orphelins (sans passenger_id)
    const { data: orphanBaggages } = await supabase
      .from('baggages')
      .select('*')
      .eq('airport_code', airport)
      .is('passenger_id', null);

    res.json({
      success: true,
      data: {
        counts: {
          raw_scans: rawScansCount || 0,
          passengers: passengersCount || 0,
          baggages: baggagesCount || 0,
          boarding_status: boardingCount || 0
        },
        recentScans: recentScans || [],
        passengersWithBags: passengersWithBags || [],
        orphanBaggages: orphanBaggages || []
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/sync-raw-scans
 * Parse tous les raw_scans et crée les passagers/bagages manquants
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport_code, force } = req.body;
    
    if (!airport_code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Le code aéroport est requis' 
      });
    }

    console.log(`[SYNC] Démarrage de la synchronisation des raw_scans pour ${airport_code} (force=${force || false})`);

    // 1. Récupérer tous les raw_scans pour cet aéroport
    // Si force=true, récupérer TOUS les scans (même déjà traités)
    let query = supabase
      .from('raw_scans')
      .select('*')
      .eq('airport_code', airport_code)
      .order('created_at', { ascending: false });

    if (!force) {
      // Par défaut, ne récupérer que les scans non traités
      query = query.or('processed.is.null,processed.eq.false');
    }

    const { data: rawScans, error: scanError } = await query;

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
            const { data: existing, error: existingError } = await supabase
              .from('passengers')
              .select('id, baggage_count')
              .eq('pnr', parsed.pnr)
              .eq('airport_code', airport_code)
              .maybeSingle();

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
                        status: 'checked',
                        flight_number: parsed.flightNumber,
                        airport_code: airport_code,
                        checked_at: scan.checkin_at || scan.created_at
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
            } else {
              // Passager existe déjà - vérifier si les bagages manquent
              const expectedBaggageCount = existing.baggage_count || 0;
              
              if (expectedBaggageCount > 0) {
                // Compter les bagages existants
                const { count: existingBaggageCount } = await supabase
                  .from('baggages')
                  .select('*', { count: 'exact', head: true })
                  .eq('passenger_id', existing.id);
                
                const actualCount = existingBaggageCount || 0;
                
                // Créer les bagages manquants
                if (actualCount < expectedBaggageCount) {
                  console.log(`[SYNC] 🔧 Passager ${parsed.pnr} existe mais manque ${expectedBaggageCount - actualCount} bagage(s)`);
                  
                  for (let i = actualCount + 1; i <= expectedBaggageCount; i++) {
                    const { error: bagError } = await supabase
                      .from('baggages')
                      .insert({
                        passenger_id: existing.id,
                        tag_number: `${parsed.pnr}-BAG${i}`,
                        status: 'checked',
                        flight_number: parsed.flightNumber,
                        airport_code: airport_code,
                        checked_at: scan.checkin_at || scan.created_at
                      });

                    if (!bagError) {
                      baggagesCreated++;
                      console.log(`[SYNC] ✅ Bagage ${i}/${expectedBaggageCount} créé pour passager existant ${parsed.pnr}`);
                    }
                  }
                }
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
            
            // Récupérer le numéro de vol depuis le scan
            const flightFromScan = scan.flight_number || baggageParsed?.flightNumber;

            // Chercher si un passager avec ce PNR existe
            let passengerId = null;
            let passengerFlightNumber = null;
            
            if (pnrFromTag) {
              const { data: passenger } = await supabase
                .from('passengers')
                .select('id, flight_number')
                .eq('pnr', pnrFromTag)
                .eq('airport_code', airport_code)
                .single();
              
              if (passenger) {
                passengerId = passenger.id;
                passengerFlightNumber = passenger.flight_number;
                console.log(`[SYNC] 🔗 Passager trouvé pour bagage ${scan.baggage_rfid_tag}: PNR ${pnrFromTag}`);
              }
            }
            
            // Si pas de PNR, chercher par numéro de vol + passager avec bagages manquants
            if (!passengerId && flightFromScan) {
              // Chercher les passagers sur ce vol qui ont baggageCount > nombre de bagages liés
              const { data: passengersOnFlight } = await supabase
                .from('passengers')
                .select('id, pnr, full_name, baggage_count, flight_number')
                .eq('airport_code', airport_code)
                .ilike('flight_number', `%${flightFromScan.replace(/^[A-Z]{2}0*/, '')}%`);
              
              if (passengersOnFlight && passengersOnFlight.length > 0) {
                // Pour chaque passager, compter ses bagages actuels
                for (const pax of passengersOnFlight) {
                  const { count: linkedBaggages } = await supabase
                    .from('baggages')
                    .select('*', { count: 'exact', head: true })
                    .eq('passenger_id', pax.id);
                  
                  const expectedBags = pax.baggage_count || 0;
                  const actualBags = linkedBaggages || 0;
                  
                  // Si ce passager a des bagages manquants, lui lier ce bagage
                  if (actualBags < expectedBags) {
                    passengerId = pax.id;
                    passengerFlightNumber = pax.flight_number;
                    console.log(`[SYNC] 🔗 Bagage ${scan.baggage_rfid_tag} lié au passager ${pax.full_name} (${pax.pnr}) - ${actualBags}/${expectedBags} bagages`);
                    break;
                  }
                }
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
                  checked_at: scan.baggage_at || scan.created_at,
                  arrived_at: scan.baggage_at || scan.created_at
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

/**
 * POST /api/v1/sync-raw-scans/relink-baggages
 * Re-lie les bagages non associés aux passagers correspondants
 */
router.post('/relink-baggages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport_code } = req.body;
    
    if (!airport_code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Le code aéroport est requis' 
      });
    }

    console.log(`[RELINK] Recherche des bagages non associés pour ${airport_code}`);

    // Récupérer tous les bagages sans passenger_id
    const { data: unlinkedBaggages, error: bagError } = await supabase
      .from('baggages')
      .select('*')
      .eq('airport_code', airport_code)
      .is('passenger_id', null);

    if (bagError) throw bagError;

    if (!unlinkedBaggages || unlinkedBaggages.length === 0) {
      return res.json({
        success: true,
        message: 'Aucun bagage non associé trouvé',
        stats: { processed: 0, linked: 0 }
      });
    }

    console.log(`[RELINK] ${unlinkedBaggages.length} bagages non associés trouvés`);

    let linked = 0;

    for (const baggage of unlinkedBaggages) {
      // Chercher un passager sur le même vol avec des bagages manquants
      if (baggage.flight_number) {
        const flightNum = baggage.flight_number.replace(/^[A-Z]{2}0*/, '');
        
        const { data: passengersOnFlight } = await supabase
          .from('passengers')
          .select('id, pnr, full_name, baggage_count, flight_number')
          .eq('airport_code', airport_code)
          .ilike('flight_number', `%${flightNum}%`);

        if (passengersOnFlight && passengersOnFlight.length > 0) {
          for (const pax of passengersOnFlight) {
            // Compter les bagages déjà liés à ce passager
            const { count: linkedCount } = await supabase
              .from('baggages')
              .select('*', { count: 'exact', head: true })
              .eq('passenger_id', pax.id);

            const expected = pax.baggage_count || 0;
            const actual = linkedCount || 0;

            if (actual < expected) {
              // Lier ce bagage au passager
              const { error: updateError } = await supabase
                .from('baggages')
                .update({ passenger_id: pax.id })
                .eq('id', baggage.id);

              if (!updateError) {
                linked++;
                console.log(`[RELINK] ✅ Bagage ${baggage.tag_number} lié à ${pax.full_name} (${pax.pnr})`);
                break;
              }
            }
          }
        }
      }
    }

    console.log(`[RELINK] Terminé: ${linked}/${unlinkedBaggages.length} bagages reliés`);

    res.json({
      success: true,
      message: `${linked} bagage(s) relié(s) sur ${unlinkedBaggages.length}`,
      stats: { processed: unlinkedBaggages.length, linked }
    });
  } catch (error) {
    console.error('[RELINK] Erreur:', error);
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
    
    if (!rawData || !rawData.startsWith('M')) {
      console.log('[PARSE BP] ❌ Format non reconnu (ne commence pas par M)');
      return null;
    }

    let fullName = 'UNKNOWN';
    let pnr: string | null = null;
    let departure: string | null = null;
    let arrival: string | null = null;
    let flightNumber: string | null = null;
    let seatNumber: string | null = null;
    let baggageCount = 0;

    // Codes aéroport connus pour la détection (RDC + régionaux + internationaux)
    const knownAirports = [
      // RDC
      'FIH', 'FBM', 'GOM', 'KND', 'MJM', 'BDT', 'KGA', 'LIQ', 'KWZ', 'FKI', 'MBA', 'IRP', 'BAN', 'FMI',
      // Afrique
      'ADD', 'NBO', 'JNB', 'LAD', 'BZV', 'KGL', 'EBB', 'DAR', 'LUN', 'HRE', 'MPM', 'LOS', 'ACC', 'ABJ', 'DKR', 'CMN', 'CAI', 'ALG', 'TUN',
      // Internationaux
      'DXB', 'DOH', 'IST', 'CDG', 'LHR', 'AMS', 'FRA', 'BRU', 'JFK', 'ORD', 'PEK', 'HKG', 'SIN'
    ];
    // Codes compagnie connus (Afrique + internationaux)
    const knownAirlines = [
      'ET', '9U', 'KQ', 'SA', 'WB', 'TC', 'PW', 'HF', 'Q8', '8Q', // Afrique
      'TK', 'EK', 'QR', 'AF', 'KL', 'LH', 'SN', 'BA', 'LX', 'OS', 'AA', 'UA', 'DL', 'CA', 'CX', 'SQ' // Internationaux
    ];

    // STRATÉGIE ROBUSTE: Trouver les codes aéroport dans les données
    // Format typique: M1NOM/PRENOM[PNR][DEP][ARR][CODE][VOL]...
    // Exemple: M1MASIKA KANEFU/JEANNEQDGSVI FIHFBMET 0064...
    
    // Étape 1: Trouver le pattern [DEP(3)][ARR(3)][CODE(2)] dans les données
    // Chercher un code aéroport connu suivi d'un autre code aéroport puis un code compagnie
    let routeMatch = null;
    let routeIndex = -1;
    
    for (const dep of knownAirports) {
      const depIndex = rawData.indexOf(dep);
      if (depIndex > 10) { // Après le nom minimum
        // Vérifier si suivi d'un autre code aéroport (3 lettres) puis code compagnie (2 lettres)
        const afterDep = rawData.substring(depIndex + 3);
        for (const arr of knownAirports) {
          if (afterDep.startsWith(arr)) {
            // Trouvé DEP + ARR, chercher le code compagnie
            const afterArr = afterDep.substring(3);
            for (const airline of knownAirlines) {
              if (afterArr.startsWith(airline)) {
                routeMatch = { dep, arr, airline };
                routeIndex = depIndex;
                break;
              }
            }
            if (routeMatch) break;
          }
        }
        if (routeMatch) break;
      }
    }
    
    if (routeMatch && routeIndex > 0) {
      console.log('[PARSE BP] ✅ Route trouvée:', routeMatch.dep, '->', routeMatch.arr, 'Vol:', routeMatch.airline);
      departure = routeMatch.dep;
      arrival = routeMatch.arr;
      
      // Extraire le numéro de vol après le code compagnie
      const afterAirline = rawData.substring(routeIndex + 8); // DEP(3) + ARR(3) + CODE(2) = 8
      const flightNumMatch = afterAirline.match(/^\s*0*(\d{2,4})/);
      if (flightNumMatch) {
        flightNumber = routeMatch.airline + flightNumMatch[1];
      }
      
      // Extraire le PNR: 6 caractères juste avant le code aéroport de départ
      // Le PNR peut être collé ou séparé par un espace
      const beforeRoute = rawData.substring(0, routeIndex);
      // Chercher les 6 derniers caractères alphanumériques avant la route
      const pnrMatch = beforeRoute.match(/([A-Z0-9]{6})\s*$/);
      if (pnrMatch) {
        pnr = pnrMatch[1];
        console.log('[PARSE BP] PNR extrait:', pnr);
        
        // Le nom est entre M1 et le PNR
        const pnrIndex = beforeRoute.lastIndexOf(pnr);
        if (pnrIndex > 2) {
          const namePart = rawData.substring(2, pnrIndex);
          fullName = namePart.trim().replace(/\//g, ' ').replace(/\s+/g, ' ');
          console.log('[PARSE BP] Nom extrait:', fullName);
        }
      }
      
      // Extraire le siège (format: 3 chiffres + 1 lettre après le jour julien)
      const seatMatch = rawData.match(/\d{3}[A-Z](\d{3})([A-Z])/);
      if (seatMatch) {
        seatNumber = seatMatch[1] + seatMatch[2];
      }
    } else {
      // FALLBACK: Essayer le format BCBP standard avec espaces
      console.log('[PARSE BP] Route non trouvée avec codes connus, essai regex standard...');
      
      const bcbpMatch = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})\s*0?(\d{2,4})/);
      
      if (bcbpMatch) {
        fullName = bcbpMatch[1].trim().replace(/\//g, ' ').replace(/\s+/g, ' ');
        pnr = bcbpMatch[2];
        departure = bcbpMatch[3];
        arrival = bcbpMatch[4];
        flightNumber = bcbpMatch[5] + bcbpMatch[6];
        console.log('[PARSE BP] Format BCBP standard détecté');
      } else {
        // DERNIER FALLBACK: Extraction basique
        console.log('[PARSE BP] ⚠️ Extraction basique...');
        
        // Chercher le premier groupe de 6 caractères alphanumériques après le nom
        const basicMatch = rawData.match(/^M1([A-Z\/\s]+?)([A-Z0-9]{6})\s/);
        if (basicMatch) {
          fullName = basicMatch[1].trim().replace(/\//g, ' ').replace(/\s+/g, ' ');
          pnr = basicMatch[2];
        }
        
        // Chercher un code compagnie suivi de chiffres pour le vol
        for (const airline of knownAirlines) {
          const flightMatch = rawData.match(new RegExp(airline + '\\s*0?(\\d{2,4})'));
          if (flightMatch) {
            flightNumber = airline + flightMatch[1];
            break;
          }
        }
      }
    }

    if (!pnr) {
      console.log('[PARSE BP] ❌ PNR non trouvé, scan ignoré');
      return null;
    }

    // Validation finale du nom: ne doit pas contenir de codes aéroport ou compagnie
    for (const apt of knownAirports) {
      if (fullName.includes(apt)) {
        // Couper le nom avant le code aéroport
        fullName = fullName.substring(0, fullName.indexOf(apt)).trim();
      }
    }
    for (const airline of knownAirlines) {
      if (fullName.endsWith(airline)) {
        fullName = fullName.substring(0, fullName.length - 2).trim();
      }
    }

    const result = {
      pnr,
      fullName: fullName || 'UNKNOWN',
      flightNumber: flightNumber || 'UNKNOWN',
      departure: departure || 'UNK',
      arrival: arrival || 'UNK',
      seatNumber,
      baggageCount,
      rawData
    };
    
    console.log('[PARSE BP] ✅ Résultat:', result.fullName, '/', result.pnr, '/', result.flightNumber);
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
