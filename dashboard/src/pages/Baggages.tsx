import { AlertTriangle, Briefcase, Package, RefreshCw, Search, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface Baggage {
  id: string;
  tagNumber: string;
  passengerId: string | null;
  weight: number | null;
  status: string;
  flightNumber: string | null;
  airportCode: string;
  currentLocation: string | null;
  checkedAt: string | null;
  arrivedAt: string | null;
  deliveredAt: string | null;
  lastScannedAt: string | null;
  lastScannedBy: string | null;
  passengers: {
    id: string;
    fullName: string;
    pnr: string;
    flightNumber: string;
    departure: string;
    arrival: string;
  } | null;
}

interface RushBaggage {
  id: string;
  tag_number: string;
  status: string;
  flight_number: string | null;
  current_location: string | null;
  last_scanned_at: string | null;
  baggageType: 'national' | 'international';
  passengers?: {
    full_name: string;
    pnr: string;
    flight_number: string;
    departure: string;
    arrival: string;
  };
}

interface RushStats {
  totalRush: number;
  nationalRush: number;
  internationalRush: number;
  rushToday: number;
}

export default function Baggages() {
  const { user } = useAuth();
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [rushBaggages, setRushBaggages] = useState<RushBaggage[]>([]);
  const [rushStats, setRushStats] = useState<RushStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'rush'>('all');

  const fetchBaggages = useCallback(async () => {
    if (!user?.airport_code) return;
    
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('bfs_token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all baggages
      const baggagesRes = await api.get(`/api/v1/baggage?airport=${user.airport_code}`, { headers });
      const baggagesData = baggagesRes.data as { success: boolean; data: Baggage[] };
      if (baggagesData.success) {
        setBaggages(baggagesData.data);
      }

      // Fetch rush baggages
      const rushRes = await api.get(`/api/v1/rush/baggages?airport=${user.airport_code}`, { headers });
      const rushData = rushRes.data as { success: boolean; data: RushBaggage[] };
      if (rushData.success) {
        setRushBaggages(rushData.data);
      }

      // Fetch rush stats
      const statsRes = await api.get(`/api/v1/rush/statistics/${user.airport_code}`, { headers });
      const statsData = statsRes.data as { success: boolean; data: RushStats };
      if (statsData.success) {
        setRushStats(statsData.data);
      }

    } catch (err: any) {
      console.error('Erreur chargement bagages:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des bagages');
    } finally {
      setLoading(false);
    }
  }, [user?.airport_code]);

  useEffect(() => {
    fetchBaggages();
  }, [fetchBaggages]);

  const filteredBaggages = baggages.filter(bag => {
    const matchesSearch = 
      bag.tagNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bag.passengers?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bag.passengers?.pnr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bag.flightNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || bag.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      'checked_in': { color: 'bg-blue-500/20 text-blue-300', label: 'Enregistré' },
      'loaded': { color: 'bg-green-500/20 text-green-300', label: 'Chargé' },
      'in_transit': { color: 'bg-yellow-500/20 text-yellow-300', label: 'En transit' },
      'arrived': { color: 'bg-purple-500/20 text-purple-300', label: 'Arrivé' },
      'delivered': { color: 'bg-emerald-500/20 text-emerald-300', label: 'Livré' },
      'rush': { color: 'bg-red-500/20 text-red-300', label: 'RUSH' },
      'missing': { color: 'bg-orange-500/20 text-orange-300', label: 'Manquant' },
    };
    const config = statusConfig[status] || { color: 'bg-gray-500/20 text-gray-300', label: status };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>{config.label}</span>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Bagages - {user?.airport_code}</h1>
          <p className="text-white/60 text-sm">Suivi des bagages et Rush</p>
        </div>
        <button
          onClick={fetchBaggages}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{baggages.length}</p>
              <p className="text-xs text-white/60">Total Bagages</p>
            </div>
          </div>
        </div>

        <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Zap className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{rushStats?.totalRush || 0}</p>
              <p className="text-xs text-white/60">Rush Total</p>
            </div>
          </div>
        </div>

        <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{rushStats?.rushToday || 0}</p>
              <p className="text-xs text-white/60">Rush Aujourd'hui</p>
            </div>
          </div>
        </div>

        <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Package className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {baggages.filter(b => b.status === 'delivered').length}
              </p>
              <p className="text-xs text-white/60">Livrés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-white/10 text-white'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Briefcase className="w-4 h-4 inline mr-2" />
          Tous les bagages ({baggages.length})
        </button>
        <button
          onClick={() => setActiveTab('rush')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'rush'
              ? 'bg-red-500/20 text-red-300'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 inline mr-2" />
          Rush ({rushBaggages.length})
        </button>
      </div>

      {activeTab === 'all' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Rechercher par tag, passager, PNR, vol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="checked_in">Enregistré</option>
              <option value="loaded">Chargé</option>
              <option value="in_transit">En transit</option>
              <option value="arrived">Arrivé</option>
              <option value="delivered">Livré</option>
              <option value="rush">Rush</option>
              <option value="missing">Manquant</option>
            </select>
          </div>

          {/* Baggages Table */}
          <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-medium text-sm">Tag</th>
                    <th className="text-left p-4 text-white/60 font-medium text-sm">Passager</th>
                    <th className="text-left p-4 text-white/60 font-medium text-sm">PNR</th>
                    <th className="text-left p-4 text-white/60 font-medium text-sm">Vol</th>
                    <th className="text-left p-4 text-white/60 font-medium text-sm">Statut</th>
                    <th className="text-left p-4 text-white/60 font-medium text-sm">Localisation</th>
                    <th className="text-left p-4 text-white/60 font-medium text-sm">Dernier scan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBaggages.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-white/40">
                        Aucun bagage trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredBaggages.map((bag) => (
                      <tr key={bag.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-4 text-white font-mono text-sm">{bag.tagNumber}</td>
                        <td className="p-4 text-white">{bag.passengers?.fullName || '-'}</td>
                        <td className="p-4 text-white/80 font-mono text-sm">{bag.passengers?.pnr || '-'}</td>
                        <td className="p-4 text-white/80">{bag.flightNumber || bag.passengers?.flightNumber || '-'}</td>
                        <td className="p-4">{getStatusBadge(bag.status)}</td>
                        <td className="p-4 text-white/80">{bag.currentLocation || '-'}</td>
                        <td className="p-4 text-white/60 text-sm">{formatDate(bag.lastScannedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'rush' && (
        <div className="space-y-4">
          {/* Rush Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-sm text-red-300/80">Nationaux</p>
              <p className="text-3xl font-bold text-red-300">{rushStats?.nationalRush || 0}</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <p className="text-sm text-purple-300/80">Internationaux</p>
              <p className="text-3xl font-bold text-purple-300">{rushStats?.internationalRush || 0}</p>
            </div>
          </div>

          {/* Rush Baggages Table */}
          <div className="bg-black/30 backdrop-blur-md rounded-xl border border-red-500/30 overflow-hidden">
            <div className="p-4 border-b border-red-500/30 bg-red-500/10">
              <h3 className="text-lg font-semibold text-red-300 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Bagages en Rush
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-medium text-sm">Type</th>
                    <th className="text-left p-4 text-white/60 font-medium text-sm">Tag</th>
                    <th className="text-left p-4 text-white/60 font-medium text-sm">Passager</th>
                    <th className="text-left p-4 text-white/60 font-medium text-sm">Vol</th>
                    <th className="text-left p-4 text-white/60 font-medium text-sm">Localisation</th>
                    <th className="text-left p-4 text-white/60 font-medium text-sm">Dernier scan</th>
                  </tr>
                </thead>
                <tbody>
                  {rushBaggages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-white/40">
                        Aucun bagage en rush
                      </td>
                    </tr>
                  ) : (
                    rushBaggages.map((bag) => (
                      <tr key={bag.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            bag.baggageType === 'national' 
                              ? 'bg-blue-500/20 text-blue-300' 
                              : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {bag.baggageType === 'national' ? 'National' : 'International'}
                          </span>
                        </td>
                        <td className="p-4 text-white font-mono text-sm">{bag.tag_number}</td>
                        <td className="p-4 text-white">{bag.passengers?.full_name || '-'}</td>
                        <td className="p-4 text-white/80">{bag.flight_number || bag.passengers?.flight_number || '-'}</td>
                        <td className="p-4 text-white/80">{bag.current_location || '-'}</td>
                        <td className="p-4 text-white/60 text-sm">{formatDate(bag.last_scanned_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
