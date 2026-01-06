import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';
import { requireAirportCode } from '../middleware/airport-restriction.middleware';
import { birsParserService } from '../services/birs-parser.service';

const router = Router();

// GET /api/v1/birs/international-baggages - Liste des bagages internationaux
// RESTRICTION: Filtre automatiquement par aéroport de l'utilisateur
router.get('/international-baggages', requireAirportCode, async (req: Request & { userAirportCode?: string; hasFullAccess?: boolean }, res: Response, next: NextFunction) => {
  try {
    const { status, flight } = req.query;
    const airportCode = req.userAirportCode; // Peut être undefined si accès total

    let query = supabase
      .from('international_baggages')
      .select('*');
    
    // Filtrer par aéroport uniquement si l'utilisateur n'a pas accès total
    if (airportCode) {
      query = query.eq('airport_code', airportCode);
    }
    query = query.order('scanned_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/birs/reports - Liste des rapports BIRS
// RESTRICTION: Filtre automatiquement par aéroport de l'utilisateur
router.get('/reports', requireAirportCode, async (req: Request & { userAirportCode?: string; hasFullAccess?: boolean }, res: Response, next: NextFunction) => {
  try {
    const airportCode = req.userAirportCode; // Peut être undefined si accès total

    let query = supabase
      .from('birs_reports')
      .select('*');
    
    // Filtrer par aéroport uniquement si l'utilisateur n'a pas accès total
    if (airportCode) {
      query = query.eq('airport_code', airportCode);
    }
    query = query.order('uploaded_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/birs/reports/:id - Détails d'un rapport BIRS
// RESTRICTION: Vérifie que le rapport appartient à l'aéroport de l'utilisateur
router.get('/reports/:id', requireAirportCode, async (req: Request & { userAirportCode?: string; hasFullAccess?: boolean }, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const airportCode = req.userAirportCode; // Peut être undefined si accès total
    const hasFullAccess = (req as any).hasFullAccess;

    let query = supabase
      .from('birs_reports')
      .select('*')
      .eq('id', id);

    // Filtrer par aéroport uniquement si l'utilisateur n'a pas accès total
    if (airportCode && !hasFullAccess) {
      query = query.eq('airport_code', airportCode);
    }

    const { data: report, error: reportError } = await query.single();

    if (reportError) {
      if (reportError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Rapport non trouvé ou accès refusé'
        });
      }
      throw reportError;
    }

    // Vérification de sécurité si l'utilisateur n'a pas accès total
    if (!hasFullAccess && airportCode && report && report.airport_code !== airportCode) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé : Ce rapport n\'appartient pas à votre aéroport'
      });
    }

    // Récupérer les items du rapport
    const { data: items, error: itemsError } = await supabase
      .from('birs_report_items')
      .select('*')
      .eq('birs_report_id', id);

    if (itemsError) throw itemsError;

    res.json({
      success: true,
      data: {
        ...report,
        items
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/birs/statistics/:airport - Statistiques BIRS
// RESTRICTION: Vérifie que l'utilisateur a accès à cet aéroport
router.get('/statistics/:airport', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport } = req.params;
    const userAirport = req.query.airport as string;

    // Vérifier que l'utilisateur demande les stats de son propre aéroport
    if (userAirport && userAirport !== airport) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé : Vous ne pouvez accéder qu\'aux statistiques de votre aéroport'
      });
    }

    // Compter les bagages internationaux par statut
    const { data: baggages, error: baggagesError } = await supabase
      .from('international_baggages')
      .select('status')
      .eq('airport_code', airport);

    if (baggagesError) throw baggagesError;

    const statusCounts = {
      scanned: 0,
      reconciled: 0,
      unmatched: 0,
      rush: 0,
      pending: 0
    };

    baggages?.forEach(b => {
      if (b.status in statusCounts) {
        statusCounts[b.status as keyof typeof statusCounts]++;
      }
    });

    // Compter les rapports
    const { data: reports, error: reportsError } = await supabase
      .from('birs_reports')
      .select('*')
      .eq('airport_code', airport);

    if (reportsError) throw reportsError;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const reportsThisWeek = reports?.filter(r => new Date(r.uploaded_at) >= oneWeekAgo).length || 0;
    const reportsThisMonth = reports?.filter(r => new Date(r.uploaded_at) >= oneMonthAgo).length || 0;

    res.json({
      success: true,
      data: {
        airportCode: airport,
        totalInternationalBaggages: baggages?.length || 0,
        ...statusCounts,
        totalReports: reports?.length || 0,
        reportsThisWeek,
        reportsThisMonth,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/birs/upload - Upload d'un fichier BIRS
router.post('/upload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      fileName,
      fileContent,
      reportType,
      flightNumber,
      flightDate,
      origin,
      destination,
      airline,
      airlineCode,
      airportCode
    } = req.body;

    if (!fileName || !fileContent || !reportType) {
      return res.status(400).json({
        success: false,
        error: 'fileName, fileContent, and reportType are required'
      });
    }

    console.log('[BIRS Upload] Parsing file:', fileName);

    // Décoder le base64 si nécessaire
    let decodedContent = fileContent;
    if (fileContent && !fileContent.includes('\n') && fileContent.length > 100) {
      try {
        decodedContent = Buffer.from(fileContent, 'base64').toString('utf-8');
        console.log('[BIRS Upload] Decoded base64 content');
      } catch (e) {
        console.log('[BIRS Upload] Content is not base64, using as-is');
      }
    }

    // Parser le fichier pour extraire les bagages
    let parsedItems: any[] = [];
    try {
      const parsedData = await birsParserService.parseFile(fileName, decodedContent);
      parsedItems = parsedData.items;
      console.log(`[BIRS Upload] Parsed ${parsedItems.length} bagages from file`);
    } catch (parseError: any) {
      console.error('[BIRS Upload] Parse error:', parseError);
    }

    // Créer le rapport BIRS - SANS uploaded_by
    const { data: report, error: reportError } = await supabase
      .from('birs_reports')
      .insert({
        report_type: reportType,
        flight_number: flightNumber || 'UNKNOWN',
        flight_date: flightDate || new Date().toISOString().split('T')[0],
        origin: origin || 'UNKNOWN',
        destination: destination || 'UNKNOWN',
        airline: airline || 'UNKNOWN',
        airline_code: airlineCode || 'UNKNOWN',
        file_name: fileName,
        file_size: fileContent.length,
        uploaded_at: new Date().toISOString(),
        airport_code: airportCode || 'UNKNOWN',
        total_baggages: parsedItems.length,
        reconciled_count: 0,
        unmatched_count: 0,
        raw_data: JSON.stringify({ items: parsedItems, fileContent }),
        synced: true
      })
      .select()
      .single();

    if (reportError) throw reportError;

    // Insérer les items du rapport
    if (parsedItems && parsedItems.length > 0) {
      const itemsToInsert = parsedItems.map((item: any) => ({
        birs_report_id: report.id,
        bag_id: item.bagId,
        passenger_name: item.passengerName,
        pnr: item.pnr,
        seat_number: item.seatNumber,
        class: item.class,
        psn: item.psn,
        weight: item.weight,
        route: item.route,
        categories: item.categories,
        loaded: item.loaded,
        received: item.received
      }));

      const { error: itemsError } = await supabase
        .from('birs_report_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    res.status(201).json({
      success: true,
      message: 'BIRS report uploaded successfully',
      processedCount: parsedItems.length,
      data: report
    });
  } catch (error: any) {
    console.error('[BIRS Upload] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'upload du fichier BIRS',
      details: error.details || error.hint || null
    });
  }
});

// POST /api/v1/birs/reconcile/:reportId - Lancer la réconciliation
// RESTRICTION: Vérifie que le rapport appartient à l'aéroport de l'utilisateur
router.post('/reconcile/:reportId', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId } = req.params;
    const { airportCode } = req.body;
    const userAirport = req.query.airport as string || airportCode;

    if (!userAirport) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis'
      });
    }

    // Vérifier que le rapport appartient à l'aéroport de l'utilisateur
    const { data: report, error: reportError } = await supabase
      .from('birs_reports')
      .select('airport_code')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return res.status(404).json({
        success: false,
        error: 'Rapport non trouvé'
      });
    }

    if (report.airport_code !== userAirport) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé : Ce rapport n\'appartient pas à votre aéroport'
      });
    }

    // Récupérer les items du rapport
    const { data: reportItems, error: itemsError } = await supabase
      .from('birs_report_items')
      .select('*')
      .eq('birs_report_id', reportId);

    if (itemsError) throw itemsError;

    // Récupérer les bagages scannés non réconciliés (déjà filtrés par aéroport)
    const { data: scannedBags, error: bagsError } = await supabase
      .from('international_baggages')
      .select('*')
      .eq('airport_code', userAirport) // Utiliser l'aéroport validé
      .in('status', ['scanned', 'pending']);

    if (bagsError) throw bagsError;

    let matchedCount = 0;
    const matches: any[] = [];

    // Réconciliation améliorée: match par bagId, PNR, et nom de passager
    for (const item of reportItems || []) {
      // Skip si déjà réconcilié
      if (item.reconciled_at) continue;

      const matchedBag = scannedBags?.find(bag => {
        // Match exact sur tag RFID
        if (bag.tag_number === item.bag_id) return true;
        
        // Match sur PNR si disponible
        if (bag.pnr && item.pnr && bag.pnr === item.pnr) return true;
        
        // Match partiel sur nom de passager (insensible à la casse)
        if (bag.passenger_name && item.passenger_name) {
          const bagName = bag.passenger_name.toLowerCase().trim();
          const itemName = item.passenger_name.toLowerCase().trim();
          if (bagName === itemName || bagName.includes(itemName) || itemName.includes(bagName)) {
            return true;
          }
        }
        
        return false;
      });

      if (matchedBag) {
        // Mettre à jour le bagage
        await supabase
          .from('international_baggages')
          .update({
            status: 'reconciled',
            birs_report_id: reportId,
            passenger_name: item.passenger_name,
            pnr: item.pnr,
            flight_number: item.flight_number,
            reconciled_at: new Date().toISOString()
          })
          .eq('id', matchedBag.id);

        // Mettre à jour l'item du rapport
        await supabase
          .from('birs_report_items')
          .update({
            international_baggage_id: matchedBag.id,
            reconciled_at: new Date().toISOString()
          })
          .eq('id', item.id);

        matchedCount++;
        matches.push({
          baggageId: matchedBag.id,
          itemId: item.id
        });
      }
    }

    // Mettre à jour le rapport
    const totalItems = reportItems?.length || 0;
    await supabase
      .from('birs_reports')
      .update({
        reconciled_count: matchedCount,
        unmatched_count: totalItems - matchedCount,
        processed_at: new Date().toISOString()
      })
      .eq('id', reportId);

    res.json({
      success: true,
      data: {
        reportId,
        totalItems,
        matchedCount,
        unmatchedCount: totalItems - matchedCount,
        matches
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/birs/manual-reconcile - Réconciliation manuelle
// RESTRICTION: Vérifie que l'item et le bagage appartiennent à l'aéroport de l'utilisateur
router.post('/manual-reconcile', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId, baggageId, userId } = req.body;
    const airport = req.query.airport as string || req.body.airport_code;

    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis'
      });
    }

    if (!itemId || !baggageId) {
      return res.status(400).json({
        success: false,
        error: 'itemId and baggageId are required'
      });
    }

    // Récupérer l'item du rapport
    const { data: item, error: itemError } = await supabase
      .from('birs_report_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError) throw itemError;

    // Vérifier que l'item n'est pas déjà réconcilié
    if (item.reconciled_at) {
      return res.status(400).json({
        success: false,
        error: 'Cet item est déjà réconcilié'
      });
    }

    // Récupérer le rapport pour obtenir le numéro de vol
    const { data: report, error: reportError } = await supabase
      .from('birs_reports')
      .select('flight_number')
      .eq('id', item.birs_report_id)
      .single();

    if (reportError) throw reportError;

    // Récupérer le bagage avec vérification de l'aéroport
    const { data: baggage, error: baggageError } = await supabase
      .from('international_baggages')
      .select('*')
      .eq('id', baggageId)
      .eq('airport_code', airport) // FORCER le filtre par aéroport
      .single();

    if (baggageError) {
      if (baggageError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Bagage non trouvé ou accès refusé'
        });
      }
      throw baggageError;
    }

    // Double vérification de sécurité
    if (baggage && baggage.airport_code !== airport) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé : Ce bagage n\'appartient pas à votre aéroport'
      });
    }

    const now = new Date().toISOString();

    // Mettre à jour le bagage
    const { error: updateBaggageError } = await supabase
      .from('international_baggages')
      .update({
        status: 'reconciled',
        birs_report_id: item.birs_report_id,
        passenger_name: item.passenger_name,
        pnr: item.pnr,
        flight_number: report.flight_number,
        reconciled_at: now,
        reconciled_by: userId
      })
      .eq('id', baggageId);

    if (updateBaggageError) throw updateBaggageError;

    // Mettre à jour l'item du rapport
    const { error: updateItemError } = await supabase
      .from('birs_report_items')
      .update({
        international_baggage_id: baggageId,
        reconciled_at: now
      })
      .eq('id', itemId);

    if (updateItemError) throw updateItemError;

    // Mettre à jour les statistiques du rapport
    const { data: reportItems } = await supabase
      .from('birs_report_items')
      .select('id, reconciled_at')
      .eq('birs_report_id', item.birs_report_id);

    const reconciledCount = reportItems?.filter(i => i.reconciled_at).length || 0;

    await supabase
      .from('birs_reports')
      .update({
        reconciled_count: reconciledCount,
        unmatched_count: (reportItems?.length || 0) - reconciledCount
      })
      .eq('id', item.birs_report_id);

    res.json({
      success: true,
      message: 'Réconciliation manuelle effectuée avec succès'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/birs/reports/:id/export - Export Excel d'un rapport
// RESTRICTION: Vérifie que le rapport appartient à l'aéroport de l'utilisateur
router.get('/reports/:id/export', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const airport = req.query.airport as string;

    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis'
      });
    }

    // Vérifier que le rapport appartient à l'aéroport
    const { data: reportCheck, error: checkError } = await supabase
      .from('birs_reports')
      .select('airport_code')
      .eq('id', id)
      .single();

    if (checkError || !reportCheck) {
      return res.status(404).json({
        success: false,
        error: 'Rapport non trouvé'
      });
    }

    if (reportCheck.airport_code !== airport) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé : Ce rapport n\'appartient pas à votre aéroport'
      });
    }

    // Récupérer le rapport avec ses items
    const { data: report, error: reportError } = await supabase
      .from('birs_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (reportError) throw reportError;

    const { data: items, error: itemsError } = await supabase
      .from('birs_report_items')
      .select('*')
      .eq('birs_report_id', id)
      .order('passenger_name', { ascending: true });

    if (itemsError) throw itemsError;

    // Créer un fichier CSV simple (plus léger que Excel)
    const csvRows: string[] = [];
    
    // En-têtes
    csvRows.push([
      'Tag Bagage',
      'Nom Passager',
      'PNR',
      'Siège',
      'Classe',
      'Poids (kg)',
      'Route',
      'Statut',
      'Date Réconciliation'
    ].join(','));

    // Données
    items?.forEach(item => {
      csvRows.push([
        item.bag_id || '',
        item.passenger_name || '',
        item.pnr || '',
        item.seat_number || '',
        item.class || '',
        item.weight?.toString() || '',
        item.route || '',
        item.reconciled_at ? 'Réconcilié' : 'Non matché',
        item.reconciled_at ? new Date(item.reconciled_at).toLocaleString('fr-FR') : ''
      ].map(v => `"${v}"`).join(','));
    });

    const csvContent = csvRows.join('\n');
    const buffer = Buffer.from('\ufeff' + csvContent, 'utf8'); // BOM pour Excel

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="BRS_Report_${report.flight_number}_${report.flight_date}.csv"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

export default router;
