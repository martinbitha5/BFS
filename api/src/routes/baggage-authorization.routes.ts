/**
 * Routes pour la gestion des autorisations de bagages supplémentaires
 * Réservé aux utilisateurs avec le rôle "support"
 */

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
      .select('role, approved')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    if (userData.role !== 'support' || !userData.approved) {
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
 * GET /api/v1/baggage-authorization/requests
 * Liste toutes les demandes d'autorisation en attente
 */
router.get('/requests', requireSupport, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, airport_code } = req.query;

    let query = supabase
      .from('baggage_authorization_requests')
      .select(`
        *,
        passengers (
          id,
          full_name,
          pnr,
          flight_number,
          departure,
          arrival
        )
      `)
      .order('requested_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    } else {
      // Par défaut, ne montrer que les demandes en attente
      query = query.eq('status', 'pending');
    }

    if (airport_code) {
      query = query.eq('airport_code', airport_code);
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
 * GET /api/v1/baggage-authorization/requests/:id
 * Détails d'une demande d'autorisation
 */
router.get('/requests/:id', requireSupport, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('baggage_authorization_requests')
      .select(`
        *,
        passengers (
          id,
          full_name,
          pnr,
          flight_number,
          departure,
          arrival,
          baggage_count
        )
      `)
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
 * POST /api/v1/baggage-authorization/requests/:id/approve
 * Approuver une demande d'autorisation et créer le bagage
 */
router.post('/requests/:id/approve', requireSupport, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const supportUserId = (req as any).supportUserId;
    const { notes, baggageData } = req.body;

    // Récupérer la demande
    const { data: request, error: requestError } = await supabase
      .from('baggage_authorization_requests')
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

    // Vérifier si le bagage existe déjà
    const { data: existingBaggage } = await supabase
      .from('baggages')
      .select('id')
      .eq('tag_number', request.rfid_tag)
      .single();

    let baggageId = existingBaggage?.id;

    if (!baggageId) {
      // Créer le bagage avec autorisation manuelle
      const { data: baggage, error: baggageError } = await supabase
        .from('baggages')
        .insert({
          passenger_id: request.passenger_id,
          tag_number: request.rfid_tag,
          flight_number: request.flight_number,
          airport_code: request.airport_code,
          status: baggageData?.status || 'checked',
          weight: baggageData?.weight,
          manually_authorized: true,
          authorization_request_id: id,
          checked_at: new Date().toISOString(),
          ...baggageData
        })
        .select('id')
        .single();

      if (baggageError) {
        // Vérifier si c'est une erreur de duplication
        if (baggageError.code === '23505') {
          return res.status(409).json({
            success: false,
            error: 'Un bagage avec ce tag RFID existe déjà'
          });
        }
        throw baggageError;
      }

      baggageId = baggage.id;
    } else {
      // Le bagage existe déjà, juste le marquer comme autorisé
      const { error: updateError } = await supabase
        .from('baggages')
        .update({
          manually_authorized: true,
          authorization_request_id: id,
          passenger_id: request.passenger_id
        })
        .eq('id', baggageId);

      if (updateError) throw updateError;
    }

    // Mettre à jour la demande
    const { error: updateError } = await supabase
      .from('baggage_authorization_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: supportUserId,
        baggage_id: baggageId,
        notes: notes || request.notes
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Demande approuvée et bagage créé avec succès',
      data: {
        requestId: id,
        baggageId: baggageId,
        approvedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/baggage-authorization/requests/:id/reject
 * Rejeter une demande d'autorisation
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
      .from('baggage_authorization_requests')
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

    // Mettre à jour la demande
    const { error: updateError } = await supabase
      .from('baggage_authorization_requests')
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

