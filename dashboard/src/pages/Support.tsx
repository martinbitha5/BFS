import {
  Building2,
  CheckCircle,
  Clock,
  Luggage,
  Package,
  Plane,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import { SUPPORTED_AIRPORTS } from '../config/airports';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface GlobalStats {
  totalPassengers: number;
  totalBaggages: number;
  boardedPassengers: number;
  notBoardedPassengers: number;
  arrivedBaggages: number;
  inTransitBaggages: number;
  todayPassengers: number;
  todayBaggages: number;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  airport_code: string;
  is_approved: boolean;
  created_at: string;
}

interface Airline {
  id: string;
  name: string;
  code: string;
  email: string;
  approved: boolean;
  created_at: string;
}

interface ApprovalRequest {
  id: string;
  email: string;
  full_name?: string;
  name?: string;
  code?: string;
  role?: string;
  airport_code?: string;
  status: string;
  requested_at: string;
}

type Tab = 'dashboard' | 'users' | 'airlines' | 'approvals';

export default function Support() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [userRequests, setUserRequests] = useState<ApprovalRequest[]>([]);
  const [airlineRequests, setAirlineRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Modal states
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateAirline, setShowCreateAirline] = useState(false);
  
  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'supervisor' as 'supervisor' | 'baggage_dispute',
    airport_code: ''
  });
  
  const [newAirline, setNewAirline] = useState({
    name: '',
    code: '',
    email: '',
    password: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError('');
      setLoading(true);

      // Récupérer toutes les données en parallèle
      const [statsRes, usersRes, userRequestsRes, airlineRequestsRes] = await Promise.all([
        api.get('/api/v1/stats/global?airport=ALL'),
        api.get('/api/v1/users?airport=ALL'),
        api.get('/api/v1/user-approval/requests'),
        api.get('/api/v1/airline-approval/requests')
      ]);

      setStats((statsRes.data as { data: GlobalStats }).data);
      setUsers((usersRes.data as { data: User[] }).data || []);
      setUserRequests((userRequestsRes.data as { data: ApprovalRequest[] }).data || []);
      setAirlineRequests((airlineRequestsRes.data as { data: ApprovalRequest[] }).data || []);
      
      // Récupérer les airlines (pas de route dédiée, on utilisera les requests approuvées)
      setLastUpdate(new Date());
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      
      await api.post('/api/v1/users/create-by-support', newUser);
      
      setSuccess(`Utilisateur "${newUser.full_name}" créé avec succès`);
      setShowCreateUser(false);
      setNewUser({ email: '', password: '', full_name: '', role: 'supervisor', airport_code: '' });
      fetchData();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur lors de la création');
    }
  };

  const handleCreateAirline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      
      await api.post('/api/v1/airlines/create-by-support', newAirline);
      
      setSuccess(`Compagnie "${newAirline.name}" créée avec succès`);
      setShowCreateAirline(false);
      setNewAirline({ name: '', code: '', email: '', password: '' });
      fetchData();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur lors de la création');
    }
  };

  const handleApproveUser = async (requestId: string) => {
    try {
      await api.post(`/api/v1/user-approval/requests/${requestId}/approve`);
      setSuccess('Utilisateur approuvé avec succès');
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur lors de l\'approbation');
    }
  };

  const handleRejectUser = async (requestId: string) => {
    try {
      await api.post(`/api/v1/user-approval/requests/${requestId}/reject`);
      setSuccess('Demande rejetée');
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur lors du rejet');
    }
  };

  const handleApproveAirline = async (requestId: string) => {
    try {
      await api.post(`/api/v1/airline-approval/requests/${requestId}/approve`);
      setSuccess('Compagnie aérienne approuvée avec succès');
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur lors de l\'approbation');
    }
  };

  const handleRejectAirline = async (requestId: string) => {
    try {
      await api.post(`/api/v1/airline-approval/requests/${requestId}/reject`);
      setSuccess('Demande rejetée');
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur lors du rejet');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    
    try {
      await api.delete(`/api/v1/users/${userId}`);
      setSuccess('Utilisateur supprimé');
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.airport_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingUserRequests = userRequests.filter(r => r.status === 'pending');
  const pendingAirlineRequests = airlineRequests.filter(r => r.status === 'pending');
  const totalPending = pendingUserRequests.length + pendingAirlineRequests.length;

  if (loading && !stats) {
    return <LoadingPlane text="Chargement du panneau support..." size="lg" />;
  }

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Vue Globale', icon: Package },
    { id: 'users' as Tab, label: 'Utilisateurs', icon: Users },
    { id: 'airlines' as Tab, label: 'Compagnies', icon: Plane },
    { id: 'approvals' as Tab, label: 'Approbations', icon: UserCheck, badge: totalPending },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-amber-400" />
            Panneau Support
          </h1>
          <p className="text-sm text-white/60">
            Gestion complète du système BFS
            {lastUpdate && (
              <span className="ml-2">
                • Mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-300">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* Stats globales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalPassengers}</p>
                  <p className="text-sm text-white/60">Passagers totaux</p>
                  <p className="text-xs text-blue-400">+{stats.todayPassengers} aujourd'hui</p>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Package className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalBaggages}</p>
                  <p className="text-sm text-white/60">Bagages totaux</p>
                  <p className="text-xs text-green-400">+{stats.todayBaggages} aujourd'hui</p>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.boardedPassengers}</p>
                  <p className="text-sm text-white/60">Embarqués</p>
                  <p className="text-xs text-orange-400">{stats.notBoardedPassengers} en attente</p>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Luggage className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.arrivedBaggages}</p>
                  <p className="text-sm text-white/60">Bagages arrivés</p>
                  <p className="text-xs text-blue-400">{stats.inTransitBaggages} en transit</p>
                </div>
              </div>
            </div>
          </div>

          {/* Résumé rapide */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Utilisateurs par rôle
              </h3>
              <div className="space-y-3">
                {['supervisor', 'baggage_dispute', 'support'].map(role => {
                  const count = users.filter(u => u.role === role).length;
                  const label = role === 'supervisor' ? 'Superviseurs' : 
                                role === 'baggage_dispute' ? 'Litiges Bagages' : 'Support';
                  return (
                    <div key={role} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                      <span className="text-white/70">{label}</span>
                      <span className="text-white font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Demandes en attente
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <span className="text-white/70">Utilisateurs</span>
                  <span className={`font-bold ${pendingUserRequests.length > 0 ? 'text-amber-400' : 'text-white'}`}>
                    {pendingUserRequests.length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <span className="text-white/70">Compagnies aériennes</span>
                  <span className={`font-bold ${pendingAirlineRequests.length > 0 ? 'text-amber-400' : 'text-white'}`}>
                    {pendingAirlineRequests.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <button
              onClick={() => setShowCreateUser(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Créer un utilisateur
            </button>
          </div>

          {/* Users list */}
          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/40 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Rôle</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Aéroport</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Statut</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/60 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-sm text-white">{u.full_name}</td>
                      <td className="px-4 py-3 text-sm text-white/70">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          u.role === 'support' ? 'bg-amber-500/20 text-amber-300' :
                          u.role === 'baggage_dispute' ? 'bg-purple-500/20 text-purple-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/70">{u.airport_code}</td>
                      <td className="px-4 py-3">
                        {u.is_approved ? (
                          <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-300">Actif</span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-300">En attente</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.role !== 'support' && u.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Airlines Tab */}
      {activeTab === 'airlines' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateAirline(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Créer une compagnie
            </button>
          </div>

          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Compagnies aériennes enregistrées
            </h3>
            <p className="text-white/60 text-sm">
              Les compagnies aériennes s'inscrivent via le portail dédié. Vous pouvez les créer directement ou approuver leurs demandes.
            </p>
            <div className="mt-4 space-y-2">
              {airlineRequests.filter(r => r.status === 'approved').map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{a.name}</p>
                    <p className="text-xs text-white/50">{a.email} • Code: {a.code}</p>
                  </div>
                  <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-300">
                    Approuvée
                  </span>
                </div>
              ))}
              {airlineRequests.filter(r => r.status === 'approved').length === 0 && (
                <p className="text-white/40 text-center py-4">Aucune compagnie enregistrée</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          {/* User Requests */}
          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl">
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                Demandes d'utilisateurs
                {pendingUserRequests.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded-full">
                    {pendingUserRequests.length} en attente
                  </span>
                )}
              </h3>
            </div>
            <div className="p-4">
              {pendingUserRequests.length === 0 ? (
                <p className="text-center text-white/50 py-4">Aucune demande en attente</p>
              ) : (
                <div className="space-y-3">
                  {pendingUserRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{req.full_name}</p>
                        <p className="text-xs text-white/50">{req.email}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-300">
                            {req.role}
                          </span>
                          <span className="px-2 py-0.5 text-xs rounded bg-white/10 text-white/70">
                            {req.airport_code}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveUser(req.id)}
                          className="p-2 bg-green-500/20 text-green-300 hover:bg-green-500/30 rounded-lg transition-colors"
                          title="Approuver"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRejectUser(req.id)}
                          className="p-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg transition-colors"
                          title="Rejeter"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Airline Requests */}
          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl">
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plane className="w-5 h-5 text-purple-400" />
                Demandes de compagnies aériennes
                {pendingAirlineRequests.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded-full">
                    {pendingAirlineRequests.length} en attente
                  </span>
                )}
              </h3>
            </div>
            <div className="p-4">
              {pendingAirlineRequests.length === 0 ? (
                <p className="text-center text-white/50 py-4">Aucune demande en attente</p>
              ) : (
                <div className="space-y-3">
                  {pendingAirlineRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{req.name}</p>
                        <p className="text-xs text-white/50">{req.email} • Code IATA: {req.code}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveAirline(req.id)}
                          className="p-2 bg-green-500/20 text-green-300 hover:bg-green-500/30 rounded-lg transition-colors"
                          title="Approuver"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRejectAirline(req.id)}
                          className="p-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg transition-colors"
                          title="Rejeter"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Créer Utilisateur */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Créer un utilisateur</h3>
              <button onClick={() => setShowCreateUser(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Rôle</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'supervisor' | 'baggage_dispute' })}
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="supervisor">Superviseur</option>
                  <option value="baggage_dispute">Litige Bagages</option>
                </select>
              </div>
              {newUser.role === 'supervisor' && (
                <div>
                  <label className="block text-sm text-white/70 mb-1">Code Aéroport</label>
                  <select
                    required
                    value={newUser.airport_code}
                    onChange={(e) => setNewUser({ ...newUser, airport_code: e.target.value })}
                    className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="">Sélectionner un aéroport</option>
                    {SUPPORTED_AIRPORTS.map(airport => (
                      <option key={airport.code} value={airport.code}>
                        {airport.code} - {airport.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="flex-1 px-4 py-2 border border-white/10 text-white/70 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Créer Compagnie */}
      {showCreateAirline && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Créer une compagnie aérienne</h3>
              <button onClick={() => setShowCreateAirline(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAirline} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Nom de la compagnie</label>
                <input
                  type="text"
                  required
                  value={newAirline.name}
                  onChange={(e) => setNewAirline({ ...newAirline, name: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                  placeholder="Ex: Ethiopian Airlines"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Code IATA (2 lettres)</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={newAirline.code}
                  onChange={(e) => setNewAirline({ ...newAirline, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                  placeholder="Ex: ET"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newAirline.email}
                  onChange={(e) => setNewAirline({ ...newAirline, email: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newAirline.password}
                  onChange={(e) => setNewAirline({ ...newAirline, password: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateAirline(false)}
                  className="flex-1 px-4 py-2 border border-white/10 text-white/70 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
