"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
exports.logScanAction = logScanAction;
/**
 * Service d'audit - Enregistre toutes les actions dans audit_logs
 */
const database_1 = require("../config/database");
/**
 * Enregistre une action dans les logs d'audit
 * IMPORTANT: Les actions du rôle 'support' ne sont JAMAIS enregistrées (pas de trace)
 */
async function logAudit(params) {
    try {
        // ⛔ BLOQUER l'enregistrement pour le rôle support (pas de trace)
        if (params.userRole === 'support') {
            console.log('[AUDIT] Action support non enregistrée (pas de trace):', params.action);
            return;
        }
        const { error } = await database_1.supabase
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
    }
    catch (err) {
        console.error('[AUDIT] Exception:', err);
    }
}
/**
 * Log rapide pour les actions de scan
 */
async function logScanAction(action, entityType, entityId, airportCode, details) {
    await logAudit({
        action,
        entityType,
        entityId,
        description: details,
        airportCode,
    });
}
