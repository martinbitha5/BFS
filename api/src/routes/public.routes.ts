import { Request, Response, Router, NextFunction } from 'express';
import { Pool } from 'pg';

const router = Router();

// Initialize database pool only if DATABASE_URL is configured
let pool: Pool | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2e82e369-b2c3-4892-be74-bf76a361a519',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'public.routes.ts:15',message:'Database pool error',data:{error:err.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  });
} else {
  console.warn('DATABASE_URL not configured. Public tracking routes will not work.');
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/2e82e369-b2c3-4892-be74-bf76a361a519',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'public.routes.ts:20',message:'DATABASE_URL missing',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
}

/**
 * Route publique pour tracker un bagage
 * Accepte PNR ou tag RFID
 * GET /api/v1/public/track?pnr=ABC123
 * GET /api/v1/public/track?tag=RF123456
 */
router.get('/track', async (req: Request, res: Response, next: NextFunction) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/2e82e369-b2c3-4892-be74-bf76a361a519',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'public.routes.ts:25',message:'Track request received',data:{pnr:req.query.pnr,tag:req.query.tag,hasPool:!!pool},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  try {
    if (!pool) {
      return res.status(503).json({
        success: false,
        error: 'Service de base de données non disponible. Veuillez configurer DATABASE_URL.'
      });
    }

    const { pnr, tag } = req.query;

    if (!pnr && !tag) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez fournir un PNR ou un numéro de bagage'
      });
    }

    let query: string;
    let params: any[];

    if (pnr) {
      // Rechercher par PNR - trouver le passager et ses bagages
      query = `
        SELECT 
          b.id,
          b.tag_number as bag_id,
          b.status,
          b.weight,
          b.current_location,
          b.last_scanned_at,
          p.full_name as passenger_name,
          p.pnr,
          p.flight_number,
          p.departure as origin,
          p.arrival as destination,
          'national' as baggage_type
        FROM baggages b
        INNER JOIN passengers p ON b.passenger_id = p.id
        WHERE UPPER(p.pnr) = UPPER($1)
        ORDER BY b.created_at DESC
        LIMIT 1
      `;
      params = [pnr];
    } else {
      // Rechercher par tag RFID - d'abord dans bagages nationaux
      query = `
        SELECT 
          b.id,
          b.tag_number as bag_id,
          b.status,
          b.weight,
          b.current_location,
          b.last_scanned_at,
          p.full_name as passenger_name,
          p.pnr,
          p.flight_number,
          p.departure as origin,
          p.arrival as destination,
          'national' as baggage_type
        FROM baggages b
        INNER JOIN passengers p ON b.passenger_id = p.id
        WHERE UPPER(b.tag_number) = UPPER($1)
        ORDER BY b.created_at DESC
        LIMIT 1
      `;
      params = [tag];
    }

    let result = await pool.query(query, params);

    // Si aucun bagage national trouvé et recherche par tag, chercher dans bagages internationaux
    if (result.rows.length === 0 && tag) {
      const internationalQuery = `
        SELECT 
          ib.id,
          ib.rfid_tag as bag_id,
          ib.status,
          ib.weight,
          ib.airport_code as current_location,
          ib.scanned_at as last_scanned_at,
          COALESCE(ib.passenger_name, 'Passager international') as passenger_name,
          ib.pnr,
          ib.flight_number,
          NULL as origin,
          NULL as destination,
          'international' as baggage_type
        FROM international_baggages ib
        WHERE UPPER(ib.rfid_tag) = UPPER($1)
        ORDER BY ib.created_at DESC
        LIMIT 1
      `;
      result = await pool.query(internationalQuery, [tag]);
    }

    // Si aucun bagage trouvé et recherche par PNR, chercher aussi dans bagages internationaux
    if (result.rows.length === 0 && pnr) {
      const internationalQuery = `
        SELECT 
          ib.id,
          ib.rfid_tag as bag_id,
          ib.status,
          ib.weight,
          ib.airport_code as current_location,
          ib.scanned_at as last_scanned_at,
          COALESCE(ib.passenger_name, 'Passager international') as passenger_name,
          ib.pnr,
          ib.flight_number,
          NULL as origin,
          NULL as destination,
          'international' as baggage_type
        FROM international_baggages ib
        WHERE UPPER(ib.pnr) = UPPER($1)
        ORDER BY ib.created_at DESC
        LIMIT 1
      `;
      result = await pool.query(internationalQuery, [pnr]);
    }

    // Si toujours aucun bagage trouvé, chercher dans les rapports BIRS (bagages arrivés)
    if (result.rows.length === 0 && tag) {
      const birsQuery = `
        SELECT 
          bri.id,
          bri.bag_id,
          CASE 
            WHEN bri.received IS NOT NULL THEN 'arrived'
            WHEN bri.loaded IS NOT NULL THEN 'in_transit'
            ELSE 'scanned'
          END as status,
          bri.weight,
          br.destination as current_location,
          bri.created_at as last_scanned_at,
          COALESCE(bri.passenger_name, 'Passager international') as passenger_name,
          bri.pnr,
          br.flight_number,
          br.origin,
          br.destination,
          'birs' as baggage_type
        FROM birs_report_items bri
        INNER JOIN birs_reports br ON bri.birs_report_id = br.id
        WHERE UPPER(bri.bag_id) = UPPER($1)
        ORDER BY bri.created_at DESC
        LIMIT 1
      `;
      result = await pool.query(birsQuery, [tag]);
    }

    // Si toujours aucun bagage trouvé et recherche par PNR, chercher dans les rapports BIRS
    if (result.rows.length === 0 && pnr) {
      const birsQuery = `
        SELECT 
          bri.id,
          bri.bag_id,
          CASE 
            WHEN bri.received IS NOT NULL THEN 'arrived'
            WHEN bri.loaded IS NOT NULL THEN 'in_transit'
            ELSE 'scanned'
          END as status,
          bri.weight,
          br.destination as current_location,
          bri.created_at as last_scanned_at,
          COALESCE(bri.passenger_name, 'Passager international') as passenger_name,
          bri.pnr,
          br.flight_number,
          br.origin,
          br.destination,
          'birs' as baggage_type
        FROM birs_report_items bri
        INNER JOIN birs_reports br ON bri.birs_report_id = br.id
        WHERE UPPER(bri.pnr) = UPPER($1)
        ORDER BY bri.created_at DESC
        LIMIT 1
      `;
      result = await pool.query(birsQuery, [pnr]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucun bagage trouvé avec ces informations. Vérifiez votre PNR ou numéro de bagage.'
      });
    }

    const baggage = result.rows[0];

    return res.json({
      success: true,
      data: {
        bag_id: baggage.bag_id,
        passenger_name: baggage.passenger_name,
        pnr: baggage.pnr || 'N/A',
        flight_number: baggage.flight_number || 'N/A',
        status: baggage.status,
        current_location: baggage.current_location || 'En cours de traitement',
        last_scanned_at: baggage.last_scanned_at,
        origin: baggage.origin,
        destination: baggage.destination,
        weight: baggage.weight,
        baggage_type: baggage.baggage_type
      }
    });

  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2e82e369-b2c3-4892-be74-bf76a361a519',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'public.routes.ts:217',message:'Track request error',data:{error:error?.message,stack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    console.error('Erreur lors de la recherche du bagage:', error);
    next(error);
  }
});

export default router;
