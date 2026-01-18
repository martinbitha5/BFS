import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';

const router = Router();

/**
 * Route publique pour tracker un bagage
 * Accepte PNR ou tag RFID
 * GET /api/v1/public/track?pnr=ABC123
 * GET /api/v1/public/track?tag=RF123456
 */
router.get('/track', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pnr, tag } = req.query;

    if (!pnr && !tag) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez fournir un PNR ou un numéro de bagage'
      });
    }

    const allBaggages: any[] = [];
    let passengerInfo: any = null;
    
    // Normaliser les paramètres de query (peuvent être string, array, ou undefined)
    let normalizedPnr: string | null = null;
    let normalizedTag: string | null = null;
    
    if (typeof pnr === 'string') {
      normalizedPnr = pnr.toUpperCase();
    } else if (Array.isArray(pnr)) {
      normalizedPnr = (pnr[0] as string)?.toUpperCase() || null;
    }
    
    if (typeof tag === 'string') {
      normalizedTag = tag.toUpperCase();
    } else if (Array.isArray(tag)) {
      normalizedTag = (tag[0] as string)?.toUpperCase() || null;
    }
    
    const searchPnr = normalizedPnr;

    console.log('[TRACK] Recherche avec PNR:', searchPnr, 'ou TAG:', normalizedTag);

    // 1. Rechercher dans les bagages nationaux
    if (searchPnr) {
      // D'abord trouver le passager par PNR
      const { data: passenger, error: passengerError } = await supabase
        .from('passengers')
        .select('id, full_name, pnr, flight_number, departure, arrival')
        .eq('pnr', searchPnr)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      console.log('[TRACK] Passager national trouvé:', passenger, 'Erreur:', passengerError?.message);

      if (passenger && !passengerError) {
        passengerInfo = {
          passenger_name: passenger.full_name,
          pnr: passenger.pnr,
          flight_number: passenger.flight_number,
          origin: passenger.departure,
          destination: passenger.arrival
        };

        // Ensuite récupérer TOUS les bagages de ce passager par passenger_id
        const { data: nationalBaggages, error: nationalError } = await supabase
          .from('baggages')
          .select('id, tag_number, status, weight, current_location, last_scanned_at')
          .eq('passenger_id', passenger.id)
          .order('created_at', { ascending: false });

        console.log('[TRACK] Bagages par passenger_id:', nationalBaggages?.length || 0);

        if (nationalBaggages && nationalBaggages.length > 0 && !nationalError) {
          for (const bag of nationalBaggages) {
            allBaggages.push({
              bag_id: bag.tag_number,
              status: bag.status,
              weight: bag.weight,
              current_location: bag.current_location,
              last_scanned_at: bag.last_scanned_at,
              baggage_type: 'national'
            });
          }
        }

        // Si aucun bagage trouvé par passenger_id, chercher les bagages orphelins du même vol
        // (bagages avec passenger_id NULL mais même flight_number)
        if (allBaggages.length === 0 && passenger.flight_number) {
          const { data: orphanBaggages, error: orphanError } = await supabase
            .from('baggages')
            .select('id, tag_number, status, weight, current_location, last_scanned_at')
            .is('passenger_id', null)
            .eq('flight_number', passenger.flight_number)
            .order('created_at', { ascending: false });

          console.log('[TRACK] Bagages orphelins même vol:', orphanBaggages?.length || 0);

          if (orphanBaggages && orphanBaggages.length > 0 && !orphanError) {
            // Calculer combien de bagages pour ce passager basé sur baggage_count
            const passengerBaggageCount = (passenger as any).baggage_count || orphanBaggages.length;
            
            // Prendre les bagages orphelins (on ne peut pas savoir exactement lesquels appartiennent à qui)
            // Pour l'instant, on affiche tous les bagages orphelins du vol
            for (const bag of orphanBaggages) {
              allBaggages.push({
                bag_id: bag.tag_number,
                status: bag.status,
                weight: bag.weight,
                current_location: bag.current_location,
                last_scanned_at: bag.last_scanned_at,
                baggage_type: 'national',
                note: 'Bagage du vol (non lié individuellement)'
              });
            }
          }
        }
      }
    } else if (normalizedTag) {
      // Rechercher par tag RFID - retourne un seul bagage
      const { data: nationalBaggage, error: nationalError } = await supabase
        .from('baggages')
        .select(`
          id,
          tag_number,
          status,
          weight,
          current_location,
          last_scanned_at,
          passengers!inner (
            full_name,
            pnr,
            flight_number,
            departure,
            arrival
          )
        `)
        .ilike('tag_number', normalizedTag)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (nationalBaggage && !nationalError) {
        const passenger = (nationalBaggage as any).passengers;
        passengerInfo = {
          passenger_name: passenger.full_name,
          pnr: passenger.pnr,
          flight_number: passenger.flight_number,
          origin: passenger.departure,
          destination: passenger.arrival
        };
        allBaggages.push({
          bag_id: nationalBaggage.tag_number,
          status: nationalBaggage.status,
          weight: nationalBaggage.weight,
          current_location: nationalBaggage.current_location,
          last_scanned_at: nationalBaggage.last_scanned_at,
          baggage_type: 'national'
        });
      }
    }

    // 2. Chercher aussi dans bagages internationaux (pour PNR, ajouter aux résultats)
    if (searchPnr) {
      const { data: internationalBaggages, error: intlError } = await supabase
        .from('international_baggages')
        .select('*')
        .ilike('pnr', searchPnr)
        .order('created_at', { ascending: false });

      console.log('[TRACK] Bagages internationaux trouvés:', internationalBaggages?.length, 'Erreur:', intlError?.message);

      if (internationalBaggages && internationalBaggages.length > 0 && !intlError) {
        if (!passengerInfo) {
          passengerInfo = {
            passenger_name: internationalBaggages[0].passenger_name || 'Passager international',
            pnr: internationalBaggages[0].pnr,
            flight_number: internationalBaggages[0].flight_number,
            origin: null,
            destination: null
          };
        }
        for (const bag of internationalBaggages) {
          allBaggages.push({
            bag_id: bag.tag_number,
            status: bag.status,
            weight: bag.weight,
            current_location: bag.airport_code,
            last_scanned_at: bag.scanned_at,
            baggage_type: 'international'
          });
        }
      }
    } else if (normalizedTag && allBaggages.length === 0) {
      // Si recherche par tag et rien trouvé dans national
      const { data: internationalBaggage, error: intlError } = await supabase
        .from('international_baggages')
        .select('*')
        .ilike('tag_number', normalizedTag)
        .limit(1)
        .single();

      if (internationalBaggage && !intlError) {
        passengerInfo = {
          passenger_name: internationalBaggage.passenger_name || 'Passager international',
          pnr: internationalBaggage.pnr,
          flight_number: internationalBaggage.flight_number,
          origin: null,
          destination: null
        };
        allBaggages.push({
          bag_id: internationalBaggage.tag_number,
          status: internationalBaggage.status,
          weight: internationalBaggage.weight,
          current_location: internationalBaggage.airport_code,
          last_scanned_at: internationalBaggage.scanned_at,
          baggage_type: 'international'
        });
      }
    }

    // 3. Chercher dans les rapports BIRS
    // IMPORTANT: Si un bagage est dans un rapport BIRS, ça signifie que le vol est arrivé
    // Donc le statut par défaut est "arrived" (le manifeste = preuve d'arrivée)
    if (searchPnr) {
      const { data: birsItems, error: birsError } = await supabase
        .from('birs_report_items')
        .select(`
          id,
          bag_id,
          weight,
          passenger_name,
          pnr,
          received,
          loaded,
          reconciled_at,
          international_baggage_id,
          created_at,
          birs_reports!inner (
            flight_number,
            origin,
            destination,
            uploaded_at
          )
        `)
        .ilike('pnr', searchPnr)
        .order('created_at', { ascending: false });

      console.log('[TRACK] BIRS items trouvés:', birsItems?.length, 'Erreur:', birsError?.message);

      if (birsItems && birsItems.length > 0 && !birsError) {
        for (const item of birsItems) {
          const birsReport = (item as any).birs_reports;
          
          // Éviter les doublons: si ce bagage est déjà lié à un international_baggage, on skip
          // car il sera déjà dans la liste via la recherche international_baggages
          const alreadyInList = allBaggages.some(b => b.bag_id === item.bag_id);
          if (alreadyInList) continue;
          
          // Le rapport BIRS = le vol est arrivé = bagage arrivé par défaut
          // Si réconcilié = "delivered" (récupéré par le passager)
          let status = 'arrived'; // Par défaut: arrivé (le manifeste existe = vol arrivé)
          if (item.reconciled_at) {
            status = 'delivered'; // Réconcilié = bagage remis au passager
          }

          if (!passengerInfo) {
            passengerInfo = {
              passenger_name: item.passenger_name || 'Passager international',
              pnr: item.pnr,
              flight_number: birsReport.flight_number,
              origin: birsReport.origin,
              destination: birsReport.destination
            };
          }
          allBaggages.push({
            bag_id: item.bag_id,
            status: status,
            weight: item.weight,
            current_location: birsReport.destination,
            last_scanned_at: birsReport.uploaded_at, // Date d'upload du rapport = date d'arrivée
            baggage_type: 'birs',
            origin: birsReport.origin,
            destination: birsReport.destination
          });
        }
      }
    } else if (normalizedTag && allBaggages.length === 0) {
      const { data: birsItem, error: birsError } = await supabase
        .from('birs_report_items')
        .select(`
          id,
          bag_id,
          weight,
          passenger_name,
          pnr,
          received,
          loaded,
          reconciled_at,
          created_at,
          birs_reports!inner (
            flight_number,
            origin,
            destination,
            uploaded_at
          )
        `)
        .ilike('bag_id', normalizedTag)
        .limit(1)
        .single();

      if (birsItem && !birsError) {
        const birsReport = (birsItem as any).birs_reports;
        
        // Le rapport BIRS existe = bagage arrivé
        let status = 'arrived';
        if (birsItem.reconciled_at) {
          status = 'delivered';
        }

        passengerInfo = {
          passenger_name: birsItem.passenger_name || 'Passager international',
          pnr: birsItem.pnr,
          flight_number: birsReport.flight_number,
          origin: birsReport.origin,
          destination: birsReport.destination
        };
        allBaggages.push({
          bag_id: birsItem.bag_id,
          status: status,
          weight: birsItem.weight,
          current_location: birsReport.destination,
          last_scanned_at: birsReport.uploaded_at,
          baggage_type: 'birs',
          origin: birsReport.origin,
          destination: birsReport.destination
        });
      }
    }

    // 4. Aucun bagage trouvé
    console.log('[TRACK] Total bagages trouvés:', allBaggages.length);
    if (allBaggages.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucun bagage trouvé avec ces informations. Vérifiez votre PNR ou numéro de bagage.'
      });
    }

    // Calculer le résumé des statuts
    const statusSummary = {
      total: allBaggages.length,
      arrived: allBaggages.filter(b => b.status === 'arrived' || b.status === 'delivered').length,
      in_transit: allBaggages.filter(b => b.status === 'in_transit' || b.status === 'loaded').length,
      checked: allBaggages.filter(b => b.status === 'checked' || b.status === 'scanned').length,
      rush: allBaggages.filter(b => b.status === 'rush').length,
      lost: allBaggages.filter(b => b.status === 'lost' || b.status === 'unmatched').length,
    };

    return res.json({
      success: true,
      data: {
        passenger_name: passengerInfo?.passenger_name || 'N/A',
        pnr: passengerInfo?.pnr || 'N/A',
        flight_number: passengerInfo?.flight_number || 'N/A',
        origin: passengerInfo?.origin,
        destination: passengerInfo?.destination,
        summary: statusSummary,
        baggages: allBaggages
      }
    });

  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Erreur lors de la recherche du bagage:', error);
    }
    next(error);
  }
});

export default router;
