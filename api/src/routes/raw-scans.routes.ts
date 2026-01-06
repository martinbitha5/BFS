import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';
import { requireAirportCode } from '../middleware/airport-restriction.middleware';
import { notifyRawScan, notifyStatsUpdate } from './realtime.routes';

const router = Router();

/**
 * GET /api/v1/raw-scans?airport=XXX&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&status=checkin
 * Récupérer les scans bruts avec filtres
 * RESTRICTION: Nécessite le code aéroport et filtre automatiquement par aéroport
 */
router.get('/', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { airport, start_date, end_date, status, scan_type } = req.query;

        // Le middleware requireAirportCode garantit que airport existe
        if (!airport) {
            return res.status(400).json({ error: 'Le code aéroport est requis' });
        }

        let query = supabase
            .from('raw_scans')
            .select('*')
            .eq('airport_code', airport)
            .order('last_scanned_at', { ascending: false });

        // Filtre par dates
        if (start_date) {
            query = query.gte('first_scanned_at', start_date);
        }
        if (end_date) {
            query = query.lte('first_scanned_at', end_date);
        }

        // Filtre par statut
        if (status) {
            const statusField = `status_${status}`;
            query = query.eq(statusField, true);
        }

        // Filtre par type de scan
        if (scan_type) {
            query = query.eq('scan_type', scan_type);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching raw scans:', error);
            return res.status(500).json({ error: 'Erreur lors de la récupération des scans' });
        }

        res.json({
            success: true,
            data: data || [],
            count: count || data?.length || 0,
        });
    } catch (err: any) {
        console.error('Error in GET /raw-scans:', err);
        next(err);
    }
});

/**
 * GET /api/v1/raw-scans/stats?airport=XXX
 * Statistiques des scans bruts
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { airport } = req.query;

        if (!airport) {
            return res.status(400).json({ error: 'Le code aéroport est requis' });
        }

        // Requête pour compter les statuts
        const { data, error } = await supabase
            .from('raw_scans')
            .select('*')
            .eq('airport_code', airport);

        if (error) {
            console.error('Error fetching stats:', error);
            return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
        }

        const stats = {
            total: data?.length || 0,
            by_type: {
                boarding_pass: data?.filter(s => s.scan_type === 'boarding_pass').length || 0,
                baggage_tag: data?.filter(s => s.scan_type === 'baggage_tag').length || 0,
            },
            by_status: {
                checkin: data?.filter(s => s.status_checkin).length || 0,
                baggage: data?.filter(s => s.status_baggage).length || 0,
                boarding: data?.filter(s => s.status_boarding).length || 0,
                arrival: data?.filter(s => s.status_arrival).length || 0,
            },
        };

        res.json({
            success: true,
            data: stats,
        });
    } catch (err: any) {
        console.error('Error in GET /raw-scans/stats:', err);
        next(err);
    }
});

/**
 * Parse un boarding pass BCBP pour extraire les infos passager
 */
function parseBoardingPass(rawData: string): any {
    try {
        if (!rawData || !rawData.startsWith('M')) return null;

        let fullName = 'UNKNOWN';
        let pnr = null;
        let departure = null;
        let arrival = null;
        let flightNumber = null;
        let seatNumber = null;
        let baggageCount = 0;

        // Pattern BCBP
        let match = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6,7})\s+([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})\s*(\d{3,4})/);
        if (!match) {
            match = rawData.match(/^M1([A-Z\/\s]+?)\s+([A-Z0-9]{6})\s*([A-Z]{3})([A-Z]{3})([A-Z]{2})\s*(\d{3,4})/);
        }
        
        if (match) {
            fullName = match[1].trim().replace(/\//g, ' ').replace(/\s+/g, ' ');
            pnr = match[2];
            departure = match[3];
            arrival = match[4];
            flightNumber = match[5] + match[6];
        } else {
            // Extraction basique
            const pnrMatch = rawData.match(/([A-Z0-9]{6})/);
            if (pnrMatch) pnr = pnrMatch[1];
            const nameMatch = rawData.match(/^M1([A-Z\/\s]+)/);
            if (nameMatch) fullName = nameMatch[1].trim().replace(/\//g, ' ').substring(0, 50);
        }

        // Nombre de bagages
        const bagMatch = rawData.match(/(\d)PC/i);
        if (bagMatch) baggageCount = parseInt(bagMatch[1], 10);

        if (!pnr) return null;

        return { fullName, pnr, departure, arrival, flightNumber, seatNumber, baggageCount };
    } catch (err) {
        console.error('[PARSE] Erreur parsing BP:', err);
        return null;
    }
}

/**
 * POST /api/v1/raw-scans (sync depuis l'app mobile)
 * Créer ou mettre à jour un scan brut
 * ✅ CRÉE IMMÉDIATEMENT les passagers/bagages pour que le Dashboard les affiche
 */
router.post('/', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            raw_data,
            scan_type,
            status_checkin,
            status_baggage,
            status_boarding,
            status_arrival,
            airport_code,
            ...restData
        } = req.body;

        if (!raw_data || !scan_type || !airport_code) {
            return res.status(400).json({
                error: 'Données manquantes (raw_data, scan_type, airport_code requis)',
            });
        }

        console.log(`[RAW-SCAN] Reçu: type=${scan_type}, airport=${airport_code}, checkin=${status_checkin}, baggage=${status_baggage}`);

        // ============================================
        // ✅ CRÉATION IMMÉDIATE DES PASSAGERS/BAGAGES
        // ============================================
        
        // Si c'est un boarding pass au CHECK-IN → créer le passager
        if (scan_type === 'boarding_pass' && status_checkin) {
            const parsed = parseBoardingPass(raw_data);
            if (parsed && parsed.pnr) {
                console.log(`[RAW-SCAN] Passager détecté: ${parsed.fullName} (${parsed.pnr})`);
                
                // Vérifier si passager existe
                const { data: existingPax } = await supabase
                    .from('passengers')
                    .select('id')
                    .eq('pnr', parsed.pnr)
                    .eq('airport_code', airport_code)
                    .single();

                if (!existingPax) {
                    // Créer le passager
                    const { data: newPax, error: paxError } = await supabase
                        .from('passengers')
                        .insert({
                            full_name: parsed.fullName,
                            pnr: parsed.pnr,
                            flight_number: parsed.flightNumber || 'UNKNOWN',
                            departure: parsed.departure || airport_code,
                            arrival: parsed.arrival || 'UNK',
                            seat_number: parsed.seatNumber,
                            baggage_count: parsed.baggageCount || 0,
                            checked_in_at: restData.checkin_at || new Date().toISOString(),
                            airport_code: airport_code
                        })
                        .select()
                        .single();

                    if (paxError) {
                        console.error('[RAW-SCAN] Erreur création passager:', paxError);
                    } else {
                        console.log(`[RAW-SCAN] ✅ Passager créé: ${parsed.pnr}`);
                    }
                } else {
                    console.log(`[RAW-SCAN] Passager existe déjà: ${parsed.pnr}`);
                }
            }
        }

        // Si c'est un boarding pass à l'EMBARQUEMENT → mettre à jour boarding_status
        if (scan_type === 'boarding_pass' && status_boarding) {
            const parsed = parseBoardingPass(raw_data);
            if (parsed && parsed.pnr) {
                const { data: pax } = await supabase
                    .from('passengers')
                    .select('id')
                    .eq('pnr', parsed.pnr)
                    .eq('airport_code', airport_code)
                    .single();

                if (pax) {
                    await supabase
                        .from('boarding_status')
                        .upsert({
                            passenger_id: pax.id,
                            boarded: true,
                            boarded_at: restData.boarding_at || new Date().toISOString()
                        }, { onConflict: 'passenger_id' });
                    console.log(`[RAW-SCAN] ✅ Passager embarqué: ${parsed.pnr}`);
                }
            }
        }

        // Si c'est un BAGGAGE TAG → créer le bagage et lier au passager
        if (scan_type === 'baggage_tag' && status_baggage && restData.baggage_rfid_tag) {
            const tagNumber = restData.baggage_rfid_tag;
            console.log(`[RAW-SCAN] Bagage détecté: ${tagNumber}`);

            // Vérifier si bagage existe
            const { data: existingBag } = await supabase
                .from('baggages')
                .select('id')
                .eq('tag_number', tagNumber)
                .single();

            if (!existingBag) {
                // Chercher le passager par flight_number et baggage_count
                // Extraire le vol du raw_data si possible
                const flightMatch = raw_data.match(/\b([A-Z]{2,3}\d{2,4})\b/);
                const flightNumber = flightMatch ? flightMatch[1] : null;
                
                let passengerId = null;
                
                if (flightNumber) {
                    // Chercher un passager sur ce vol avec des bagages manquants
                    const { data: passengers } = await supabase
                        .from('passengers')
                        .select('id, pnr, full_name, baggage_count, baggages(id)')
                        .eq('airport_code', airport_code)
                        .ilike('flight_number', `%${flightNumber.replace(/^[A-Z]{2}0*/, '')}%`);

                    if (passengers) {
                        for (const pax of passengers) {
                            const linkedCount = pax.baggages?.length || 0;
                            const expected = pax.baggage_count || 0;
                            if (linkedCount < expected) {
                                passengerId = pax.id;
                                console.log(`[RAW-SCAN] Bagage lié au passager: ${pax.full_name}`);
                                break;
                            }
                        }
                    }
                }

                // Créer le bagage
                const { error: bagError } = await supabase
                    .from('baggages')
                    .insert({
                        tag_number: tagNumber,
                        passenger_id: passengerId,
                        status: 'checked',
                        flight_number: flightNumber,
                        airport_code: airport_code,
                        checked_at: restData.baggage_at || new Date().toISOString()
                    });

                if (bagError) {
                    console.error('[RAW-SCAN] Erreur création bagage:', bagError);
                } else {
                    console.log(`[RAW-SCAN] ✅ Bagage créé: ${tagNumber}`);
                }
            } else {
                console.log(`[RAW-SCAN] Bagage existe déjà: ${tagNumber}`);
            }
        }

        // ============================================
        // Sauvegarde du raw_scan (comme avant)
        // ============================================

        // Vérifier si le scan existe déjà  
        const { data: existing, error: existingError } = await supabase
            .from('raw_scans')
            .select('id, scan_count, status_checkin, status_baggage, status_boarding, status_arrival')
            .eq('raw_data', raw_data)
            .single();

        // Ignorer l'erreur PGRST116 (no rows returned) - c'est normal si le scan n'existe pas
        if (existingError && existingError.code !== 'PGRST116') {
            console.error('Error checking existing scan:', existingError);
            return res.status(500).json({ error: 'Erreur lors de la vérification du scan' });
        }

        if (existing) {
            // Mise à jour
            const { data, error } = await supabase
                .from('raw_scans')
                .update({
                    ...restData,
                    status_checkin: status_checkin || existing.status_checkin,
                    status_baggage: status_baggage || existing.status_baggage,
                    status_boarding: status_boarding || existing.status_boarding,
                    status_arrival: status_arrival || existing.status_arrival,
                    scan_count: existing.scan_count + 1,
                    last_scanned_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) {
                console.error('Error updating raw scan:', error);
                return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
            }

            // ✅ TEMPS RÉEL: Notifier les clients SSE
            notifyRawScan(airport_code, data);
            notifyStatsUpdate(airport_code);

            return res.json({
                success: true,
                data,
                is_new: false,
            });
        }

        // Création - Filtrer les colonnes valides pour PostgreSQL
        const insertData: Record<string, any> = {
            raw_data,
            scan_type,
            status_checkin: status_checkin || false,
            status_baggage: status_baggage || false,
            status_boarding: status_boarding || false,
            status_arrival: status_arrival || false,
            airport_code,
            first_scanned_at: new Date().toISOString(),
            last_scanned_at: new Date().toISOString(),
            scan_count: 1,
        };

        // Ajouter les colonnes optionnelles si elles sont présentes et valides
        // Note: Les colonnes *_by sont des UUID qui référencent users(id)
        // On ne les inclut que si elles sont des UUID valides
        if (restData.checkin_at) insertData.checkin_at = restData.checkin_at;
        if (restData.baggage_at) insertData.baggage_at = restData.baggage_at;
        if (restData.baggage_rfid_tag) insertData.baggage_rfid_tag = restData.baggage_rfid_tag;
        if (restData.boarding_at) insertData.boarding_at = restData.boarding_at;
        if (restData.arrival_at) insertData.arrival_at = restData.arrival_at;
        
        // Les colonnes *_by référencent users(id) - ne pas les inclure pour éviter les erreurs FK
        // L'API utilise le contexte auth pour identifier l'utilisateur

        const { data, error } = await supabase
            .from('raw_scans')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('Error creating raw scan:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            console.error('Data sent:', JSON.stringify({
                raw_data,
                scan_type,
                status_checkin,
                status_baggage,
                status_boarding,
                status_arrival,
                airport_code,
                ...restData,
            }, null, 2));
            return res.status(500).json({ 
                error: 'Erreur lors de la création',
                details: error.message || error.code,
                hint: error.hint
            });
        }

        // ✅ TEMPS RÉEL: Notifier les clients SSE d'un nouveau scan
        notifyRawScan(airport_code, data);
        notifyStatsUpdate(airport_code);

        res.status(201).json({
            success: true,
            data,
            is_new: true,
        });
    } catch (err: any) {
        console.error('Error in POST /raw-scans:', err);
        next(err);
    }
});

export default router;
