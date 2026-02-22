import api from '../config/api';
import { AuditFilters, AuditLog, AuditStats, PaginationInfo } from '../types/audit.types';

export interface AuditResponse {
  success: boolean;
  data: AuditLog[];
  pagination: PaginationInfo;
}

export interface AuditStatsResponse {
  success: boolean;
  data: AuditStats;
}

export class AuditService {
  static async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    filters: AuditFilters = {}
  ): Promise<AuditResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.action && { action: filters.action }),
        ...(filters.entity_type && { entity_type: filters.entity_type }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await api.get(`/api/v1/audit?${params}`);
      const responseData = response.data as AuditResponse;
      
      // Filtrer automatiquement les actions du support (sauf superviseur)
      const filteredData = responseData.data.filter((log: AuditLog) => {
        // Garder uniquement :
        // 1. Les actions de superviseur (user_role = 'supervisor')
        // 2. Les actions des utilisateurs de l'application mobile (user_role = 'agent', 'user', etc.)
        // 3. Exclure les actions du support staff (user_role = 'support', 'admin')
        
        if (log.user_role === 'support' || log.user_role === 'admin') {
          return false; // Exclure le support staff
        }
        
        // Si c'est un superviseur ou un agent/utilisateur, on garde
        return ['supervisor', 'agent', 'user', 'passenger'].includes(log.user_role || '');
      });

      // Mettre à jour la réponse avec les données filtrées
      return {
        ...responseData,
        data: filteredData,
        pagination: {
          ...responseData.pagination,
          total: filteredData.length,
          totalPages: Math.ceil(filteredData.length / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  static async getAuditStats(): Promise<AuditStatsResponse> {
    try {
      const response = await api.get('/api/v1/audit/stats');
      return response.data as AuditStatsResponse;
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      throw error;
    }
  }

  static async getAllAuditLogs(filters: AuditFilters = {}): Promise<AuditLog[]> {
    try {
      const params = new URLSearchParams({
        limit: '10000', // Récupérer beaucoup de logs pour l'export
        ...(filters.action && { action: filters.action }),
        ...(filters.entity_type && { entity_type: filters.entity_type }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await api.get(`/api/v1/audit?${params}`);
      const responseData = response.data as AuditResponse;
      
      // Filtrer automatiquement les actions du support (sauf superviseur)
      const filteredData = responseData.data.filter((log: AuditLog) => {
        // Garder uniquement :
        // 1. Les actions de superviseur (user_role = 'supervisor')
        // 2. Les actions des utilisateurs de l'application mobile (user_role = 'agent', 'user', etc.)
        // 3. Exclure les actions du support staff (user_role = 'support', 'admin')
        
        if (log.user_role === 'support' || log.user_role === 'admin') {
          return false; // Exclure le support staff
        }
        
        // Si c'est un superviseur ou un agent/utilisateur, on garde
        return ['supervisor', 'agent', 'user', 'passenger'].includes(log.user_role || '');
      });

      return filteredData;
    } catch (error) {
      console.error('Error fetching all audit logs:', error);
      throw error;
    }
  }

  static async exportAuditLogs(filters: AuditFilters = {}): Promise<Blob> {
    try {
      const params = new URLSearchParams({
        ...(filters.action && { action: filters.action }),
        ...(filters.entity_type && { entity_type: filters.entity_type }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      });

      const response = await api.get(`/api/v1/audit/export?${params}`, {
        responseType: 'blob'
      });
      return response.data as Blob;
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw error;
    }
  }
}