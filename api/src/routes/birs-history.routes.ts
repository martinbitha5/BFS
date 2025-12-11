import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';

const router = Router();

/**
 * GET /api/v1/birs/history
 * Récupérer l'historique des uploads BIRS pour une compagnie
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airline_code } = req.query;

    if (!airline_code) {
      return res.status(400).json({
        success: false,
        error: 'Le code de la compagnie est requis',
      });
    }

    // Récupérer les rapports BIRS pour cette compagnie
    const { data: reports, error } = await supabase
      .from('birs_reports')
      .select('*')
      .eq('airline_code', airline_code)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    // Calculer les statistiques pour chaque rapport
    const reportsWithStats = await Promise.all(
      (reports || []).map(async (report) => {
        // Compter les bagages pour ce vol
        const { count: totalCount } = await supabase
          .from('international_baggages')
          .select('*', { count: 'exact', head: true })
          .eq('flight_number', report.flight_number)
          .eq('pnr', report.flight_number); // Approximation - à ajuster selon votre logique

        // Compter les bagages réconciliés (status = 'arrived')
        const { count: reconciledCount } = await supabase
          .from('international_baggages')
          .select('*', { count: 'exact', head: true })
          .eq('flight_number', report.flight_number)
          .eq('status', 'arrived');

        const total = totalCount || report.total_baggages || 0;
        const reconciled = reconciledCount || 0;
        const missing = total - reconciled;

        let status = 'À vérifier (0%)';
        if (reconciled === total && total > 0) {
          status = 'Complet';
        } else if (reconciled > 0) {
          const percentage = Math.round((reconciled / total) * 100);
          status = `Partiel (${percentage}%)`;
        }

        return {
          id: report.id,
          flight_number: report.flight_number,
          airline_code: report.airline_code,
          airline_name: report.airline_name,
          uploaded_at: report.uploaded_at,
          file_name: report.file_name,
          total_baggages: total,
          reconciled_count: reconciled,
          missing_count: missing,
          status,
        };
      })
    );

    res.json({
      success: true,
      count: reportsWithStats.length,
      data: reportsWithStats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
