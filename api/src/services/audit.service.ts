/**
 * Service d'audit - Enregistre toutes les actions dans audit_logs
 */
import { supabase } from '../config/database';

export type AuditAction = 
  | 'CHECKIN_PASSENGER'
  | 'BOARD_PASSENGER'
  | 'REGISTER_BAGGAGE'
  | 'REGISTER_INTERNATIONAL_BAGGAGE'
  | 'CONFIRM_ARRIVAL'
  | 'SYNC_RAW_SCANS'
  | 'CREATE_PASSENGER'
  | 'CREATE_BAGGAGE'
  | 'UPDATE_BAGGAGE'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DELETE_USER'
  | 'LOGIN'
  | 'LOGOUT';

export type EntityType = 
  | 'passenger'
  | 'baggage'
  | 'international_baggage'
  | 'raw_scan'
  | 'user'
  | 'boarding'
  | 'flight';

interface AuditLogParams {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  description: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  airportCode: string;
  metadata?: Record<string, any>;
}

/**
 * Enregistre une action dans les logs d'audit
 * IMPORTANT: Les actions du rôle 'support' ne sont JAMAIS enregistrées (pas de trace)
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    // ⛔ BLOQUER l'enregistrement pour le rôle support (pas de trace)
    if (params.userRole === 'support') {
      console.log('[AUDIT] Action support non enregistrée (pas de trace):', params.action);
      return;
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        description: params.description,
        user_id: params.userId,
        user_name: params.userName,
        user_email: params.userEmail,
        airport_code: params.airportCode,
        metadata: params.metadata,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[AUDIT] Erreur lors de l\'enregistrement:', error);
    }
  } catch (err) {
    console.error('[AUDIT] Exception:', err);
  }
}

/**
 * Log rapide pour les actions de scan
 */
export async function logScanAction(
  action: AuditAction,
  entityType: EntityType,
  entityId: string,
  airportCode: string,
  details: string
): Promise<void> {
  await logAudit({
    action,
    entityType,
    entityId,
    description: details,
    airportCode,
  });
}
