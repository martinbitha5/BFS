// Interface pour les logs d'audit Supabase (PostgreSQL)
export interface AuditLog {
  id: string;
  action: string;
  entityType: 'passenger' | 'baggage' | 'international_baggage' | 'boarding' | 'export' | 'system' | 'user';
  entityId?: string;
  description?: string;
  userId?: string;
  airportCode: string;
  metadata?: Record<string, any>;
  createdAt: string;
  // Champs enrichis par l'API
  userName?: string;
  userEmail?: string;
}

export type AuditAction =
  | 'CHECKIN_PASSENGER'
  | 'REGISTER_BAGGAGE'
  | 'REGISTER_INTERNATIONAL_BAGGAGE'
  | 'BOARD_PASSENGER'
  | 'CONFIRM_ARRIVAL'
  | 'EXPORT_DATA'
  | 'VIEW_PASSENGER'
  | 'VIEW_BAGGAGE'
  | 'VIEW_STATISTICS'
  | 'FILTER_DATA'
  | 'SYNC_DATA'
  | 'LOGIN'
  | 'LOGOUT'
  | 'MARK_RUSH'
  | 'CANCEL_RUSH'
  | 'ERROR';

