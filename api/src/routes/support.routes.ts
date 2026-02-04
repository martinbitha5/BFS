import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';
import { requireAirportCode } from '../middleware/airport-restriction.middleware';

const router = Router();

/**
 * Helper pour vérifier si l'utilisateur est support ou baggage_dispute
 */
const checkSupportAccess = (req: Request): { authorized: boolean; role: string | undefined } => {
  const userRole = (req as any).userRole || req.headers['x-user-role'];
  const authorized = userRole === 'support' || userRole === 'baggage_dispute';
  return { authorized, role: userRole };
};

/**
 * POST /api/v1/support/baggages/create
 * SUPPORT/LITIGE: Créer un bagage supplémentaire pour un passager
 */
router.post('/baggages/create', requireAirportCode, async (req: Request & { userRole?: string }, res: Response, next: NextFunction) => {
  try {
    const { authorized } = checkSupportAccess(req);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Cette route est réservée au support et aux agents litiges.'
      });
    }

    const { passengerId, tag_number, weight, status } = req.body;

    if (!passengerId || !tag_number) {
      return res.status(400).json({
        success: false,
        error: 'passengerId et tag_number sont requis'
      });
    }

    // Vérifier que le passager existe
    const { data: passenger, error: passengerError } = await supabase
      .from('passengers')
      .select('id, full_name, airport_code')
      .eq('id', passengerId)
      .single();

    if (passengerError || !passenger) {
      return res.status(404).json({
        success: false,
        error: 'Passager non trouvé'
      });
    }

    // Créer le bagage
    const { data: baggage, error: baggageError } = await supabase
      .from('baggages')
      .insert({
        passenger_id: passengerId,
        tag_number: tag_number,
        weight: weight || null,
        status: status || 'checked',
        checked_at: new Date().toISOString(),
        airport_code: passenger.airport_code
      })
      .select()
      .single();

    if (baggageError) {
      throw baggageError;
    }

    console.log(`[Support] Bagage créé pour ${passenger.full_name}: ${tag_number}`);

    res.json({
      success: true,
      data: {
        id: baggage.id,
        tag_number: baggage.tag_number,
        status: baggage.status,
        weight: baggage.weight,
        checked_at: baggage.checked_at
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/support/baggages/:id
 * SUPPORT/LITIGE: Supprimer un bagage
 */
router.delete('/baggages/:id', requireAirportCode, async (req: Request & { userRole?: string }, res: Response, next: NextFunction) => {
  try {
    const { authorized } = checkSupportAccess(req);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Cette route est réservée au support et aux agents litiges.'
      });
    }

    const { id } = req.params;

    // Vérifier que le bagage existe
    const { data: baggage, error: fetchError } = await supabase
      .from('baggages')
      .select('id, tag_number, passenger_id')
      .eq('id', id)
      .single();

    if (fetchError || !baggage) {
      return res.status(404).json({
        success: false,
        error: 'Bagage non trouvé'
      });
    }

    // Supprimer le bagage
    const { error: deleteError } = await supabase
      .from('baggages')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`[Support] Bagage supprimé: ${baggage.tag_number}`);

    res.json({
      success: true,
      message: 'Bagage supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/support/baggages/:id
 * SUPPORT/LITIGE: Mettre à jour un bagage
 */
router.put('/baggages/:id', requireAirportCode, async (req: Request & { userRole?: string }, res: Response, next: NextFunction) => {
  try {
    const { authorized } = checkSupportAccess(req);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Cette route est réservée au support et aux agents litiges.'
      });
    }

    const { id } = req.params;
    const { tag_number, weight, status } = req.body;

    // Vérifier que le bagage existe
    const { data: baggage, error: fetchError } = await supabase
      .from('baggages')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !baggage) {
      return res.status(404).json({
        success: false,
        error: 'Bagage non trouvé'
      });
    }

    // Préparer les mises à jour
    const updates: any = {};
    if (tag_number !== undefined) updates.tag_number = tag_number;
    if (weight !== undefined) updates.weight = weight;
    if (status !== undefined) updates.status = status;

    // Mettre à jour
    const { data: updated, error: updateError } = await supabase
      .from('baggages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log(`[Support] Bagage mis à jour: ${id}`);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/support/users/all
 * SUPPORT ONLY: Récupérer TOUS les utilisateurs
 */
router.get('/users/all', requireAirportCode, async (req: Request & { userRole?: string }, res: Response, next: NextFunction) => {
  try {
    const { authorized, role } = checkSupportAccess(req);
    // Seul le support peut voir tous les utilisateurs (pas baggage_dispute)
    if (role !== 'support') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Cette route est réservée au support.'
      });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, airport_code, role, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/support/users/:id
 * SUPPORT ONLY: Supprimer un utilisateur
 */
router.delete('/users/:id', requireAirportCode, async (req: Request & { userRole?: string }, res: Response, next: NextFunction) => {
  try {
    const { role } = checkSupportAccess(req);
    // Seul le support peut supprimer des utilisateurs
    if (role !== 'support') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Cette route est réservée au support.'
      });
    }

    const { id } = req.params;
    const currentUser = (req as any).user;

    // Vérifier qu'on n'essaie pas de supprimer soi-même
    if (currentUser?.id === id) {
      return res.status(400).json({
        success: false,
        error: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    // Vérifier que l'utilisateur existe
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', id)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Supprimer l'utilisateur
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`[Support] Utilisateur supprimé: ${user.full_name}`);

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/support/stats
 * SUPPORT/LITIGE: Statistiques complètes du système
 */
router.get('/stats', requireAirportCode, async (req: Request & { userRole?: string }, res: Response, next: NextFunction) => {
  try {
    const { authorized } = checkSupportAccess(req);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Cette route est réservée au support et aux agents litiges.'
      });
    }

    // Compter les entités
    const [
      { count: passengerCount },
      { count: baggageCount },
      { count: userCount },
      { count: boardingCount }
    ] = await Promise.all([
      supabase.from('passengers').select('id', { count: 'exact' }),
      supabase.from('baggages').select('id', { count: 'exact' }),
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('boarding_status').select('id', { count: 'exact' })
    ]);

    res.json({
      success: true,
      data: {
        passengers: passengerCount || 0,
        baggages: baggageCount || 0,
        users: userCount || 0,
        boardingStatus: boardingCount || 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
