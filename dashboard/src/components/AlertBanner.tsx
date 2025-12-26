/**
 * Composant AlertBanner
 * Affiche des alertes importantes en haut de l'écran
 * Utilisé pour les situations critiques (bagages perdus, rush, etc.)
 */

import { AlertTriangle, Bell, CheckCircle, Info, Package, Plane, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
  dismissible?: boolean;
  timestamp?: string;
}

const ALERT_STYLES = {
  critical: {
    bg: 'bg-gradient-to-r from-red-900/90 to-red-800/90',
    border: 'border-red-500/50',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    pulse: true,
  },
  warning: {
    bg: 'bg-gradient-to-r from-yellow-900/90 to-orange-900/90',
    border: 'border-yellow-500/50',
    icon: AlertTriangle,
    iconColor: 'text-yellow-400',
    pulse: false,
  },
  info: {
    bg: 'bg-gradient-to-r from-blue-900/90 to-cyan-900/90',
    border: 'border-blue-500/50',
    icon: Info,
    iconColor: 'text-blue-400',
    pulse: false,
  },
  success: {
    bg: 'bg-gradient-to-r from-green-900/90 to-emerald-900/90',
    border: 'border-green-500/50',
    icon: CheckCircle,
    iconColor: 'text-green-400',
    pulse: false,
  },
};

export default function AlertBanner() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.airport_code) {
      fetchAlerts();
      // Actualiser toutes les 30 secondes
      const interval = setInterval(fetchAlerts, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchAlerts = async () => {
    if (!user?.airport_code) return;

    try {
      setLoading(true);
      
      // Récupérer les stats pour détecter les alertes
      const [statsResponse, rushResponse] = await Promise.all([
        api.get(`/api/v1/stats/airport/${user.airport_code}`).catch(() => null),
        api.get(`/api/v1/rush?airport=${user.airport_code}&status=pending`).catch(() => null),
      ]);

      const newAlerts: Alert[] = [];

      // Alerte pour les passagers non embarqués
      const notBoardedCount = statsResponse?.data?.data?.notBoardedPassengers || 0;
      if (notBoardedCount > 5) {
        newAlerts.push({
          id: 'not-boarded',
          type: 'warning',
          title: 'Passagers en attente',
          message: `${notBoardedCount} passagers n'ont pas encore embarqué`,
          action: {
            label: 'Voir les passagers',
            href: '/passengers',
          },
          dismissible: true,
        });
      }

      // Alerte pour les bagages rush
      const rushBaggages = rushResponse?.data?.data || [];
      if (rushBaggages.length > 0) {
        newAlerts.push({
          id: 'rush-baggages',
          type: 'critical',
          title: 'Bagages RUSH en attente',
          message: `${rushBaggages.length} bagage(s) prioritaire(s) nécessitent une attention immédiate`,
          action: {
            label: 'Traiter les rush',
            href: '/baggages?status=rush',
          },
          dismissible: false,
        });
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.includes(alert.id));

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 pt-4 space-y-2">
        {visibleAlerts.map((alert) => {
          const styles = ALERT_STYLES[alert.type];
          const Icon = styles.icon;

          return (
            <div
              key={alert.id}
              className={`
                ${styles.bg} ${styles.border}
                backdrop-blur-md border rounded-lg shadow-xl p-4
                pointer-events-auto
                animate-fade-in
                ${styles.pulse ? 'animate-pulse-border border-2' : ''}
              `}
            >
              <div className="flex items-center gap-4">
                <div className={`flex-shrink-0 ${styles.iconColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white">{alert.title}</h4>
                  <p className="text-sm text-white/80 mt-0.5">{alert.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  {alert.action && (
                    <a
                      href={alert.action.href}
                      className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {alert.action.label}
                    </a>
                  )}
                  {alert.dismissible && (
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Hook pour déclencher des alertes manuellement
 */
export function useAlerts() {
  const [customAlerts, setCustomAlerts] = useState<Alert[]>([]);

  const showAlert = (alert: Omit<Alert, 'id'>) => {
    const id = `custom-${Date.now()}`;
    setCustomAlerts(prev => [...prev, { ...alert, id }]);
    
    // Auto-dismiss après 10 secondes si dismissible
    if (alert.dismissible !== false) {
      setTimeout(() => {
        setCustomAlerts(prev => prev.filter(a => a.id !== id));
      }, 10000);
    }
  };

  const dismissAlert = (id: string) => {
    setCustomAlerts(prev => prev.filter(a => a.id !== id));
  };

  return {
    alerts: customAlerts,
    showAlert,
    dismissAlert,
  };
}

