/**
 * Page d'Historique des Audits
 * Affiche toutes les actions effectuées dans le système
 */

import {
  Activity,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Package,
  Plane,
  RefreshCw,
  Search,
  User,
  Users,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  description: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  airport_code: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface AuditStats {
  total: number;
  today: number;
  byAction: Record<string, number>;
  byEntity: Record<string, number>;
}

const ACTION_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  CHECKIN_PASSENGER: { label: 'Check-in', color: 'bg-blue-900/40 text-blue-300 border-blue-500/30', icon: User },
  BOARD_PASSENGER: { label: 'Embarquement', color: 'bg-purple-900/40 text-purple-300 border-purple-500/30', icon: Plane },
  REGISTER_BAGGAGE: { label: 'Enregistrement bagage', color: 'bg-green-900/40 text-green-300 border-green-500/30', icon: Package },
  REGISTER_INTERNATIONAL_BAGGAGE: { label: 'Bagage international', color: 'bg-cyan-900/40 text-cyan-300 border-cyan-500/30', icon: Package },
  CONFIRM_ARRIVAL: { label: 'Arrivée confirmée', color: 'bg-orange-900/40 text-orange-300 border-orange-500/30', icon: Package },
  UPLOAD_BIRS: { label: 'Upload BIRS', color: 'bg-pink-900/40 text-pink-300 border-pink-500/30', icon: Activity },
  RECONCILE_BIRS: { label: 'Réconciliation BIRS', color: 'bg-yellow-900/40 text-yellow-300 border-yellow-500/30', icon: RefreshCw },
  CREATE_USER: { label: 'Création utilisateur', color: 'bg-indigo-900/40 text-indigo-300 border-indigo-500/30', icon: Users },
  UPDATE_USER: { label: 'Modification utilisateur', color: 'bg-indigo-900/40 text-indigo-300 border-indigo-500/30', icon: Users },
  DELETE_USER: { label: 'Suppression utilisateur', color: 'bg-red-900/40 text-red-300 border-red-500/30', icon: Users },
};

const ENTITY_ICONS: Record<string, any> = {
  passenger: User,
  baggage: Package,
  international_baggage: Package,
  boarding: Plane,
  birs_report: Activity,
  user: Users,
};

export default function AuditLogs() {
  const { user: currentUser } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(50);
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Détail
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [currentUser, page, filterAction, filterEntity, filterDateFrom, filterDateTo]);

  const fetchLogs = async () => {
    if (!currentUser?.airport_code) return;

    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        airport: currentUser.airport_code,
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filterAction) params.append('action', filterAction);
      if (filterEntity) params.append('entity_type', filterEntity);
      if (filterDateFrom) params.append('from', filterDateFrom);
      if (filterDateTo) params.append('to', filterDateTo);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/api/v1/audit?${params.toString()}`);
      setLogs(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!currentUser?.airport_code) return;

    try {
      const response = await api.get(`/api/v1/audit/stats?airport=${currentUser.airport_code}`);
      setStats(response.data.data);
    } catch (err: any) {
      console.error('Error fetching audit stats:', err);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        airport: currentUser?.airport_code || '',
        format: 'csv',
      });

      if (filterAction) params.append('action', filterAction);
      if (filterEntity) params.append('entity_type', filterEntity);
      if (filterDateFrom) params.append('from', filterDateFrom);
      if (filterDateTo) params.append('to', filterDateTo);

      const response = await api.get(`/api/v1/audit/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Error exporting logs:', err);
      setError('Erreur lors de l\'export');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionInfo = (action: string) => {
    return ACTION_LABELS[action] || { 
      label: action, 
      color: 'bg-gray-900/40 text-gray-300 border-gray-500/30',
      icon: Activity 
    };
  };

  const getEntityIcon = (entityType: string) => {
    return ENTITY_ICONS[entityType] || Activity;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Activity className="w-8 h-8 mr-3" />
            Historique des Actions
          </h1>
          <p className="text-white/70 mt-1">
            Journal d'audit de l'aéroport {currentUser?.airport_code}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </button>
          <button
            onClick={() => { setPage(1); fetchLogs(); fetchStats(); }}
            disabled={loading}
            className="px-4 py-2 bg-black/30 backdrop-blur-md border border-white/20 rounded-lg text-white hover:bg-black/50 transition-colors flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total Actions</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Activity className="w-8 h-8 text-primary-400 opacity-50" />
            </div>
          </div>
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Aujourd'hui</p>
                <p className="text-2xl font-bold text-green-400">{stats.today}</p>
              </div>
              <Clock className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </div>
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4 col-span-2">
            <p className="text-white/60 text-sm mb-2">Actions les plus fréquentes</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAction)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([action, count]) => {
                  const info = getActionInfo(action);
                  return (
                    <span key={action} className={`px-2 py-1 rounded-full text-xs border ${info.color}`}>
                      {info.label}: {count}
                    </span>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-900/30 backdrop-blur-md border border-red-500/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-300">{error}</span>
          </div>
          <button onClick={() => setError('')}>
            <X className="w-4 h-4 text-red-300" />
          </button>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher dans les descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white hover:bg-black/50 flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtres
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-white/20">
            <div>
              <label className="block text-sm text-white/70 mb-1">Action</label>
              <select
                value={filterAction}
                onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Toutes</option>
                {Object.entries(ACTION_LABELS).map(([value, info]) => (
                  <option key={value} value={value}>{info.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Entité</label>
              <select
                value={filterEntity}
                onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Toutes</option>
                <option value="passenger">Passager</option>
                <option value="baggage">Bagage</option>
                <option value="boarding">Embarquement</option>
                <option value="birs_report">Rapport BIRS</option>
                <option value="user">Utilisateur</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Date début</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Date fin</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Liste des logs */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-white/60 mb-4" />
            <p className="text-white/70">Chargement...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 mx-auto text-white/30 mb-4" />
            <p className="text-white/70">Aucun log trouvé</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-black/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Date/Heure
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Utilisateur
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {logs.map((log) => {
                    const actionInfo = getActionInfo(log.action);
                    const ActionIcon = actionInfo.icon;
                    const EntityIcon = getEntityIcon(log.entity_type);
                    
                    return (
                      <tr 
                        key={log.id} 
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-white/70">
                            <Clock className="w-4 h-4 mr-2" />
                            {formatDate(log.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${actionInfo.color}`}>
                            <ActionIcon className="w-3 h-3 mr-1" />
                            {actionInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start">
                            <EntityIcon className="w-4 h-4 mr-2 mt-0.5 text-white/50 flex-shrink-0" />
                            <span className="text-sm text-white/80 line-clamp-2">{log.description}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.user_name ? (
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-primary-600/30 flex items-center justify-center mr-2">
                                <User className="w-4 h-4 text-primary-400" />
                              </div>
                              <span className="text-sm text-white/70">{log.user_name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-white/50">Système</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-sm text-white/60">
                Page {page} sur {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-black/30 border border-white/20 rounded text-white disabled:opacity-50 hover:bg-black/50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-black/30 border border-white/20 rounded text-white disabled:opacity-50 hover:bg-black/50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Détail */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg max-w-lg w-full">
            <div className="p-6 border-b border-white/20 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Détail de l'Action</h2>
              <button onClick={() => setSelectedLog(null)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">Date/Heure</label>
                <p className="text-white">{formatDate(selectedLog.created_at)}</p>
              </div>
              
              <div>
                <label className="block text-sm text-white/60 mb-1">Action</label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getActionInfo(selectedLog.action).color}`}>
                  {getActionInfo(selectedLog.action).label}
                </span>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">Description</label>
                <p className="text-white">{selectedLog.description}</p>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">Type d'entité</label>
                <p className="text-white capitalize">{selectedLog.entity_type}</p>
              </div>

              {selectedLog.entity_id && (
                <div>
                  <label className="block text-sm text-white/60 mb-1">ID de l'entité</label>
                  <p className="text-white font-mono text-sm">{selectedLog.entity_id}</p>
                </div>
              )}

              {selectedLog.user_name && (
                <div>
                  <label className="block text-sm text-white/60 mb-1">Utilisateur</label>
                  <p className="text-white">{selectedLog.user_name}</p>
                  {selectedLog.user_email && (
                    <p className="text-white/60 text-sm">{selectedLog.user_email}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm text-white/60 mb-1">Aéroport</label>
                <p className="text-white">{selectedLog.airport_code}</p>
              </div>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <label className="block text-sm text-white/60 mb-1">Métadonnées</label>
                  <pre className="text-xs text-white/70 bg-black/30 rounded p-2 overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/20 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

