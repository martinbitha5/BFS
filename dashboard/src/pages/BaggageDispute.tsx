import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Filter,
  Luggage,
  Package,
  RefreshCw,
  Search
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import api from '../config/api';

interface GlobalStats {
  totalBaggages: number;
  arrivedBaggages: number;
  inTransitBaggages: number;
  todayBaggages: number;
}

interface Baggage {
  id: string;
  tag_number: string;
  status: string;
  weight: number | null;
  flight_number: string | null;
  airport_code: string;
  checked_at: string | null;
  arrived_at: string | null;
  created_at: string;
  passengers?: {
    full_name: string;
    pnr: string;
    flight_number: string;
    departure: string;
    arrival: string;
  } | null;
}

interface RushBaggage {
  id: string;
  tag_number: string;
  flight_number: string;
  status: string;
  origin_airport: string;
  destination_airport: string;
  created_at: string;
  passengers?: {
    full_name: string;
    pnr: string;
  } | null;
}

type Tab = 'overview' | 'all-baggages' | 'rush' | 'disputes';
type StatusFilter = 'all' | 'in_transit' | 'arrived' | 'lost' | 'rush';

export default function BaggageDispute() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [rushBaggages, setRushBaggages] = useState<RushBaggage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [airportFilter, setAirportFilter] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError('');
      setLoading(true);

      // Récupérer toutes les données en parallèle (accès à tous les aéroports)
      const [statsRes, baggagesRes, rushRes] = await Promise.all([
        api.get('/api/v1/stats/global?airport=ALL'),
        api.get('/api/v1/baggage?airport=ALL'),
        api.get('/api/v1/rush/recent?airport=ALL')
      ]);

      setStats((statsRes.data as { data: GlobalStats }).data);
      setBaggages((baggagesRes.data as { data: Baggage[] }).data || []);
      setRushBaggages((rushRes.data as { data: RushBaggage[] }).data || []);
      
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
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filtrer les bagages
  const filteredBaggages = baggages.filter(b => {
    const matchSearch = 
      b.tag_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.passengers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.passengers?.pnr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.flight_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchAirport = !airportFilter || b.airport_code === airportFilter;
    
    return matchSearch && matchStatus && matchAirport;
  });

  // Obtenir les aéroports uniques
  const uniqueAirports = [...new Set(baggages.map(b => b.airport_code))].sort();

  // Stats par statut
  const statusCounts = {
    in_transit: baggages.filter(b => b.status === 'in_transit').length,
    arrived: baggages.filter(b => b.status === 'arrived').length,
    lost: baggages.filter(b => b.status === 'lost').length,
    rush: rushBaggages.length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'arrived': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'in_transit': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'lost': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'rush': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'arrived': return 'Arrivé';
      case 'in_transit': return 'En transit';
      case 'lost': return 'Perdu';
      case 'rush': return 'Rush';
      case 'checked': return 'Enregistré';
      default: return status;
    }
  };

  if (loading && !stats) {
    return <LoadingPlane text="Chargement des données bagages..." size="lg" />;
  }

  const tabs = [
    { id: 'overview' as Tab, label: 'Vue d\'ensemble', icon: Package },
    { id: 'all-baggages' as Tab, label: 'Tous les bagages', icon: Luggage },
    { id: 'rush' as Tab, label: 'Rush Bagages', icon: AlertTriangle, badge: rushBaggages.length },
    { id: 'disputes' as Tab, label: 'Litiges', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Luggage className="w-7 h-7 text-purple-400" />
            Gestion des Litiges Bagages
          </h1>
          <p className="text-sm text-white/60">
            Suivi et gestion de tous les bagages - Tous aéroports
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
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
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
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Package className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalBaggages}</p>
                  <p className="text-sm text-white/60">Bagages totaux</p>
                  <p className="text-xs text-blue-400">+{stats.todayBaggages} aujourd'hui</p>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.arrivedBaggages}</p>
                  <p className="text-sm text-white/60">Arrivés</p>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.inTransitBaggages}</p>
                  <p className="text-sm text-white/60">En transit</p>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{rushBaggages.length}</p>
                  <p className="text-sm text-white/60">Rush bagages</p>
                </div>
              </div>
            </div>
          </div>

          {/* Répartition par statut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Répartition par statut</h3>
              <div className="space-y-3">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <span className="text-white font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Répartition par aéroport</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {uniqueAirports.map(airport => {
                  const count = baggages.filter(b => b.airport_code === airport).length;
                  return (
                    <div key={airport} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                      <span className="text-white/70">{airport}</span>
                      <span className="text-white font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Baggages Tab */}
      {activeTab === 'all-baggages' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Rechercher par tag, PNR, nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="pl-10 pr-8 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50 appearance-none"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="in_transit">En transit</option>
                  <option value="arrived">Arrivés</option>
                  <option value="lost">Perdus</option>
                </select>
              </div>
              <select
                value={airportFilter}
                onChange={(e) => setAirportFilter(e.target.value)}
                className="px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="">Tous les aéroports</option>
                {uniqueAirports.map(airport => (
                  <option key={airport} value={airport}>{airport}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-white/60">
            {filteredBaggages.length} bagage(s) trouvé(s)
          </p>

          {/* Baggages list */}
          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/40 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Tag</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Passager</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Vol</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Aéroport</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBaggages.slice(0, 100).map((b) => (
                    <tr key={b.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-white">{b.tag_number || '-'}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-white">{b.passengers?.full_name || 'Non assigné'}</p>
                          {b.passengers?.pnr && (
                            <p className="text-xs text-white/50">{b.passengers.pnr}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/70">{b.flight_number || b.passengers?.flight_number || '-'}</td>
                      <td className="px-4 py-3 text-sm text-white/70">{b.airport_code}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(b.status)}`}>
                          {getStatusLabel(b.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/50">
                        {b.created_at ? new Date(b.created_at).toLocaleDateString('fr-FR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredBaggages.length > 100 && (
              <div className="px-4 py-3 bg-black/40 border-t border-white/10">
                <p className="text-sm text-white/50 text-center">
                  Affichage limité à 100 résultats. Utilisez les filtres pour affiner votre recherche.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rush Baggages Tab */}
      {activeTab === 'rush' && (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <p className="text-amber-300 font-medium">Rush Bagages</p>
            </div>
            <p className="text-sm text-white/60 mt-1">
              Bagages déclarés en urgence nécessitant une attention immédiate.
            </p>
          </div>

          {rushBaggages.length === 0 ? (
            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-white/70">Aucun rush bagage en cours</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rushBaggages.map((rush) => (
                <div key={rush.id} className="bg-black/30 backdrop-blur border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono font-bold text-white">{rush.tag_number}</p>
                      <p className="text-sm text-white/50">{rush.flight_number}</p>
                    </div>
                    <span className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Rush
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/50">Passager:</span>
                      <span className="text-white">{rush.passengers?.full_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Route:</span>
                      <span className="text-white">{rush.origin_airport} → {rush.destination_airport}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Déclaré le:</span>
                      <span className="text-white/70">
                        {new Date(rush.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disputes Tab */}
      {activeTab === 'disputes' && (
        <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-8 text-center">
          <FileText className="w-12 h-12 text-purple-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Module Litiges</h3>
          <p className="text-white/60">
            Le module de gestion des litiges sera disponible prochainement.
          </p>
          <p className="text-sm text-white/40 mt-2">
            Ce module permettra de créer, suivre et résoudre les réclamations des passagers concernant leurs bagages.
          </p>
        </div>
      )}
    </div>
  );
}
