import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';
import { requireAirportCode } from '../middleware/airport-restriction.middleware';
import { validateArrivalScan } from '../middleware/arrival-validation.middleware';

const router = Router();

/**
 * POST /api/v1/arrival/scan
 * Scanner un bagage à l'arrivée
 */
router.post('/scan', 
  requireAirportCode,
  validateArrivalScan,
  async (req: Request & { userAirportCode?: string }, res: Response, next: NextFunction) => {
    try {
      const { tag_number, validated, passenger_id } = req.body;
      const airport_code = req.userAirportCode;

      // Si le bagage a été pré-validé par le middleware
      if (validated && passenger_id) {
        // Mettre à jour le statut du bagage
        const { error: updateError } = await supabase
          .from('baggages')
          .update({
            status: 'arrived',
            arrived_at: new Date().toISOString(),
            arrived_by: req.user?.id
          })
          .eq('tag_number', tag_number);

        if (updateError) throw updateError;

        return res.json({
          success: true,
          message: 'Bagage marqué comme arrivé'
        });
      }

      // Sinon, continuer avec la logique standard...
      // [Votre logique existante ici]

    } catch (error) {
      next(error);
    }
});

export default router;
