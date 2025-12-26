/**
 * Routes pour la gestion des logs d'audit
 * Permet de consulter l'historique des actions dans le système
 */

import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/v1/audit
 * Liste les logs d'audit avec pagination et filtres
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const airportCode = req.query.airport as string || req.headers['x-airport-code'] as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const action = req.query.action as string;
    const entityType = req.query.entity_type as string;
    const from = req.query.from as string;
    const to = req.query.to as string;
    const search = req.query.search as string;

    if (!airportCode) {
      return res.status(400).json({ error: 'Code aéroport requis' });
    }

    // Construction de la requête
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });
    
    // Si l'aéroport n'est pas "ALL", filtrer par aéroport
    if (airportCode !== 'ALL' && airportCode !== 'all') {
      query = query.eq('airport_code', airportCode);
    }
    query = query.order('created_at', { ascending: false });

    // Filtres
    if (action) {
      query = query.eq('action', action);
    }

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (from) {
      query = query.gte('created_at', new Date(from).toISOString());
    }

    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }

    if (search) {
      query = query.ilike('description', `%${search}%`);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des logs' });
    }

    // Enrichir avec les infos utilisateur
    const userIds = [...new Set(logs?.filter(l => l.user_id).map(l => l.user_id))];
    let usersMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      if (users) {
        usersMap = users.reduce((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    const enrichedLogs = logs?.map(log => ({
      ...log,
      user_name: log.user_id ? usersMap[log.user_id]?.full_name : null,
      user_email: log.user_id ? usersMap[log.user_id]?.email : null
    }));

    res.json({
      success: true,
      data: enrichedLogs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('Error in GET /audit:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

/**
 * GET /api/v1/audit/stats
 * Statistiques des logs d'audit
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const airportCode = req.query.airport as string || req.headers['x-airport-code'] as string;

    if (!airportCode) {
      return res.status(400).json({ error: 'Code aéroport requis' });
    }

    const isAllAccess = airportCode === 'ALL' || airportCode === 'all';

    // Total des logs
    let totalQuery = supabase.from('audit_logs').select('*', { count: 'exact', head: true });
    if (!isAllAccess) totalQuery = totalQuery.eq('airport_code', airportCode);
    const { count: total } = await totalQuery;

    // Logs d'aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayQuery = supabase.from('audit_logs').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString());
    if (!isAllAccess) todayQuery = todayQuery.eq('airport_code', airportCode);
    const { count: todayCount } = await todayQuery;

    // Logs par action (top 10)
    let actionQuery = supabase.from('audit_logs').select('action');
    if (!isAllAccess) actionQuery = actionQuery.eq('airport_code', airportCode);
    const { data: actionLogs } = await actionQuery;

    const byAction: Record<string, number> = {};
    actionLogs?.forEach(log => {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
    });

    // Logs par entité
    let entityQuery = supabase.from('audit_logs').select('entity_type');
    if (!isAllAccess) entityQuery = entityQuery.eq('airport_code', airportCode);
    const { data: entityLogs } = await entityQuery;

    const byEntity: Record<string, number> = {};
    entityLogs?.forEach(log => {
      byEntity[log.entity_type] = (byEntity[log.entity_type] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total: total || 0,
        today: todayCount || 0,
        byAction,
        byEntity
      }
    });
  } catch (error: any) {
    console.error('Error in GET /audit/stats:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

/**
 * GET /api/v1/audit/export
 * Exporte les logs d'audit en CSV
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const airportCode = req.query.airport as string || req.headers['x-airport-code'] as string;
    const action = req.query.action as string;
    const entityType = req.query.entity_type as string;
    const from = req.query.from as string;
    const to = req.query.to as string;

    if (!airportCode) {
      return res.status(400).json({ error: 'Code aéroport requis' });
    }

    // Construction de la requête
    const isAllAccess = airportCode === 'ALL' || airportCode === 'all';
    let query = supabase
      .from('audit_logs')
      .select('*');
    
    if (!isAllAccess) {
      query = query.eq('airport_code', airportCode);
    }
    query = query.order('created_at', { ascending: false }).limit(10000); // Limite pour l'export

    if (action) query = query.eq('action', action);
    if (entityType) query = query.eq('entity_type', entityType);
    if (from) query = query.gte('created_at', new Date(from).toISOString());
    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error exporting audit logs:', error);
      return res.status(500).json({ error: 'Erreur lors de l\'export' });
    }

    // Enrichir avec les infos utilisateur
    const userIds = [...new Set(logs?.filter(l => l.user_id).map(l => l.user_id))];
    let usersMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      if (users) {
        usersMap = users.reduce((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Générer le CSV
    const headers = ['Date', 'Action', 'Type Entité', 'Description', 'Utilisateur', 'Email', 'Aéroport'];
    const rows = logs?.map(log => [
      new Date(log.created_at).toISOString(),
      log.action,
      log.entity_type,
      `"${(log.description || '').replace(/"/g, '""')}"`,
      log.user_id ? usersMap[log.user_id]?.full_name || '' : 'Système',
      log.user_id ? usersMap[log.user_id]?.email || '' : '',
      log.airport_code
    ]);

    const csv = [
      headers.join(','),
      ...(rows || []).map(row => row.join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${airportCode}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error in GET /audit/export:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

/**
 * POST /api/v1/audit
 * Crée un nouveau log d'audit (utilisé en interne)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { action, entity_type, entity_id, description, airport_code, user_id, metadata } = req.body;

    if (!action || !entity_type || !airport_code) {
      return res.status(400).json({ error: 'Action, type d\'entité et aéroport requis' });
    }

    const { data: log, error } = await supabase
      .from('audit_logs')
      .insert({
        action,
        entity_type,
        entity_id,
        description,
        airport_code,
        user_id,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating audit log:', error);
      return res.status(500).json({ error: 'Erreur lors de la création du log' });
    }

    res.status(201).json({
      success: true,
      data: log
    });
  } catch (error: any) {
    console.error('Error in POST /audit:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

export default router;

