export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  description?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  ip_address?: string;
  details?: Record<string, any>;
  airport_code: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AuditStats {
  total: number;
  today: number;
  byAction: Record<string, number>;
  byEntity: Record<string, number>;
}

export interface AuditFilters {
  action?: string;
  entity_type?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}