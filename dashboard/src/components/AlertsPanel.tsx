/**
 * Panneau d'Alertes en Temps Réel
 * Affiche les alertes critiques sur le dashboard
 */

import {
    AlertTriangle,
    Bell,
    CheckCircle,
    ChevronRight,
    Clock,
    Package,
    Plane,
    RefreshCw,
    User,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface Alert {
  id: string;
  type: 'rush_baggage' | 'unboarded_passenger' | 'birs_pending' | 'scan_error' | 'flight_warning';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  entityId?: string;
  entityType?: string;
  flightNumber?: string;
  createdAt: string;
  acknowledged?: boolean;
}

interface AlertsPanelProps {
  className?: string;
  compact?: boolean;
}

const ALERT_CONFIG = {
  rush_baggage: {
    icon: Package,
    color: 'text-red-400',
    bg: 'bg-red-900/30 border-red-500/30',
    link: '/baggages'
  },
  unboarded_passenger: {
    icon: User,
    color: 'text-orange-400',
    bg: 'bg-orange-900/30 border-orange-500/30',
    link: '/passengers'
  },
  birs_pending: {
    icon: RefreshCw,
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/30 border-yellow-500/30',
    link: '/birs'
  },
  scan_error: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-900/30 border-red-500/30',
    link: '/raw-scans'
  },
  flight_warning: {
    icon: Plane,
    color: 'text-blue-400',
    bg: 'bg-blue-900/30 border-blue-500/30',
    link: '/flights'
  }
};

const SEVERITY_STYLES = {
  critical: 'animate-pulse border-l-4 border-l-red-500',
  warning: 'border-l-4 border-l-yellow-500',
  info: 'border-l-4 border-l-blue-500'
};

export default function AlertsPanel({ className = '', compact = false }: AlertsPanelProps) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    fetchAlerts();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchAlerts = async () => {
    if (!user?.airport_code) return;

    try {
      setLoading(true);
      
      // Récupérer les données pour générer les alertes
      const [baggagesRes, passengersRes, birsRes] = await Promise.all([
        api.get(`/api/v1/baggage?airport=${user.airport_code}&status=rush`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/v1/passengers?airport=${user.airport_code}`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/v1/birs/reports?airport=${user.airport_code}&status=pending`).catch(() => ({ data: { data: [] } }))
      ]);

      const newAlerts: Alert[] = [];

      // Bagages rush
      const rushBaggages = baggagesRes.data.data || [];
      rushBaggages.forEach((bag: any) => {
        const flightNum = bag.flightNumber || bag.flight_number;
        newAlerts.push({
          id: `rush-${bag.id}`,
          type: 'rush_baggage',
          severity: 'critical',
          title: 'Bagage Rush',
          message: `Bagage ${bag.tagNumber || bag.tag_number || 'N/A'} en urgence pour le vol ${flightNum || 'N/A'}`,
          entityId: bag.id,
          entityType: 'baggage',
          flightNumber: flightNum,
          createdAt: bag.updatedAt || bag.updated_at || new Date().toISOString()
        });
      });

      // Passagers non embarqués (proche du départ)
      const unboardedPassengers = passengersRes.data.data || [];
      // Filtrer seulement ceux qui ont un vol assigné et qui ne sont pas embarqués
      const notBoarded = unboardedPassengers.filter((pax: any) => {
        const hasBoarding = pax.boarding_status?.some((bs: any) => bs.boarded);
        return !hasBoarding;
      });
      notBoarded.slice(0, 5).forEach((pax: any) => {
        const flightNum = pax.flightNumber || pax.flight_number;
        const passengerName = pax.fullName || pax.full_name || 'Passager';
        newAlerts.push({
          id: `unboarded-${pax.id}`,
          type: 'unboarded_passenger',
          severity: 'warning',
          title: 'Passager non embarqué',
          message: `${passengerName} n'est pas encore embarqué sur ${flightNum || 'vol non assigné'}`,
          entityId: pax.id,
          entityType: 'passenger',
          flightNumber: flightNum,
          createdAt: pax.updatedAt || pax.updated_at || new Date().toISOString()
        });
      });

      // Rapports BIRS en attente
      const pendingBirs = birsRes.data.data || [];
      pendingBirs.forEach((report: any) => {
        const flightNum = report.flightNumber || report.flight_number;
        newAlerts.push({
          id: `birs-${report.id}`,
          type: 'birs_pending',
          severity: 'info',
          title: 'BIRS en attente',
          message: `Rapport BIRS pour le vol ${flightNum || 'N/A'} nécessite une réconciliation`,
          entityId: report.id,
          entityType: 'birs_report',
          flightNumber: flightNum,
          createdAt: report.createdAt || report.created_at || new Date().toISOString()
        });
      });

      // Trier par sévérité puis par date
      newAlerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('fr-FR');
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`relative p-3 bg-black/30 backdrop-blur-md border border-white/20 rounded-lg hover:bg-black/50 transition-colors ${className}`}
      >
        <Bell className="w-5 h-5 text-white" />
        {alerts.length > 0 && (
          <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center ${
            criticalCount > 0 ? 'bg-red-500' : 'bg-yellow-500'
          } text-white font-bold`}>
            {alerts.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`bg-black/30 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center">
          <Bell className="w-5 h-5 mr-2 text-white" />
          <h3 className="font-semibold text-white">Alertes</h3>
          {alerts.length > 0 && (
            <div className="ml-3 flex gap-2">
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 bg-red-900/50 text-red-300 text-xs rounded-full">
                  {criticalCount} critique{criticalCount > 1 ? 's' : ''}
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-300 text-xs rounded-full">
                  {warningCount} avertissement{warningCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="p-1 text-white/60 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {compact && (
            <button
              onClick={() => setExpanded(false)}
              className="p-1 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Liste des alertes */}
      <div className="max-h-96 overflow-y-auto">
        {loading && alerts.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-white/40 mb-2" />
            <p className="text-white/60 text-sm">Chargement...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-8 h-8 mx-auto text-green-400/50 mb-2" />
            <p className="text-white/60 text-sm">Aucune alerte active</p>
            <p className="text-white/40 text-xs mt-1">Tout fonctionne normalement</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {alerts.map((alert) => {
              const config = ALERT_CONFIG[alert.type];
              const Icon = config.icon;

              return (
                <div
                  key={alert.id}
                  className={`p-4 ${config.bg} ${SEVERITY_STYLES[alert.severity]} hover:bg-white/5 transition-colors`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1">
                      <div className={`p-2 rounded-lg ${config.bg} mr-3`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-white">{alert.title}</h4>
                          {alert.flightNumber && (
                            <span className="px-2 py-0.5 bg-white/10 text-white/70 text-xs rounded">
                              {alert.flightNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/70 mt-1 line-clamp-2">{alert.message}</p>
                        <div className="flex items-center mt-2 text-xs text-white/50">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTime(alert.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Link
                        to={config.link}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title="Voir les détails"
                      >
                        <ChevronRight className="w-4 h-4 text-white/60" />
                      </Link>
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title="Ignorer"
                      >
                        <X className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {alerts.length > 0 && (
        <div className="p-3 border-t border-white/10 text-center">
          <Link
            to="/audit-logs"
            className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            Voir l'historique complet →
          </Link>
        </div>
      )}
    </div>
  );
}

