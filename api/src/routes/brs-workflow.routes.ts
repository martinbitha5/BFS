/**
 * Routes pour le workflow complet BRS (Baggage Reconciliation System)
 * Conforme aux standards IATA Resolution 753
 * Adapté pour les aéroports en RDC
 */

import { NextFunction, Request, Response, Router } from 'express';
import { supabase } from '../config/database';
import { brsNotificationService } from '../services/brs-notification.service';
import { requireAirportCode } from '../middleware/airport-restriction.middleware';

const router = Router();

// Types pour le workflow BRS
interface BRSWorkflowStep {
  id: string;
  step: 'upload' | 'validation' | 'reconciliation' | 'verification' | 'closure';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  performed_by?: string;
  notes?: string;
}

interface BRSException {
  id: string;
  type: 'missing_baggage' | 'rush' | 'transfer' | 'damaged' | 'overweight' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  baggage_id?: string;
  report_item_id?: string;
  flight_number: string;
  description: string;
  created_by: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

// GET /api/v1/brs/workflow/:reportId - Obtenir le workflow d'un rapport
// RESTRICTION: Vérifie que le rapport appartient à l'aéroport de l'utilisateur
router.get('/workflow/:reportId', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId } = req.params;
    const airport = req.query.airport as string;

    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis'
      });
    }

    // Récupérer le rapport avec vérification de l'aéroport
    const { data: report, error: reportError } = await supabase
      .from('birs_reports')
      .select('*')
      .eq('id', reportId)
      .eq('airport_code', airport) // FORCER le filtre par aéroport
      .single();

    if (reportError) throw reportError;

    // Récupérer le workflow depuis la base de données si disponible
    const { data: dbWorkflowSteps, error: workflowError } = await supabase
      .from('brs_workflow_steps')
      .select('*')
      .eq('report_id', reportId)
      .order('step_order', { ascending: true });

    let workflow: BRSWorkflowStep[] = [];

    if (!workflowError && dbWorkflowSteps && dbWorkflowSteps.length > 0) {
      // Utiliser le workflow de la base de données
      workflow = dbWorkflowSteps.map(step => ({
        id: step.id,
        step: step.step as any,
        status: step.status as any,
        started_at: step.started_at,
        completed_at: step.completed_at,
        performed_by: step.performed_by,
        notes: step.notes
      }));
    } else {
      // Fallback: construire le workflow basé sur l'état du rapport
      workflow = [
        {
          id: '1',
          step: 'upload',
          status: report.uploaded_at ? 'completed' : 'pending',
          completed_at: report.uploaded_at,
          performed_by: report.uploaded_by
        },
        {
          id: '2',
          step: 'validation',
          status: report.total_baggages > 0 ? 'completed' : 'pending',
          completed_at: report.uploaded_at
        },
        {
          id: '3',
          step: 'reconciliation',
          status: report.processed_at ? 'completed' : 'pending',
          completed_at: report.processed_at
        },
        {
          id: '4',
          step: 'verification',
          status: report.reconciled_count === report.total_baggages ? 'completed' : 'in_progress',
          completed_at: report.reconciled_count === report.total_baggages ? report.processed_at : undefined
        },
        {
          id: '5',
          step: 'closure',
          status: report.reconciled_count === report.total_baggages && report.unmatched_count === 0 ? 'completed' : 'pending'
        }
      ];
    }

    res.json({
      success: true,
      data: {
        reportId,
        workflow,
        currentStep: workflow.find(w => w.status !== 'completed')?.step || 'closure',
        progress: (workflow.filter(w => w.status === 'completed').length / workflow.length) * 100
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/brs/workflow/:reportId/step/:stepId - Marquer une étape comme complétée
router.post('/workflow/:reportId/step/:stepId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportId, stepId } = req.params;
    const { userId, notes, items_processed, items_success, items_failed } = req.body;

    const stepOrderMap: Record<string, number> = {
      'upload': 1,
      'validation': 2,
      'reconciliation': 3,
      'verification': 4,
      'closure': 5
    };

    const stepOrder = stepOrderMap[stepId] || 0;
    const now = new Date().toISOString();

    // Enregistrer l'étape dans la table brs_workflow_steps
    const { data: workflowStep, error: stepError } = await supabase
      .from('brs_workflow_steps')
      .insert({
        report_id: reportId,
        step: stepId,
        step_order: stepOrder,
        status: 'completed',
        started_at: now,
        completed_at: now,
        performed_by: userId,
        notes,
        items_processed: items_processed || 0,
        items_success: items_success || 0,
        items_failed: items_failed || 0
      })
      .select()
      .single();

    // Si la table n'existe pas encore, continuer avec le fallback
    if (stepError && stepError.code !== '42P01') {
      console.warn('Error saving workflow step:', stepError);
    } else if (workflowStep) {
      // Envoyer une notification pour l'étape complétée
      const { data: report } = await supabase
        .from('birs_reports')
        .select('airport_code')
        .eq('id', reportId)
        .single();

      if (report) {
        await brsNotificationService.notifyWorkflowStep(reportId, stepId, 'completed', report.airport_code);
      }
    }

    // Mettre à jour le rapport selon l'étape
    const updates: any = {};

    switch (stepId) {
      case 'reconciliation':
        updates.processed_at = now;
        break;
      case 'closure':
        // Marquer le rapport comme fermé (ajouter colonne si nécessaire)
        updates.processed_at = now;
        break;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('birs_reports')
        .update(updates)
        .eq('id', reportId);

      if (error) throw error;
    }

    res.json({
      success: true,
      message: `Étape ${stepId} complétée avec succès`
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/brs/exceptions - Liste des exceptions BRS
// RESTRICTION: Filtre automatiquement par aéroport de l'utilisateur
router.get('/exceptions', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport, status, type, flight } = req.query;

    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis'
      });
    }

    // Pour l'instant, créer des exceptions basées sur les bagages non matchés
    const { data: unmatchedBaggages, error: bagsError } = await supabase
      .from('international_baggages')
      .select('*')
      .eq('airport_code', airport)
      .eq('status', 'unmatched');

    if (bagsError) throw bagsError;

    const { data: reports, error: reportsError } = await supabase
      .from('birs_reports')
      .select('*')
      .eq('airport_code', airport);

    if (reportsError) throw reportsError;

    // Récupérer les exceptions depuis la base de données (déjà filtrées par aéroport)
    const { data: dbExceptions, error: exceptionsError } = await supabase
      .from('brs_exceptions')
      .select('*')
      .eq('airport_code', airport); // FORCER le filtre par aéroport

    if (exceptionsError) {
      console.warn('Table brs_exceptions not found, using dynamic exceptions');
      // Fallback: créer des exceptions dynamiquement si la table n'existe pas encore
      const exceptions: BRSException[] = unmatchedBaggages?.map(bag => ({
        id: `exc_${bag.id}`,
        type: 'missing_baggage' as const,
        severity: 'high' as const,
        status: 'open' as const,
        baggage_id: bag.id,
        flight_number: bag.flight_number || 'UNKNOWN',
        description: `Bagage scanné mais non trouvé dans les rapports BRS: ${bag.rfid_tag}`,
        created_by: bag.scanned_by,
        created_at: bag.scanned_at
      })) || [];
      
      // Filtrer selon les paramètres
      let filtered = exceptions;
      if (status) {
        filtered = filtered.filter(e => e.status === status);
      }
      if (type) {
        filtered = filtered.filter(e => e.type === type);
      }
      if (flight) {
        filtered = filtered.filter(e => e.flight_number === flight);
      }

      return res.json({
        success: true,
        count: filtered.length,
        data: filtered
      });
    }

    // Utiliser les exceptions de la base de données
    const exceptions: BRSException[] = dbExceptions?.map(exc => ({
      id: exc.id,
      type: exc.type,
      severity: exc.severity,
      status: exc.status,
      baggage_id: exc.baggage_id,
      report_item_id: exc.report_item_id,
      flight_number: exc.flight_number,
      description: exc.description,
      created_by: exc.created_by,
      created_at: exc.created_at,
      resolved_at: exc.resolved_at,
      resolved_by: exc.resolved_by,
      resolution_notes: exc.resolution_notes
    })) || [];

    // Filtrer selon les paramètres
    let filtered = exceptions;
    if (status) {
      filtered = filtered.filter(e => e.status === status);
    }
    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }
    if (flight) {
      filtered = filtered.filter(e => e.flight_number === flight);
    }

    res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/brs/exceptions - Créer une exception
// RESTRICTION: Vérifie que l'aéroport correspond à celui de l'utilisateur
router.post('/exceptions', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      type,
      severity,
      baggage_id,
      report_item_id,
      flight_number,
      description,
      created_by,
      airport_code
    } = req.body;
    const userAirport = req.query.airport as string || airport_code;

    if (!userAirport) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis'
      });
    }

    // FORCER l'aéroport de l'utilisateur
    const finalAirportCode = userAirport;

    // Créer l'exception dans la base de données avec l'aéroport validé
    const { data: exception, error: createError } = await supabase
      .from('brs_exceptions')
      .insert({
        type,
        severity: severity || 'medium',
        status: 'open',
        baggage_id,
        report_item_id,
        flight_number,
        airport_code: finalAirportCode, // Utiliser l'aéroport validé
        description,
        created_by
      })
      .select()
      .single();

    if (createError) {
      // Fallback si la table n'existe pas encore
      const fallbackException: BRSException = {
        id: `exc_${Date.now()}`,
        type,
        severity: severity || 'medium',
        status: 'open',
        baggage_id,
        report_item_id,
        flight_number,
        description,
        created_by,
        created_at: new Date().toISOString()
      };
      
      return res.status(201).json({
        success: true,
        data: fallbackException
      });
    }

    res.status(201).json({
      success: true,
      data: exception
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/brs/exceptions/:exceptionId/resolve - Résoudre une exception
router.post('/exceptions/:exceptionId/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { exceptionId } = req.params;
    const { resolved_by, resolution_notes, status } = req.body;

    const { error } = await supabase
      .from('brs_exceptions')
      .update({
        status: status || 'resolved',
        resolved_by,
        resolved_at: new Date().toISOString(),
        resolution_notes
      })
      .eq('id', exceptionId);

    if (error) {
      // Si la table n'existe pas, retourner succès quand même
      if (error.code === '42P01') {
        return res.json({
          success: true,
          message: 'Exception résolue avec succès'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: 'Exception résolue avec succès'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/brs/rush - Déclarer un bagage RUSH
router.post('/rush', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { baggage_id, next_flight, reason, created_by, airport_code } = req.body;

    // Récupérer le bagage pour obtenir le numéro de vol
    const { data: baggage, error: baggageError } = await supabase
      .from('international_baggages')
      .select('*')
      .eq('id', baggage_id)
      .single();

    if (baggageError) throw baggageError;

    // Mettre à jour le statut du bagage
    const { error: updateError } = await supabase
      .from('international_baggages')
      .update({
        status: 'rush',
        remarks: `RUSH - Prochain vol: ${next_flight}. Raison: ${reason}`
      })
      .eq('id', baggage_id);

    if (updateError) throw updateError;

    // Créer une exception RUSH
    const { data: exception, error: exceptionError } = await supabase
      .from('brs_exceptions')
      .insert({
        type: 'rush',
        severity: 'high',
        status: 'open',
        baggage_id,
        flight_number: baggage.flight_number || 'UNKNOWN',
        airport_code: airport_code || baggage.airport_code,
        description: `Bagage déclaré RUSH - Prochain vol: ${next_flight}`,
        details: { reason, next_flight },
        created_by
      })
      .select()
      .single();

    // Ignorer l'erreur si la table n'existe pas encore
    if (exceptionError && exceptionError.code !== '42P01') {
      console.warn('Error creating RUSH exception:', exceptionError);
    } else if (exception) {
      // Envoyer une notification
      await brsNotificationService.notifyException(exception, airport_code || baggage.airport_code);
    }

    res.json({
      success: true,
      message: 'Bagage déclaré en RUSH avec succès'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/brs/alerts - Obtenir les alertes BRS
// RESTRICTION: Filtre automatiquement par aéroport de l'utilisateur
router.get('/alerts', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport } = req.query;

    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis'
      });
    }

    const alerts: Array<{
      id: string;
      type: 'warning' | 'error' | 'info';
      severity: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      message: string;
      flight_number?: string;
      created_at: string;
      acknowledged: boolean;
    }> = [];

    // Alertes pour rapports non traités depuis plus de 24h
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: oldReports } = await supabase
      .from('birs_reports')
      .select('*')
      .eq('airport_code', airport)
      .is('processed_at', null)
      .lt('uploaded_at', oneDayAgo.toISOString());

    oldReports?.forEach(report => {
      alerts.push({
        id: `alert_${report.id}`,
        type: 'warning',
        severity: 'medium',
        title: 'Rapport non traité',
        message: `Le rapport ${report.flight_number} n'a pas été traité depuis plus de 24h`,
        flight_number: report.flight_number,
        created_at: report.uploaded_at,
        acknowledged: false
      });
    });

    // Alertes pour taux de réconciliation faible
    const { data: lowReconciliationReports } = await supabase
      .from('birs_reports')
      .select('*')
      .eq('airport_code', airport)
      .not('processed_at', 'is', null);

    lowReconciliationReports?.forEach(report => {
      const rate = report.total_baggages > 0 
        ? (report.reconciled_count / report.total_baggages) * 100 
        : 0;

      if (rate < 70) {
        alerts.push({
          id: `alert_low_${report.id}`,
          type: 'error',
          severity: 'high',
          title: 'Taux de réconciliation faible',
          message: `Le rapport ${report.flight_number} a un taux de réconciliation de ${rate.toFixed(1)}%`,
          flight_number: report.flight_number,
          created_at: report.processed_at,
          acknowledged: false
        });
      }
    });

    // Alertes pour bagages non matchés critiques
    const { data: criticalUnmatched } = await supabase
      .from('international_baggages')
      .select('*')
      .eq('airport_code', airport)
      .eq('status', 'unmatched')
      .lt('scanned_at', oneDayAgo.toISOString());

    if (criticalUnmatched && criticalUnmatched.length > 10) {
      alerts.push({
        id: 'alert_critical_unmatched',
        type: 'error',
        severity: 'critical',
        title: 'Nombre élevé de bagages non matchés',
        message: `${criticalUnmatched.length} bagages non matchés depuis plus de 24h`,
        created_at: new Date().toISOString(),
        acknowledged: false
      });
    }

    res.json({
      success: true,
      count: alerts.length,
      data: alerts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/brs/traceability/:identifier - Traçabilité complète d'un bagage (par ID ou RFID tag)
// RESTRICTION: Vérifie que le bagage appartient à l'aéroport de l'utilisateur
router.get('/traceability/:identifier', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier } = req.params;
    const airport = req.query.airport as string;

    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Code aéroport requis'
      });
    }

    // Essayer de trouver par RFID tag d'abord, puis par ID
    let baggage = null;
    let baggageError = null;

    // Recherche par RFID tag avec filtre aéroport
    const { data: baggageByTag } = await supabase
      .from('international_baggages')
      .select('*')
      .eq('rfid_tag', identifier)
      .eq('airport_code', airport) // FORCER le filtre par aéroport
      .single();

    if (baggageByTag) {
      baggage = baggageByTag;
    } else {
      // Recherche par ID avec filtre aéroport
      const { data: baggageById, error } = await supabase
        .from('international_baggages')
        .select('*')
        .eq('id', identifier)
        .eq('airport_code', airport) // FORCER le filtre par aéroport
        .single();
      
      if (error) {
        baggageError = error;
      } else {
        baggage = baggageById;
      }
    }

    if (!baggage && baggageError) throw baggageError;
    if (!baggage) {
      return res.status(404).json({
        success: false,
        error: 'Bagage non trouvé'
      });
    }

    // Récupérer le rapport associé si réconcilié
    let report = null;
    if (baggage.birs_report_id) {
      const { data: reportData } = await supabase
        .from('birs_reports')
        .select('*')
        .eq('id', baggage.birs_report_id)
        .single();
      report = reportData;
    }

    // Construire la traçabilité
    const traceability = {
      baggage: {
        id: baggage.id,
        rfid_tag: baggage.rfid_tag,
        status: baggage.status,
        passenger_name: baggage.passenger_name,
        pnr: baggage.pnr,
        flight_number: baggage.flight_number,
        origin: baggage.origin,
        weight: baggage.weight
      },
      timeline: [
        {
          event: 'Scanné à l\'arrivée',
          timestamp: baggage.scanned_at,
          location: baggage.airport_code,
          performed_by: baggage.scanned_by
        },
        ...(baggage.reconciled_at ? [{
          event: 'Réconcilié avec rapport BRS',
          timestamp: baggage.reconciled_at,
          performed_by: baggage.reconciled_by,
          report_id: baggage.birs_report_id
        }] : []),
        ...(report ? [{
          event: 'Rapport BRS uploadé',
          timestamp: report.uploaded_at,
          performed_by: report.uploaded_by,
          flight_number: report.flight_number
        }] : [])
      ],
      report: report ? {
        id: report.id,
        flight_number: report.flight_number,
        flight_date: report.flight_date,
        airline: report.airline,
        origin: report.origin,
        destination: report.destination
      } : null
    };

    res.json({
      success: true,
      data: traceability
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/brs/dashboard/:airport - Dashboard temps réel BRS
// RESTRICTION: Vérifie que l'utilisateur a accès à cet aéroport
router.get('/dashboard/:airport', requireAirportCode, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport } = req.params;
    const userAirport = req.query.airport as string;

    // Vérifier que l'utilisateur demande les stats de son propre aéroport
    if (userAirport && userAirport !== airport) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé : Vous ne pouvez accéder qu\'au dashboard de votre aéroport'
      });
    }

    // Statistiques générales
    const { data: allBaggages } = await supabase
      .from('international_baggages')
      .select('status, scanned_at')
      .eq('airport_code', airport);

    const { data: allReports } = await supabase
      .from('birs_reports')
      .select('*')
      .eq('airport_code', airport);

    // Calculer les statistiques
    const stats = {
      totalBaggages: allBaggages?.length || 0,
      reconciled: allBaggages?.filter(b => b.status === 'reconciled').length || 0,
      unmatched: allBaggages?.filter(b => b.status === 'unmatched').length || 0,
      rush: allBaggages?.filter(b => b.status === 'rush').length || 0,
      totalReports: allReports?.length || 0,
      pendingReports: allReports?.filter(r => !r.processed_at).length || 0,
      averageReconciliationRate: 0,
      todayReports: 0,
      todayBaggages: 0
    };

    // Taux moyen de réconciliation
    const processedReports = allReports?.filter(r => r.processed_at) || [];
    if (processedReports.length > 0) {
      const totalBags = processedReports.reduce((sum, r) => sum + r.total_baggages, 0);
      const totalReconciled = processedReports.reduce((sum, r) => sum + r.reconciled_count, 0);
      stats.averageReconciliationRate = totalBags > 0 ? (totalReconciled / totalBags) * 100 : 0;
    }

    // Rapports et bagages d'aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    stats.todayReports = allReports?.filter(r => {
      if (!r.uploaded_at) return false;
      return new Date(r.uploaded_at) >= today;
    }).length || 0;
    stats.todayBaggages = allBaggages?.filter(b => {
      if (!b.scanned_at) return false;
      return new Date(b.scanned_at) >= today;
    }).length || 0;

    // Vols actifs aujourd'hui
    const activeFlights = allReports?.filter(r => {
      const reportDate = new Date(r.flight_date);
      return reportDate.toDateString() === today.toDateString();
    }).map(r => r.flight_number) || [];

    res.json({
      success: true,
      data: {
        stats,
        activeFlights: [...new Set(activeFlights)],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/brs/transfers - Créer un transfert de bagage
router.post('/transfers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      baggage_id,
      from_flight_number,
      from_airport_code,
      to_flight_number,
      to_airport_code,
      transfer_type,
      connection_time_minutes,
      transfer_airport_code,
      requested_by,
      notes,
      reason
    } = req.body;

    // Créer le transfert
    const { data: transfer, error: transferError } = await supabase
      .from('brs_transfers')
      .insert({
        baggage_id,
        from_flight_number,
        from_airport_code,
        to_flight_number,
        to_airport_code,
        transfer_type: transfer_type || 'connection',
        connection_time_minutes,
        transfer_airport_code,
        requested_by,
        notes,
        reason,
        status: 'pending'
      })
      .select()
      .single();

    if (transferError) {
      // Si la table n'existe pas encore
      if (transferError.code === '42P01') {
        return res.status(201).json({
          success: true,
          message: 'Transfert créé (table non disponible)',
          data: {
            id: `transfer_${Date.now()}`,
            baggage_id,
            from_flight_number,
            to_flight_number,
            status: 'pending'
          }
        });
      }
      throw transferError;
    }

    // Créer une exception de type transfert
    const { data: baggage } = await supabase
      .from('international_baggages')
      .select('flight_number, airport_code')
      .eq('id', baggage_id)
      .single();

    if (baggage && transfer) {
      const { data: exception } = await supabase
        .from('brs_exceptions')
        .insert({
          type: 'transfer',
          severity: 'medium',
          status: 'open',
          baggage_id,
          flight_number: baggage.flight_number || from_flight_number,
          airport_code: baggage.airport_code,
          description: `Transfert de ${from_flight_number} vers ${to_flight_number}`,
          transfer_from_flight: from_flight_number,
          transfer_to_flight: to_flight_number,
          transfer_airport: transfer_airport_code,
          created_by: requested_by
        })
        .select()
        .single();

      // Envoyer une notification
      if (transfer) {
        await brsNotificationService.notifyTransfer(transfer, baggage.airport_code);
      }
    }

    res.status(201).json({
      success: true,
      data: transfer
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/brs/transfers - Liste des transferts
router.get('/transfers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { airport, status, flight } = req.query;

    let query = supabase
      .from('brs_transfers')
      .select('*')
      .order('requested_at', { ascending: false });

    if (airport) {
      query = query.eq('transfer_airport_code', airport);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (flight) {
      query = query.or(`from_flight_number.eq.${flight},to_flight_number.eq.${flight}`);
    }

    const { data: transfers, error } = await query;

    if (error) {
      if (error.code === '42P01') {
        return res.json({
          success: true,
          count: 0,
          data: []
        });
      }
      throw error;
    }

    res.json({
      success: true,
      count: transfers?.length || 0,
      data: transfers || []
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/brs/transfers/:transferId/confirm - Confirmer un transfert
router.post('/transfers/:transferId/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transferId } = req.params;
    const { confirmed_by } = req.body;

    const { error } = await supabase
      .from('brs_transfers')
      .update({
        status: 'transferred',
        confirmed_at: new Date().toISOString(),
        confirmed_by
      })
      .eq('id', transferId);

    if (error) {
      if (error.code === '42P01') {
        return res.json({
          success: true,
          message: 'Transfert confirmé'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: 'Transfert confirmé avec succès'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

