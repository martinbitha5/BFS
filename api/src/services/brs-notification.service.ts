/**
 * Service de Notifications BRS
 * Gère les notifications multi-canaux (email, SMS, push, in-app)
 */

import { supabase } from '../config/database';

interface NotificationData {
  type: 'alert' | 'exception' | 'workflow' | 'transfer' | 'sla' | 'report';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  user_id?: string;
  airport_code: string;
  role?: string;
  exception_id?: string;
  report_id?: string;
  transfer_id?: string;
  action_url?: string;
}

class BRSNotificationService {
  /**
   * Crée une notification dans la base de données
   */
  async createNotification(data: NotificationData): Promise<string> {
    try {
      const { data: notification, error } = await supabase
        .from('brs_notifications')
        .insert({
          type: data.type,
          severity: data.severity,
          title: data.title,
          message: data.message,
          user_id: data.user_id,
          airport_code: data.airport_code,
          role: data.role,
          exception_id: data.exception_id,
          report_id: data.report_id,
          transfer_id: data.transfer_id,
          action_url: data.action_url,
          status: 'pending',
          in_app: true
        })
        .select('id')
        .single();

      if (error) {
        // Si la table n'existe pas encore, retourner un ID factice
        if (error.code === '42P01') {
          console.warn('Table brs_notifications not found, notification not persisted');
          return `notif_${Date.now()}`;
        }
        throw error;
      }

      // Envoyer la notification selon les canaux configurés
      await this.sendNotification(notification.id, data);

      return notification.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Envoie la notification selon les canaux configurés
   */
  private async sendNotification(notificationId: string, data: NotificationData): Promise<void> {
    // Pour l'instant, on marque juste comme envoyée dans l'app
    // Dans une vraie implémentation, on enverrait email/SMS/push ici
    
    try {
      await supabase
        .from('brs_notifications')
        .update({
          status: 'sent',
          in_app: true,
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId);
    } catch (error) {
      // Ignorer si la table n'existe pas
      if (error.code !== '42P01') {
        console.error('Error updating notification status:', error);
      }
    }

    // TODO: Implémenter l'envoi email
    // TODO: Implémenter l'envoi SMS
    // TODO: Implémenter les notifications push
  }

  /**
   * Crée une notification pour une exception
   */
  async notifyException(exception: any, airportCode: string): Promise<void> {
    const severityMap: Record<string, 'info' | 'warning' | 'error' | 'critical'> = {
      low: 'info',
      medium: 'warning',
      high: 'error',
      critical: 'critical'
    };

    await this.createNotification({
      type: 'exception',
      severity: severityMap[exception.severity] || 'warning',
      title: `Exception BRS: ${exception.type}`,
      message: exception.description,
      airport_code: airportCode,
      exception_id: exception.id,
      action_url: `/brs-unmatched?exception=${exception.id}`
    });
  }

  /**
   * Crée une notification pour un workflow
   */
  async notifyWorkflowStep(reportId: string, step: string, status: string, airportCode: string): Promise<void> {
    if (status === 'completed') {
      await this.createNotification({
        type: 'workflow',
        severity: 'info',
        title: `Étape ${step} complétée`,
        message: `L'étape ${step} du workflow a été complétée avec succès`,
        airport_code: airportCode,
        report_id: reportId,
        action_url: `/brs-workflow?report=${reportId}`
      });
    } else if (status === 'failed') {
      await this.createNotification({
        type: 'workflow',
        severity: 'error',
        title: `Étape ${step} échouée`,
        message: `L'étape ${step} du workflow a échoué`,
        airport_code: airportCode,
        report_id: reportId,
        action_url: `/brs-workflow?report=${reportId}`
      });
    }
  }

  /**
   * Crée une notification pour un transfert
   */
  async notifyTransfer(transfer: any, airportCode: string): Promise<void> {
    await this.createNotification({
      type: 'transfer',
      severity: 'info',
      title: `Transfert de bagage`,
      message: `Transfert de ${transfer.from_flight_number} vers ${transfer.to_flight_number}`,
      airport_code: airportCode,
      transfer_id: transfer.id,
      action_url: `/brs-transfers?transfer=${transfer.id}`
    });
  }

  /**
   * Crée une notification SLA (délai dépassé)
   */
  async notifySLAViolation(reportId: string, delayHours: number, airportCode: string): Promise<void> {
    await this.createNotification({
      type: 'sla',
      severity: delayHours > 48 ? 'critical' : 'error',
      title: 'Violation SLA',
      message: `Le rapport n'a pas été traité depuis ${delayHours} heures`,
      airport_code: airportCode,
      report_id: reportId,
      action_url: `/birs?report=${reportId}`
    });
  }
}

export const brsNotificationService = new BRSNotificationService();

