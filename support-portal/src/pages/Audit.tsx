import { Activity, AlertTriangle, Building2, Clock, Download, FileText, Filter, Package, Plane, RefreshCw, Search, User, UserCheck, UserPlus, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuditService } from '../services/audit.service';
import { AuditFilters, AuditLog, AuditStats } from '../types/audit.types';
import { exportAuditLogsToExcel } from '../utils/auditExcelExport';

export default function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [recentActions, setRecentActions] = useState<AuditLog[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const limit = 50;

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await AuditService.getAuditLogs(page, limit, filters);
      setLogs(response.data);
      setTotalPages(response.pagination.totalPages);
      
      // Mettre à jour les utilisateurs en ligne (connexion dans les dernières 15 minutes)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const online = new Set<string>();
      
      // Vérifier les connexions récentes
      response.data.forEach(log => {
        if (log.action === 'LOGIN' && new Date(log.created_at) > fifteenMinutesAgo && log.user_id) {
          online.add(log.user_id);
        }
        if (log.action === 'LOGOUT' && new Date(log.created_at) > fifteenMinutesAgo && log.user_id) {
          online.delete(log.user_id);
        }
      });
      
      setOnlineUsers(online);
      
      // Mettre à jour les actions récentes (5 dernières minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recent = response.data.filter(log => new Date(log.created_at) > fiveMinutesAgo);
      setRecentActions(recent);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditStats = async () => {
    try {
      setStatsLoading(true);
      const response = await AuditService.getAuditStats();
      setStats(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, filters]);

  useEffect(() => {
    fetchAuditStats();
  }, []);

  // Rafraîchissement automatique
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchAuditLogs();
      fetchAuditStats();
    }, 30000); // Rafraîchir toutes les 30 secondes
    
    return () => clearInterval(interval);
  }, [autoRefresh, filters]);

  const handleFilterChange = (key: keyof AuditFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setPage(1);
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      // Récupérer tous les logs pour l'export (avec filtrage automatique du support)
      const allLogs = await AuditService.getAllAuditLogs(filters);
      
      // Utiliser l'export Excel professionnel avec filtrage automatique
      await exportAuditLogsToExcel(
        allLogs,
        filters.from,
        filters.to,
        {
          action: filters.action,
          entity_type: filters.entity_type,
          search: filters.search
        }
      );
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'export des logs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'LOGIN': 'bg-green-500/20 text-green-300',
      'LOGOUT': 'bg-gray-500/20 text-gray-300',
      'CHECKIN_PASSENGER': 'bg-blue-500/20 text-blue-300',
      'REGISTER_BAGGAGE': 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
      'UPDATE_BAGGAGE': 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
      'DELETE_BAGGAGE': 'bg-red-500/20 text-red-300 border border-red-500/30',
      'BOARD_PASSENGER': 'bg-orange-500/20 text-orange-300',
      'CREATE_USER_BY_SUPPORT': 'bg-indigo-500/20 text-indigo-300',
      'CREATE_AIRLINE_BY_SUPPORT': 'bg-cyan-500/20 text-cyan-300',
      'ERROR': 'bg-red-500/20 text-red-300',
    };
    return colors[action] || 'bg-indigo-500/20 text-indigo-300';
  };

  const getEntityTypeColor = (entityType: string) => {
    const colors: Record<string, string> = {
      'passenger': 'bg-blue-500/10 text-blue-400',
      'baggage': 'bg-purple-500/10 text-purple-400',
      'boarding': 'bg-orange-500/10 text-orange-400',
      'system': 'bg-gray-500/10 text-gray-400',
      'user': 'bg-green-500/10 text-green-400',
    };
    return colors[entityType] || 'bg-indigo-500/10 text-indigo-400';
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN': return <Wifi className="w-4 h-4" />;
      case 'LOGOUT': return <WifiOff className="w-4 h-4" />;
      case 'CHECKIN_PASSENGER': return <UserCheck className="w-4 h-4" />;
      case 'REGISTER_BAGGAGE': return <Package className="w-4 h-4" />;
      case 'BOARD_PASSENGER': return <Plane className="w-4 h-4" />;
      case 'CREATE_USER_BY_SUPPORT': return <UserPlus className="w-4 h-4" />;
      case 'CREATE_AIRLINE_BY_SUPPORT': return <Building2 className="w-4 h-4" />;
      case 'CREATE_USER': return <UserPlus className="w-4 h-4" />;
      case 'UPDATE_USER': return <User className="w-4 h-4" />;
      case 'DELETE_USER': return <User className="w-4 h-4" />;
      case 'ERROR': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getOnlineStatus = (userId?: string) => {
    if (!userId) return false;
    return onlineUsers.has(userId);
  };

  const getActionDetails = (log: AuditLog) => {
    const details = [];
    
    if (log.entity_id) {
      details.push(`ID: ${log.entity_id}`);
    }
    
    if (log.metadata) {
      if (log.metadata.baggage_count) {
        details.push(`Bagages: ${log.metadata.baggage_count}`);
      }
      if (log.metadata.flight_number) {
        details.push(`Vol: ${log.metadata.flight_number}`);
      }
      if (log.metadata.pnr) {
        details.push(`PNR: ${log.metadata.pnr}`);
      }
    }
    
    if (log.action.includes('BAGGAGE') && log.entity_id) {
      details.push(`Bagage ID: ${log.entity_id}`);
    }
    if (log.action === 'CHECKIN_PASSENGER' && log.entity_id) {
      details.push(`Passager ID: ${log.entity_id}`);
    }
    if (log.action === 'BOARD_PASSENGER' && log.entity_id) {
      details.push(`Embarquement ID: ${log.entity_id}`);
    }
    
    return details.length > 0 ? details.join(' • ') : null;
  };

  const isSupervisorAction = (action: string) => {
    return action.includes('SUPPORT') || action.includes('AIRLINE') || (action.includes('USER') && action.includes('CREATE'));
  };


  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white">Journal d'Audit</h1>
            <div className="flex items-center space-x-2 ml-4">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-white/70">{onlineUsers.size} en ligne</span>
              </div>
              {recentActions.length > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  <span className="text-sm text-white/70">{recentActions.length} actions récentes</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                autoRefresh 
                  ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto
            </button>
            <button
              onClick={() => {
                fetchAuditLogs();
                fetchAuditStats();
              }}
              className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Rafraîchir
            </button>
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </button>
          </div>
        </div>

        {/* Statistiques */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6 text-indigo-400" />
                <div>
                  <p className="text-sm text-white/70">Total des logs</p>
                  <p className="text-xl font-bold text-white">{stats.total.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Clock className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-sm text-white/70">Aujourd'hui</p>
                  <p className="text-xl font-bold text-white">{stats.today.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Activity className="w-6 h-6 text-purple-400" />
                <div>
                  <p className="text-sm text-white/70">Actions différentes</p>
                  <p className="text-xl font-bold text-white">{Object.keys(stats.byAction).length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <User className="w-6 h-6 text-orange-400" />
                <div>
                  <p className="text-sm text-white/70">Types d'entités</p>
                  <p className="text-xl font-bold text-white">{Object.keys(stats.byEntity).length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Utilisateurs en ligne */}
        {onlineUsers.size > 0 && (
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <h3 className="text-sm font-semibold text-green-300">Utilisateurs en ligne</h3>
              </div>
              <span className="text-xs text-green-300/70">{onlineUsers.size} connectés</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {logs
                .filter(log => log.user_id && getOnlineStatus(log.user_id))
                .slice(0, 8)
                .map((log) => (
                  <div key={log.id} className="bg-white/5 rounded-lg p-3 border border-green-500/20">
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-green-300" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black/30 animate-pulse"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white truncate">{log.user_name || 'Inconnu'}</div>
                        <div className="text-xs text-green-300/70">{log.user_email}</div>
                        <div className="text-xs text-white/50">{log.airport_code}</div>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Actions de bagages - Section spéciale */}
        {recentActions.filter(action => action.action.includes('BAGGAGE')).length > 0 && (
          <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                <h3 className="text-sm font-semibold text-orange-300">Actions de bagages</h3>
              </div>
              <span className="text-xs text-orange-300/70">
                {recentActions.filter(action => action.action.includes('BAGGAGE')).length} actions
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentActions
                .filter(action => action.action.includes('BAGGAGE'))
                .slice(0, 6)
                .map((action) => (
                  <div key={action.id} className="bg-white/5 rounded-lg p-3 border border-orange-500/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="text-orange-300">
                        {getActionIcon(action.action)}
                      </div>
                      <span className="text-xs font-medium text-white">{action.action}</span>
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    </div>
                    <div className="text-xs text-white/70 truncate">{action.description || 'Aucune description'}</div>
                    <div className="text-xs text-white/50 mt-1">
                      {action.user_name} • {formatDate(action.created_at)}
                    </div>
                    {getActionDetails(action) && (
                      <div className="text-xs text-orange-300/70 mt-1">
                        {getActionDetails(action)}
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Actions de superviseur - Section spéciale */}
        {recentActions.filter(action => isSupervisorAction(action.action)).length > 0 && (
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse"></div>
                <h3 className="text-sm font-semibold text-indigo-300">Actions de superviseur</h3>
              </div>
              <span className="text-xs text-indigo-300/70">
                {recentActions.filter(action => isSupervisorAction(action.action)).length} actions
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentActions
                .filter(action => isSupervisorAction(action.action))
                .slice(0, 6)
                .map((action) => (
                  <div key={action.id} className="bg-white/5 rounded-lg p-3 border border-indigo-500/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="text-indigo-300">
                        {getActionIcon(action.action)}
                      </div>
                      <span className="text-xs font-medium text-white">{action.action}</span>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                    </div>
                    <div className="text-xs text-white/70 truncate">{action.description || 'Aucune description'}</div>
                    <div className="text-xs text-white/50 mt-1">
                      {action.user_name} • {formatDate(action.created_at)}
                    </div>
                    {getActionDetails(action) && (
                      <div className="text-xs text-indigo-300/70 mt-1">
                        {getActionDetails(action)}
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Actions récentes et utilisateurs en ligne */}
        {recentActions.length > 0 && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                <h3 className="text-sm font-semibold text-blue-300">Actions en temps réel</h3>
              </div>
              <span className="text-xs text-blue-300/70">{recentActions.length} actions récentes</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentActions.slice(0, 6).map((action) => (
                <div key={action.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-blue-300">
                      {getActionIcon(action.action)}
                    </div>
                    <span className="text-xs font-medium text-white">{action.action}</span>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-xs text-white/70 truncate">{action.description || 'Aucune description'}</div>
                  <div className="text-xs text-white/50 mt-1">
                    {action.user_name} • {formatDate(action.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Information de filtrage */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <p className="text-blue-300 text-sm">
              <strong>Journal d'audit :</strong> Visualisation de toutes les actions effectuées dans le système.
              {onlineUsers.size > 0 && (
                <span className="ml-2 text-green-300">
                  • {onlineUsers.size} utilisateur(s) actuellement connecté(s)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtres
          </button>
          <div className="text-sm text-white/70">
            {totalPages > 0 ? `Page ${page} sur ${totalPages}` : 'Aucun résultat'}
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-white/5 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Action</label>
              <select
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 text-white border border-white/20 rounded-lg focus:outline-none focus:border-indigo-400"
              >
                <option value="">Toutes les actions</option>
                <optgroup label="Connexion">
                  <option value="LOGIN">Connexion</option>
                  <option value="LOGOUT">Déconnexion</option>
                </optgroup>
                <optgroup label="Gestion des passagers">
                  <option value="CHECKIN_PASSENGER">Enregistrement passager</option>
                  <option value="BOARD_PASSENGER">Embarquement</option>
                  <option value="UPDATE_PASSENGER">Mise à jour passager</option>
                </optgroup>
                <optgroup label="Bagages">
                  <option value="REGISTER_BAGGAGE">Enregistrement bagage</option>
                  <option value="UPDATE_BAGGAGE">Mise à jour bagage</option>
                  <option value="DELETE_BAGGAGE">Suppression bagage</option>
                </optgroup>
                <optgroup label="Administration">
                  <option value="CREATE_USER_BY_SUPPORT">Création utilisateur (Support)</option>
                  <option value="CREATE_AIRLINE_BY_SUPPORT">Création compagnie (Support)</option>
                  <option value="CREATE_USER">Création utilisateur</option>
                  <option value="UPDATE_USER">Mise à jour utilisateur</option>
                  <option value="DELETE_USER">Suppression utilisateur</option>
                </optgroup>
                <optgroup label="Système">
                  <option value="SYNC_RAW_SCANS">Synchronisation scans</option>
                  <option value="ERROR">Erreur</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Type d'entité</label>
              <select
                value={filters.entity_type || ''}
                onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 text-white border border-white/20 rounded-lg focus:outline-none focus:border-indigo-400"
              >
                <option value="">Tous les types</option>
                <option value="passenger">Passager</option>
                <option value="baggage">Bagage</option>
                <option value="boarding">Embarquement</option>
                <option value="system">Système</option>
                <option value="user">Utilisateur</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Date de début</label>
              <input
                type="date"
                value={filters.from || ''}
                onChange={(e) => handleFilterChange('from', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 text-white border border-white/20 rounded-lg focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Date de fin</label>
              <input
                type="date"
                value={filters.to || ''}
                onChange={(e) => handleFilterChange('to', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 text-white border border-white/20 rounded-lg focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-sm text-white/70 mb-2">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  placeholder="Rechercher dans les descriptions..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-white/10 text-white border border-white/20 rounded-lg focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table des logs */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Date & Heure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Aéroport
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/50">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                      Chargement des logs...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/50">
                    Aucun log d'audit trouvé
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors cursor-pointer" title="Cliquez pour voir les détails">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                        <span className="ml-1">{log.action}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntityTypeColor(log.entity_type)}`}>
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/80 max-w-md">
                      <div className="truncate">{log.description || '-'}</div>
                      {getActionDetails(log) && (
                        <div className="text-xs text-white/50 mt-1">
                          {getActionDetails(log)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/80">
                          {log.user_name ? (
                            <div className="flex items-center space-x-2">
                              <div className="relative">
                                <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-indigo-300" />
                                </div>
                                {getOnlineStatus(log.user_id) && (
                                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black/30 animate-pulse"></div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{log.user_name}</div>
                                <div className="text-xs text-white/50">{log.user_email}</div>
                                {getOnlineStatus(log.user_id) && (
                                  <div className="text-xs text-green-400 flex items-center">
                                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                                    En ligne
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-white/50">Système</span>
                          )}
                        </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                      {log.airport_code}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white/5 px-6 py-3 flex items-center justify-between border-t border-white/10">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-white/20 text-sm font-medium rounded-md text-white bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-white/20 text-sm font-medium rounded-md text-white bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-white/70">
                  Page <span className="font-medium">{page}</span> sur{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-white/20 bg-white/10 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Précédent</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page >= totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-white/20 bg-white/10 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Suivant</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}