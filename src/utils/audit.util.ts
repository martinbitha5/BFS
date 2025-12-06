import { auditService } from '../services/audit.service';
import { authServiceInstance } from '../services';
import { AuditAction } from '../types/audit.types';

/**
 * Utilitaire pour logger les actions d'audit de manière centralisée
 */
export const logAudit = async (
  action: AuditAction,
  entityType: 'passenger' | 'baggage' | 'international_baggage' | 'boarding' | 'export' | 'system',
  details: string,
  entityId?: string
): Promise<void> => {
  try {
    const user = await authServiceInstance.getCurrentUser();
    if (user) {
      await auditService.logAction(user.id, user.email, user.airportCode, action, entityType, details, entityId);
    }
  } catch (error) {
    console.error('Error logging audit:', error);
    // Ne pas bloquer l'application si l'audit échoue
  }
};

