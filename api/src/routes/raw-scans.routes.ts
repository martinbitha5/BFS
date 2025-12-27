import { Request, Response, Router, NextFunction } from 'express';
import { supabase } from '../config/database';
import { restrictToAirport, requireAirportCode } from '../middleware/airport-restriction.middleware';
import { validateBoardingPassScan, validateBaggageScan } from '../middleware/scan-validation.middleware';
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
 * POST /api/v1/raw-scans (sync depuis l'app mobile)
 * Créer ou mettre à jour un scan brut
 * VALIDATION: Vérifie que le vol est programmé avant d'accepter le scan
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

        // VALIDATION: Si c'est un boarding pass (check-in), valider le vol
        if (scan_type === 'boarding_pass' && status_checkin) {
            const { validateFlightForScan } = await import('../middleware/scan-validation.middleware');
            
            // Extraire le numéro de vol du boarding pass
            const flightMatch = raw_data.match(/\b([A-Z]{2,3}\d{2,4})\b/);
            if (flightMatch) {
                const flightNumber = flightMatch[1];
                const validation = await validateFlightForScan(flightNumber, airport_code);

                if (!validation.valid) {
                    return res.status(403).json({
                        success: false,
                        error: validation.reason || 'Vol non programmé',
                        rejected: true,
                        flightNumber,
                        message: `Le scan a été refusé car le vol ${flightNumber} n'est pas programmé à l'aéroport ${airport_code}`
                    });
                }
            }
        }

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

        // Création
        const { data, error } = await supabase
            .from('raw_scans')
            .insert({
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
                ...restData,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating raw scan:', error);
            return res.status(500).json({ error: 'Erreur lors de la création' });
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
