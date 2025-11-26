import * as SQLite from 'expo-sqlite';
import { AuditLog, AuditAction } from '../types/audit.types';

class AuditService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(db: SQLite.SQLiteDatabase): Promise<void> {
    this.db = db;
    
    // Vérifier et ajouter la colonne airport_code si elle n'existe pas (migration)
    // Cette migration est nécessaire pour les bases de données créées avant l'ajout de cette colonne
    try {
      // Vérifier si la table existe et si la colonne airport_code existe
      const tableInfo = await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(audit_log)"
      );
      
      const hasAirportCodeColumn = tableInfo.some(col => col.name === 'airport_code');
      
      if (!hasAirportCodeColumn) {
        // La colonne n'existe pas, l'ajouter
        await db.execAsync(`
          ALTER TABLE audit_log ADD COLUMN airport_code TEXT;
          CREATE INDEX IF NOT EXISTS idx_audit_log_airport_code ON audit_log(airport_code);
        `);
        console.log('Added airport_code column to audit_log table');
      }
    } catch (error) {
      // Ignorer l'erreur si la table n'existe pas encore (elle sera créée par le schéma)
      // ou si la colonne existe déjà
      console.debug('Migration airport_code check:', error);
    }
  }

  /**
   * Enregistre une action d'audit
   */
  async logAction(
    userId: string,
    userEmail: string,
    airportCode: string,
    action: AuditAction,
    entityType: AuditLog['entityType'],
    details: string,
    entityId?: string
  ): Promise<void> {
    if (!this.db) {
      console.warn('Audit service not initialized');
      return;
    }

    try {
      const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Vérifier si la colonne airport_code existe, sinon utiliser une requête compatible
      await this.db.runAsync(
        `INSERT INTO audit_log (
          id, user_id, user_email, airport_code, action, entity_type, entity_id, details, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          userEmail,
          airportCode,
          action,
          entityType,
          entityId || null,
          details,
          now,
        ]
      );
    } catch (error) {
      // Si la colonne n'existe pas encore, essayer sans elle (pour migration)
      try {
        const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        await this.db.runAsync(
          `INSERT INTO audit_log (
            id, user_id, user_email, action, entity_type, entity_id, details, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            userId,
            userEmail,
            action,
            entityType,
            entityId || null,
            details,
            now,
          ]
        );
        // Ajouter la colonne pour les prochaines fois
        await this.db.execAsync(`
          ALTER TABLE audit_log ADD COLUMN airport_code TEXT;
          CREATE INDEX IF NOT EXISTS idx_audit_log_airport_code ON audit_log(airport_code);
        `);
      } catch (migrationError) {
        console.error('Error logging audit action:', error);
      }
    }
  }

  /**
   * Récupère les logs d'audit pour un utilisateur
   */
  async getAuditLogsByUser(userId: string, limit: number = 100): Promise<AuditLog[]> {
    if (!this.db) {
      throw new Error('Audit service not initialized');
    }

    const results = await this.db.getAllAsync<any>(
      `SELECT * FROM audit_log 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );

    return results.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: r.user_email,
      airportCode: r.airport_code || '',
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      details: r.details,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      createdAt: r.created_at,
    }));
  }

  /**
   * Récupère tous les logs d'audit (pour superviseur)
   */
  async getAllAuditLogs(limit: number = 500): Promise<AuditLog[]> {
    if (!this.db) {
      console.warn('Audit service not initialized - returning empty array');
      return [];
    }

    try {
      const results = await this.db.getAllAsync<any>(
        `SELECT * FROM audit_log 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [limit]
      );

      // Mapper les résultats pour gérer la colonne airport_code qui pourrait ne pas exister
      return results.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userEmail: r.user_email,
        airportCode: r.airport_code || '',
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        details: r.details,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        createdAt: r.created_at,
      }));
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  }

  /**
   * Récupère les logs d'audit pour un aéroport spécifique
   */
  async getAuditLogsByAirport(airportCode: string, limit: number = 500): Promise<AuditLog[]> {
    if (!this.db) {
      console.warn('Audit service not initialized - returning empty array');
      return [];
    }

    try {
      const results = await this.db.getAllAsync<any>(
        `SELECT * FROM audit_log 
         WHERE airport_code = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [airportCode, limit]
      );

      return results.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userEmail: r.user_email,
        airportCode: r.airport_code || airportCode,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        details: r.details,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        createdAt: r.created_at,
      }));
    } catch (error) {
      console.error('Error getting audit logs by airport:', error);
      return [];
    }
  }

  /**
   * Récupère les logs d'audit par action
   */
  async getAuditLogsByAction(action: AuditAction, limit: number = 100): Promise<AuditLog[]> {
    if (!this.db) {
      throw new Error('Audit service not initialized');
    }

    const results = await this.db.getAllAsync<any>(
      `SELECT * FROM audit_log 
       WHERE action = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [action, limit]
    );

    return results.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: r.user_email,
      airportCode: r.airport_code || '',
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      details: r.details,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      createdAt: r.created_at,
    }));
  }

  /**
   * Récupère les logs d'audit par date
   */
  async getAuditLogsByDate(date: string, limit: number = 100): Promise<AuditLog[]> {
    if (!this.db) {
      throw new Error('Audit service not initialized');
    }

    const results = await this.db.getAllAsync<any>(
      `SELECT * FROM audit_log 
       WHERE DATE(created_at) = DATE(?) 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [date, limit]
    );

    return results.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: r.user_email,
      airportCode: r.airport_code || '',
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      details: r.details,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      createdAt: r.created_at,
    }));
  }
}

export const auditService = new AuditService();

