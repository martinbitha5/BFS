import { Request, Response, Router } from 'express';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Route publique pour tracker un bagage
 * Accepte PNR ou tag RFID
 * GET /api/v1/public/track?pnr=ABC123
 * GET /api/v1/public/track?tag=RF123456
 */
router.get('/track', async (req: Request, res: Response) => {
  try {
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
          f.origin,
          f.destination
        FROM baggages b
        INNER JOIN passengers p ON b.passenger_id = p.id
        LEFT JOIN flights f ON p.flight_number = f.flight_number
        WHERE UPPER(p.pnr) = UPPER($1)
        ORDER BY b.created_at DESC
        LIMIT 1
      `;
      params = [pnr];
    } else {
      // Rechercher par tag RFID
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
          f.origin,
          f.destination
        FROM baggages b
        INNER JOIN passengers p ON b.passenger_id = p.id
        LEFT JOIN flights f ON p.flight_number = f.flight_number
        WHERE UPPER(b.tag_number) = UPPER($1)
        ORDER BY b.created_at DESC
        LIMIT 1
      `;
      params = [tag];
    }

    const result = await pool.query(query, params);

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
        pnr: baggage.pnr,
        flight_number: baggage.flight_number,
        status: baggage.status,
        current_location: baggage.current_location || 'En cours de traitement',
        last_scanned_at: baggage.last_scanned_at,
        origin: baggage.origin,
        destination: baggage.destination,
        weight: baggage.weight
      }
    });

  } catch (error: any) {
    console.error('Erreur lors de la recherche du bagage:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche. Veuillez réessayer.'
    });
  }
});

export default router;
