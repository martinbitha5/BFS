export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  airportCode: string;
  action: string;
  entityType: 'passenger' | 'baggage' | 'boarding' | 'export' | 'system';
  entityId?: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export type AuditAction =
  | 'CHECKIN_PASSENGER'
  | 'REGISTER_BAGGAGE'
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
  | 'ERROR';

