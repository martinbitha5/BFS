import { supabase } from '../config/database';
import { logAudit } from './audit.service';

// Cache pour éviter de re-sync trop souvent (5 minutes)
const syncCache: Map<string, number> = new Map();
const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Auto-sync si la table passengers/baggages est vide mais que des raw_scans existent
 * Cette fonction est appelée automatiquement par les routes passengers et baggages
 */
export async function autoSyncIfNeeded(airportCode: string): Promise<boolean> {
  try {
    // Vérifier le cache pour éviter trop de syncs
    const lastSync = syncCache.get(airportCode);
    if (lastSync && Date.now() - lastSync < SYNC_COOLDOWN_MS) {
      return false; // Sync récent, ne pas re-sync
    }

    // Vérifier s'il y a des passagers pour cet aéroport
    const { count: passengerCount } = await supabase
      .from('passengers')
      .select('*', { count: 'exact', head: true })
      .eq('airport_code', airportCode);

    // S'il y a déjà des passagers, pas besoin de sync
    if (passengerCount && passengerCount > 0) {
      return false;
    }

    // Vérifier s'il y a des raw_scans pour cet aéroport
    const { count: rawScansCount } = await supabase
      .from('raw_scans')
      .select('*', { count: 'exact', head: true })
      .eq('airport_code', airportCode);

    if (!rawScansCount || rawScansCount === 0) {
      return false; // Pas de raw_scans à traiter
    }

    console.log(`[AUTO-SYNC] Déclenchement automatique pour ${airportCode} (${rawScansCount} raw_scans trouvés)`);

    // Mettre à jour le cache avant le sync pour éviter les doublons
    syncCache.set(airportCode, Date.now());

    // Déclencher la synchronisation (en arrière-plan, ne pas bloquer)
    performSyncInBackground(airportCode);

    return true;
  } catch (err) {
    console.error('[AUTO-SYNC] Erreur:', err);
    return false;
  }
}

/**
 * Parse simple d'un boarding pass BCBP
 */
function parseSimpleBoardingPass(rawData: string): any {
  try {
    if (!rawData || !rawData.startsWith('M')) {
      return null;
    }

    let fullName = 'UNKNOWN';
    let pnr = null;
    let departure = null;
    let arrival = null;
    let flightNumber = null;
    let seatNumber = null;
    let baggageCount = 0;

    // Format BCBP standard
    let bcbpMatch = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})\s+(\d{3,4})\s+(\d{3})([A-Z])(\d{3})([A-Z])(\d{4})/);
    
    if (!bcbpMatch) {
      bcbpMatch = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6})\s+([A-Z]{3})([A-Z]{3})([A-Z]{2})\s*(\d{3,4})/);
    }
    
    if (bcbpMatch) {
      fullName = bcbpMatch[1].trim().replace(/\//g, ' ').replace(/\s+/g, ' ');
      pnr = bcbpMatch[2];
      departure = bcbpMatch[3];
      arrival = bcbpMatch[4];
      const companyCode = bcbpMatch[5];
      const flightNum = bcbpMatch[6];
      flightNumber = companyCode + flightNum;
      
      if (bcbpMatch[8] && bcbpMatch[9]) {
        seatNumber = bcbpMatch[9] + bcbpMatch[8];
      }
    } else {
      // Fallback: extraction basique
      const pnrMatch = rawData.match(/([A-Z0-9]{6})/);
      if (pnrMatch) {
        pnr = pnrMatch[1];
      }
      
      const nameMatch = rawData.match(/^M1([A-Z\/\s]+)/);
      if (nameMatch) {
        fullName = nameMatch[1].trim().replace(/\//g, ' ').replace(/\s+/g, ' ').substring(0, 50);
      }
    }

    // Extraction du nombre de bagages
    const bagMatch = rawData.match(/(\d)PC/i);
    if (bagMatch) {
      baggageCount = parseInt(bagMatch[1], 10);
    }

    if (!pnr) return null;

    return {
      fullName,
      pnr,
      departure,
      arrival,
      flightNumber,
      seatNumber,
      baggageCount
    };
  } catch (err) {
    console.error('[AUTO-SYNC PARSE] Erreur:', err);
    return null;
  }
}

/**
 * Effectue la synchronisation en arrière-plan
 */
async function performSyncInBackground(airportCode: string): Promise<void> {
  try {
    // Récupérer tous les raw_scans pour cet aéroport
    const { data: rawScans, error: scanError } = await supabase
      .from('raw_scans')
      .select('*')
      .eq('airport_code', airportCode)
      .order('created_at', { ascending: false });

    if (scanError || !rawScans || rawScans.length === 0) {
      return;
    }

    console.log(`[AUTO-SYNC] ${rawScans.length} raw_scans à traiter pour ${airportCode}`);

    let passengersCreated = 0;
    let baggagesCreated = 0;

    // Parser chaque raw_scan de type boarding_pass pour créer les passagers
    for (const scan of rawScans) {
      if (scan.scan_type === 'boarding_pass' && scan.raw_data) {
        const parsed = parseSimpleBoardingPass(scan.raw_data);
        
        if (parsed && parsed.pnr) {
          // Vérifier si le passager existe déjà
          const { data: existing } = await supabase
            .from('passengers')
            .select('id')
            .eq('pnr', parsed.pnr)
            .eq('airport_code', airportCode)
            .single();

          if (!existing) {
            // Créer le passager
            const { data: newPassenger, error: passError } = await supabase
              .from('passengers')
              .insert({
                full_name: parsed.fullName || 'UNKNOWN',
                pnr: parsed.pnr,
                flight_number: parsed.flightNumber || 'UNKNOWN',
                departure: parsed.departure || airportCode,
                arrival: parsed.arrival || 'UNK',
                seat_number: parsed.seatNumber,
                baggage_count: parsed.baggageCount || 0,
                checked_in_at: scan.checkin_at || scan.created_at,
                airport_code: airportCode
              })
              .select()
              .single();

            if (!passError && newPassenger) {
              passengersCreated++;

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
                      airport_code: airportCode,
                      checked_at: scan.checkin_at || scan.created_at
                    });

                  if (!bagError) {
                    baggagesCreated++;
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log(`[AUTO-SYNC] Terminé pour ${airportCode}: ${passengersCreated} passagers, ${baggagesCreated} bagages créés`);

    // Enregistrer dans l'audit log si des données ont été créées
    if (passengersCreated > 0 || baggagesCreated > 0) {
      await logAudit({
        action: 'SYNC_RAW_SCANS',
        entityType: 'raw_scan',
        description: `Synchronisation automatique: ${passengersCreated} passager(s), ${baggagesCreated} bagage(s) créé(s)`,
        airportCode,
        metadata: { passengersCreated, baggagesCreated, rawScansProcessed: rawScans.length }
      });
    }
  } catch (err) {
    console.error('[AUTO-SYNC] Erreur lors de la sync:', err);
  }
}
