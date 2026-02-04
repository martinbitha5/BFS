import {
    AlertCircle,
    Briefcase,
    Building2,
    Check,
    Package,
    Plane,
    RefreshCw,
    Users,
    X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface Stats {
  totalPassengers: number;
  totalBaggages: number;
  totalUsers: number;
  totalAirlines: number;
  pendingRequests: number;
}

interface AirlineRequest {
  id: string;
  name: string;
  code: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalPassengers: 0,
    totalBaggages: 0,
    totalUsers: 0,
    totalAirlines: 0,
    pendingRequests: 0
  });
  const [pendingRequests, setPendingRequests] = useState<AirlineRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('bfs_support_token');
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch stats - utiliser les routes appropriées
      const [passengersRes, usersRes, airlinesRes, pendingRes] = await Promise.all([
        api.get('/api/v1/passengers/all', { headers }).catch((err) => {
          console.warn('Erreur passagers:', err?.response?.data?.error || err.message);
          return { data: { data: [] } };
        }),
        api.get('/api/v1/support/users/all', { headers }).catch((err) => {
          console.warn('Erreur utilisateurs:', err?.response?.data?.error || err.message);
          return { data: { data: [] } };
        }),
        api.get('/api/v1/airlines', { headers }).catch((err) => {
          console.warn('Erreur airlines:', err?.response?.data?.error || err.message);
          return { data: { data: [] } };
        }),
        api.get('/api/v1/airline-approval/requests?status=pending', { headers }).catch((err) => {
          console.warn('Erreur demandes:', err?.response?.data?.error || err.message);
          return { data: { data: [] } };
        })
      ]);

      const passengers = (passengersRes.data as unknown as ApiResponse<any[]>)?.data || [];
      const users = (usersRes.data as unknown as ApiResponse<any[]>)?.data || [];
      const airlines = (airlinesRes.data as unknown as ApiResponse<any[]>)?.data || [];
      const pending = (pendingRes.data as unknown as ApiResponse<AirlineRequest[]>)?.data || [];

      // Calculate total baggages
      const totalBaggages = passengers.reduce((sum: number, p: any) => sum + (p.baggages?.length || 0), 0);

      setStats({
        totalPassengers: passengers.length,
        totalBaggages,
        totalUsers: users.length,
        totalAirlines: airlines.length,
        pendingRequests: pending.length
      });

      setPendingRequests(pending);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.error || err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleApproveAirline = async (airlineId: string) => {
    try {
      const token = localStorage.getItem('bfs_support_token');
      await api.post(`/api/v1/airline-approval/requests/${airlineId}/approve`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccessMessage('Compagnie approuvée !');
      fetchData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de l\'approbation');
    }
  };

  if (loading && !lastUpdate) {
    return <LoadingPlane text="Chargement..." size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <Check className="w-5 h-5" />
          {successMessage}
          <button onClick={() => setSuccessMessage(null)} className="ml-2 hover:bg-green-600 rounded p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-2 hover:bg-red-600 rounded p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-indigo-400" />
            Tableau de bord Support
          </h1>
          <p className="text-sm text-white/60">
            Bienvenue {user?.full_name} - Administration du système
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
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalPassengers}</p>
              <p className="text-sm text-white/60">Passagers</p>
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
              <p className="text-sm text-white/60">Bagages</p>
            </div>
          </div>
        </div>

        <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
              <p className="text-sm text-white/60">Utilisateurs</p>
            </div>
          </div>
        </div>

        <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 rounded-lg">
              <Building2 className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalAirlines}</p>
              <p className="text-sm text-white/60">Compagnies</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-500/10 backdrop-blur border border-amber-500/30 rounded-xl">
          <div className="px-6 py-4 border-b border-amber-500/20">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Demandes en attente ({pendingRequests.length})
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {pendingRequests.map(request => (
              <div key={request.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Plane className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{request.name} ({request.code})</p>
                    <p className="text-white/60 text-sm">{request.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleApproveAirline(request.id)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Approuver
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Gestion des Utilisateurs
          </h3>
          <p className="text-white/60 text-sm mb-4">
            Créez et gérez les comptes superviseurs et agents litiges bagages.
          </p>
          <a
            href="/users"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors"
          >
            Gérer les utilisateurs
          </a>
        </div>

        <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            Gestion des Compagnies
          </h3>
          <p className="text-white/60 text-sm mb-4">
            Créez et gérez les compagnies aériennes partenaires.
          </p>
          <a
            href="/airlines"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors"
          >
            Gérer les compagnies
          </a>
        </div>
      </div>
    </div>
  );
}
