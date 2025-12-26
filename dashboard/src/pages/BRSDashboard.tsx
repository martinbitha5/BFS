/**
 * Dashboard BRS Complet - Système de Réconciliation des Bagages
 * Conforme aux standards IATA Resolution 753
 * Adapté pour les aéroports en RDC
 */

import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle,
  Clock,
  FileText,
  Package,
  RefreshCw,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface BRSStats {
  totalBaggages: number;
  reconciled: number;
  unmatched: number;
  rush: number;
  totalReports: number;
  pendingReports: number;
  averageReconciliationRate: number;
  todayReports: number;
  todayBaggages: number;
  activeFlights: string[];
}

interface BRSAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  flight_number?: string;
  created_at: string;
  acknowledged: boolean;
}

interface WorkflowStep {
  id: string;
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completed_at?: string;
}

export default function BRSDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<BRSStats | null>(null);
  const [alerts, setAlerts] = useState<BRSAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (user?.airport_code) {
      fetchDashboardData();
      
      if (autoRefresh) {
        const interval = setInterval(() => {
          fetchDashboardData();
        }, 30000); // Rafraîchir toutes les 30 secondes
        
        return () => clearInterval(interval);
      }
    }
  }, [user, autoRefresh]);

  const fetchDashboardData = async () => {
    if (!user?.airport_code) return;
    
    try {
      setLoading(true);
      
      // Récupérer les statistiques
      const statsResponse = await api.get(`/api/v1/brs/dashboard/${user.airport_code}`);
      setStats(statsResponse.data.data.stats);
      
      // Récupérer les alertes
      const alertsResponse = await api.get(`/api/v1/brs/alerts?airport=${user.airport_code}`);
      setAlerts(alertsResponse.data.data || []);
    } catch (err: any) {
      console.error('Error fetching BRS dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-900/40 border-red-500/30 text-red-300';
      case 'high': return 'bg-orange-900/40 border-orange-500/30 text-orange-300';
      case 'medium': return 'bg-yellow-900/40 border-yellow-500/30 text-yellow-300';
      default: return 'bg-blue-900/40 border-blue-500/30 text-blue-300';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
        <p className="ml-3 text-white/80">Chargement du dashboard BRS...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <BarChart3 className="w-8 h-8 inline mr-2" />
            Dashboard BRS - Temps Réel
          </h1>
          <p className="text-white/80 mt-1">
            Système de Réconciliation des Bagages - Conforme IATA Resolution 753
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              autoRefresh 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Auto-refresh {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Alertes critiques */}
      {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length > 0 && (
        <div className="bg-red-900/30 backdrop-blur-md border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <AlertTriangle className="w-6 h-6 text-red-400 mr-2" />
            <h3 className="text-lg font-semibold text-red-300">Alertes Critiques</h3>
          </div>
          <div className="space-y-2">
            {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').map(alert => (
              <div key={alert.id} className={`p-3 rounded border ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    {getAlertIcon(alert.type)}
                    <div>
                      <p className="font-semibold">{alert.title}</p>
                      <p className="text-sm opacity-90">{alert.message}</p>
                      {alert.flight_number && (
                        <p className="text-xs opacity-70 mt-1">Vol: {alert.flight_number}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs opacity-70">
                    {new Date(alert.created_at).toLocaleTimeString('fr-FR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistiques principales */}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Total Bagages</p>
                  <p className="text-2xl font-bold text-white">{stats.totalBaggages}</p>
                  <p className="text-xs text-white/50 mt-1">Aujourd'hui: {stats.todayBaggages}</p>
                </div>
                <Package className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Réconciliés</p>
                  <p className="text-2xl font-bold text-green-400">{stats.reconciled}</p>
                  <p className="text-xs text-green-300/70 mt-1">
                    {stats.totalBaggages > 0 ? ((stats.reconciled / stats.totalBaggages) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Non Matchés</p>
                  <p className="text-2xl font-bold text-orange-400">{stats.unmatched}</p>
                  <p className="text-xs text-orange-300/70 mt-1">À traiter</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-400" />
              </div>
            </div>
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Taux Moyen</p>
                  <p className="text-2xl font-bold text-blue-400">{(stats.averageReconciliationRate ?? 0).toFixed(1)}%</p>
                  <p className="text-xs text-blue-300/70 mt-1">Réconciliation</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Répartition des statuts */}
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <PieChart className="w-5 h-5 mr-2" />
                Répartition des Statuts
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Réconciliés', value: stats.reconciled, color: '#10b981' },
                      { name: 'Non Matchés', value: stats.unmatched, color: '#f59e0b' },
                      { name: 'RUSH', value: stats.rush, color: '#ef4444' },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Réconciliés', value: stats.reconciled, color: '#10b981' },
                      { name: 'Non Matchés', value: stats.unmatched, color: '#f59e0b' },
                      { name: 'RUSH', value: stats.rush, color: '#ef4444' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Vols actifs */}
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Vols Actifs Aujourd'hui
              </h3>
              <div className="space-y-2">
                {stats.activeFlights && stats.activeFlights.length > 0 ? (
                  stats.activeFlights.map((flight, index) => (
                    <div key={index} className="bg-black/20 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-primary-400" />
                        <span className="text-white font-medium">{flight}</span>
                      </div>
                      <span className="text-white/60 text-sm">Actif</span>
                    </div>
                  ))
                ) : (
                  <p className="text-white/60 text-center py-8">Aucun vol actif aujourd'hui</p>
                )}
              </div>
            </div>
          </div>

          {/* Statistiques des rapports */}
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Statistiques des Rapports
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/20 rounded-lg p-4">
                <p className="text-white/60 text-sm">Total Rapports</p>
                <p className="text-2xl font-bold text-white">{stats.totalReports}</p>
              </div>
              <div className="bg-black/20 rounded-lg p-4">
                <p className="text-white/60 text-sm">En Attente</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pendingReports}</p>
              </div>
              <div className="bg-black/20 rounded-lg p-4">
                <p className="text-white/60 text-sm">Aujourd'hui</p>
                <p className="text-2xl font-bold text-blue-400">{stats.todayReports}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toutes les alertes */}
      {alerts.length > 0 && (
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Toutes les Alertes ({alerts.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alerts.map(alert => (
              <div key={alert.id} className={`p-3 rounded border ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    {getAlertIcon(alert.type)}
                    <div>
                      <p className="font-semibold">{alert.title}</p>
                      <p className="text-sm opacity-90">{alert.message}</p>
                      {alert.flight_number && (
                        <p className="text-xs opacity-70 mt-1">Vol: {alert.flight_number}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs opacity-70">
                    {new Date(alert.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

