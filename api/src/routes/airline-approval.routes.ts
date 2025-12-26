/**
 * Routes pour la gestion des approbations de compagnies aériennes
 * Réservé aux utilisateurs avec le rôle "support"
 */

import bcrypt from 'bcrypt';
import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';

const router = Router();

/**
 * Middleware pour vérifier que l'utilisateur est support et approuvé
 */
const requireSupport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise'
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Token invalide'
      });
    }

    // Vérifier que l'utilisateur est support et approuvé
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, is_approved')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    if (userData.role !== 'support' || !userData.is_approved) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé : Seuls les utilisateurs support approuvés peuvent accéder à cette fonctionnalité'
      });
    }

    // Ajouter l'ID utilisateur à la requête
    (req as any).supportUserId = user.id;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/airline-approval/requests
 * Liste toutes les demandes d'inscription en attente
 */
router.get('/requests', requireSupport, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('airline_registration_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    } else {
      // Par défaut, ne montrer que les demandes en attente
      query = query.eq('status', 'pending');
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      data: data || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/airline-approval/requests/:id
 * Détails d'une demande d'inscription
 */
router.get('/requests/:id', requireSupport, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('airline_registration_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Demande non trouvée'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/airline-approval/requests/:id/approve
 * Approuver une demande d'inscription
 */
router.post('/requests/:id/approve', requireSupport, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const supportUserId = (req as any).supportUserId;
    const { notes } = req.body;

    // Récupérer la demande
    const { data: request, error: requestError } = await supabase
      .from('airline_registration_requests')
      .select('*')
      .eq('id', id)
      .eq('status', 'pending')
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Demande non trouvée ou déjà traitée'
      });
    }

    // Vérifier si l'airline existe déjà
    let airlineId = request.airline_id;
    
    if (!airlineId) {
      // Créer l'airline
      const { data: airline, error: airlineError } = await supabase
        .from('airlines')
        .insert({
          name: request.name,
          code: request.code,
          email: request.email,
          password: request.password, // Déjà hashé
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: supportUserId,
        })
        .select('id')
        .single();

      if (airlineError) {
        // Vérifier si c'est une erreur de duplication
        if (airlineError.code === '23505') {
          return res.status(409).json({
            success: false,
            error: 'Une compagnie aérienne avec cet email ou ce code existe déjà'
          });
        }
        throw airlineError;
      }

      airlineId = airline.id;
    } else {
      // L'airline existe déjà, juste l'approuver
      const { error: approveError } = await supabase
        .from('airlines')
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: supportUserId,
        })
        .eq('id', airlineId);

      if (approveError) throw approveError;
    }

    // Mettre à jour la demande
    const { error: updateError } = await supabase
      .from('airline_registration_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: supportUserId,
        airline_id: airlineId,
        notes: notes || request.notes
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Demande approuvée avec succès',
      data: {
        requestId: id,
        airlineId: airlineId,
        approvedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/airline-approval/requests/:id/reject
 * Rejeter une demande d'inscription
 */
router.post('/requests/:id/reject', requireSupport, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const supportUserId = (req as any).supportUserId;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({
        success: false,
        error: 'Une raison de rejet est requise'
      });
    }

    // Récupérer la demande
    const { data: request, error: requestError } = await supabase
      .from('airline_registration_requests')
      .select('*')
      .eq('id', id)
      .eq('status', 'pending')
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Demande non trouvée ou déjà traitée'
      });
    }

    // Si l'airline existe déjà, la marquer comme rejetée
    if (request.airline_id) {
      const { error: rejectError } = await supabase
        .from('airlines')
        .update({
          approved: false,
          rejection_reason: rejection_reason
        })
        .eq('id', request.airline_id);

      if (rejectError) {
        console.warn('Error updating airline rejection:', rejectError);
      }
    }

    // Mettre à jour la demande
    const { error: updateError } = await supabase
      .from('airline_registration_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: supportUserId,
        rejection_reason: rejection_reason
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Demande rejetée',
      data: {
        requestId: id,
        rejectedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

