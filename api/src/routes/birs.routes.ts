import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';

const router = Router();

// GET /api/v1/birs/international-baggages - Liste des bagages internationaux
router.get('/international-baggages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport, status, flight } = req.query;

    let query = supabase
      .from('international_baggages')
      .select('*')
      .order('scanned_at', { ascending: false });

    if (airport) {
      query = query.eq('airport_code', airport);
    }

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
router.get('/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport } = req.query;

    let query = supabase
      .from('birs_reports')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (airport) {
      query = query.eq('airport_code', airport);
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

// GET /api/v1/birs/reports/:id - Détails d'un rapport BIRS
router.get('/reports/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data: report, error: reportError } = await supabase
      .from('birs_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (reportError) throw reportError;

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
router.get('/statistics/:airport', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport } = req.params;

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
      uploadedBy,
      airportCode,
      items
    } = req.body;

    if (!fileName || !fileContent || !reportType) {
      return res.status(400).json({
        success: false,
        error: 'fileName, fileContent, and reportType are required'
      });
    }

    // Créer le rapport BIRS
    const { data: report, error: reportError } = await supabase
      .from('birs_reports')
      .insert({
        report_type: reportType,
        flight_number: flightNumber,
        flight_date: flightDate,
        origin,
        destination,
        airline,
        airline_code: airlineCode,
        file_name: fileName,
        file_size: fileContent.length,
        uploaded_at: new Date().toISOString(),
        uploaded_by: uploadedBy,
        airport_code: airportCode,
        total_baggages: items?.length || 0,
        reconciled_count: 0,
        unmatched_count: 0,
        raw_data: JSON.stringify({ items, fileContent }),
        synced: true
      })
      .select()
      .single();

    if (reportError) throw reportError;

    // Insérer les items du rapport
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
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
      data: report
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/birs/reconcile/:reportId - Lancer la réconciliation
router.post('/reconcile/:reportId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId } = req.params;
    const { airportCode } = req.body;

    // Récupérer les items du rapport
    const { data: reportItems, error: itemsError } = await supabase
      .from('birs_report_items')
      .select('*')
      .eq('birs_report_id', reportId);

    if (itemsError) throw itemsError;

    // Récupérer les bagages scannés non réconciliés
    const { data: scannedBags, error: bagsError } = await supabase
      .from('international_baggages')
      .select('*')
      .eq('airport_code', airportCode)
      .eq('status', 'scanned');

    if (bagsError) throw bagsError;

    let matchedCount = 0;
    const matches: any[] = [];

    // Réconciliation simple: match par bagId
    for (const item of reportItems || []) {
      const matchedBag = scannedBags?.find(bag => 
        bag.rfid_tag === item.bag_id || 
        (bag.pnr && bag.pnr === item.pnr)
      );

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
    await supabase
      .from('birs_reports')
      .update({
        reconciled_count: matchedCount,
        unmatched_count: (reportItems?.length || 0) - matchedCount,
        processed_at: new Date().toISOString()
      })
      .eq('id', reportId);

    res.json({
      success: true,
      data: {
        reportId,
        totalItems: reportItems?.length || 0,
        matchedCount,
        unmatchedCount: (reportItems?.length || 0) - matchedCount,
        matches
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
