import { Package, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';

interface Baggage {
  id: string;
  tag_number: string;
  flight_number: string;
  passenger_id: string;
  passenger_name: string;
  pnr: string;
  status: string;
  weight: number | null;
  checked_at: string | null;
  arrived_at: string | null;
  delivered_at: string | null;
  current_location: string | null;
  passengers?: {
    pnr: string;
    full_name: string;
  };
}

type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';

export default function Deliveries() {
  const { user } = useAuth();
  const { lastUpdate } = useRealtime();
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchBaggages = useCallback(async () => {
    if (!user?.airport_code) {
      setError('Code aéroport non disponible');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('bfs_token');
      if (!token) {
        setError('Token d\'authentification manquant');
        setLoading(false);
        return;
      }

      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-api-key': 'bfs-api-key-secure-2025'
      };

      // Laisse l'intercepteur ajouter les paramètres automatiquement
      const response = await api.get('/api/v1/passengers?filter=arrival', { headers });
      const data = response.data as { success: boolean; data: any[] };
      
      if (!data.success) {
        setError(`Erreur API: ${data.data ? 'pas de succès' : 'réponse invalide'}`);
        setBaggages([]);
      } else if (data.data && Array.isArray(data.data)) {
        console.log(`[Deliveries] Passagers récupérés: ${data.data.length} (compagnie: ${user.airline_code || 'Toutes'})`);
        
        // Extract all baggages from passengers
        const allBaggages: Baggage[] = [];
        data.data.forEach((passenger: any) => {
          if (passenger.baggages && Array.isArray(passenger.baggages)) {
            passenger.baggages.forEach((baggage: any) => {
              allBaggages.push({
                id: baggage.id,
                tag_number: baggage.tag_number,
                flight_number: passenger.flightNumber,
                passenger_id: passenger.id,
                passenger_name: passenger.fullName,
                pnr: passenger.pnr,
                status: baggage.status,
                weight: baggage.weight,
                checked_at: baggage.checked_at,
                arrived_at: baggage.arrived_at,
                delivered_at: baggage.delivered_at,
                current_location: baggage.current_location,
              });
            });
          }
        });
        
        // Filter only delivered baggages
        const deliveredBaggages = allBaggages.filter(b => b.status === 'delivered');
        console.log(`[Deliveries] Bagages livrés: ${deliveredBaggages.length}`);
        setBaggages(deliveredBaggages);
      } else {
        setError('Format de réponse invalide - expected array');
        setBaggages([]);
      }
    } catch (err: any) {
      console.error('Erreur chargement bagages:', err);
      const errorMessage = err.response?.data?.error || 
                          err.message || 
                          'Erreur lors du chargement des bagages';
      setError(errorMessage);
      setBaggages([]);
    } finally {
      setLoading(false);
    }
  }, [user?.airport_code, user?.airline_code]);

  useEffect(() => {
    fetchBaggages();
  }, [user?.airport_code, user?.airline_code]);

  useEffect(() => {
    if (lastUpdate) fetchBaggages();
  }, [lastUpdate, fetchBaggages]);

  const getDateRange = (period: PeriodFilter): { start: Date; end: Date } | null => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    switch (period) {
      case 'today':
        return { start: today, end: tomorrow };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday, end: today };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { start: weekAgo, end: tomorrow };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { start: monthAgo, end: tomorrow };
      case 'custom':
        if (customDate) {
          const selectedDate = new Date(customDate);
          const nextDay = new Date(selectedDate);
          nextDay.setDate(nextDay.getDate() + 1);
          return { start: selectedDate, end: nextDay };
        }
        return null;
      case 'all':
        return null;
    }
  };

  const isWithinPeriod = (dateStr: string | null, period: PeriodFilter): boolean => {
    if (!dateStr) return false;
    const range = getDateRange(period);
    if (!range) return true;
    
    const date = new Date(dateStr);
    return date >= range.start && date < range.end;
  };

  const periodFilteredBaggages = useMemo(() => {
    return baggages.filter(b => isWithinPeriod(b.delivered_at, periodFilter));
  }, [baggages, periodFilter, customDate]);

  const filteredBaggages = useMemo(() => {
    if (!searchTerm) return periodFilteredBaggages;
    
    const term = searchTerm.toLowerCase();
    return periodFilteredBaggages.filter(b => 
      b.tag_number.toLowerCase().includes(term) ||
      b.passenger_name?.toLowerCase().includes(term) ||
      b.pnr?.toLowerCase().includes(term) ||
      b.flight_number?.toLowerCase().includes(term)
    );
  }, [periodFilteredBaggages, searchTerm]);

  const stats = useMemo(() => ({
    totalDelivered: periodFilteredBaggages.length,
    totalWeight: periodFilteredBaggages.reduce((acc, b) => acc + (b.weight || 0), 0),
    byFlight: periodFilteredBaggages.reduce((acc: any, b) => {
      const flight = b.flight_number || 'UNKNOWN';
      acc[flight] = (acc[flight] || 0) + 1;
      return acc;
    }, {}),
  }), [periodFilteredBaggages]);

  const getPeriodLabel = (period: PeriodFilter): string => {
    switch (period) {
      case 'today': return "Aujourd'hui";
      case 'yesterday': return 'Hier';
      case 'week': return 'Cette semaine';
      case 'month': return 'Ce mois';
      case 'custom': return 'Personnalisé';
      case 'all': return 'Tout';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !error) {
    return <LoadingPlane text="Chargement des livraisons..." size="md" />;
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Livraisons de Bagages - {user?.airport_code}</h1>
        <button
          onClick={fetchBaggages}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Rafraîchir
        </button>
      </div>

      {error && baggages.length === 0 && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-300/70 text-sm">Bagages Livrés</p>
          <p className="text-2xl font-bold text-green-300">{stats.totalDelivered}</p>
        </div>
        <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
          <p className="text-purple-300/70 text-sm">Poids Total (kg)</p>
          <p className="text-2xl font-bold text-purple-300">{stats.totalWeight.toFixed(2)}</p>
        </div>
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-300/70 text-sm">Vols Couverts</p>
          <p className="text-2xl font-bold text-blue-300">{Object.keys(stats.byFlight).length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-white/50 text-sm">Taux de Livraison</p>
          <p className="text-2xl font-bold text-white">100%</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Rechercher par tag, passager, PNR ou vol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['today', 'yesterday', 'week', 'month', 'custom', 'all'] as const).map(period => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  periodFilter === period
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {getPeriodLabel(period)}
              </button>
            ))}
            {periodFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-3 py-1.5 rounded text-sm bg-white/5 border border-white/10 text-white"
              />
            )}
          </div>
        </div>
      </div>

      {/* Baggages Table */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-green-400" />
            Bagages Livrés
            <span className="text-sm text-white/50 font-normal ml-2">
              ({filteredBaggages.length} bagage{filteredBaggages.length > 1 ? 's' : ''})
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Tag</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">PNR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Passager</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Vol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Poids (kg)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Arrivé le</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Livré le</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Localisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredBaggages.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-white/50">
                    Aucun bagage livré trouvé pour cette période
                  </td>
                </tr>
              ) : (
                filteredBaggages.map((baggage) => {
                  const passengerName = baggage.passengers?.full_name || baggage.passenger_name || '-';
                  const passengerPnr = baggage.passengers?.pnr || baggage.pnr || '-';
                  
                  return (
                    <tr key={baggage.id} className="hover:bg-white/5">
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{baggage.tag_number}</p>
                      </td>
                      <td className="px-6 py-4 text-white/70">
                        {passengerPnr}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white">{passengerName}</p>
                      </td>
                      <td className="px-6 py-4 text-white/70">
                        {baggage.flight_number || '-'}
                      </td>
                      <td className="px-6 py-4 text-white/70">
                        {baggage.weight ? `${baggage.weight.toFixed(1)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-white/70 text-sm">
                        {formatDate(baggage.arrived_at)}
                      </td>
                      <td className="px-6 py-4 text-green-300 font-medium text-sm">
                        {formatDate(baggage.delivered_at)}
                      </td>
                      <td className="px-6 py-4 text-white/70">
                        {baggage.current_location || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary by Flight */}
      {Object.keys(stats.byFlight).length > 0 && (
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Résumé par Vol</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {Object.entries(stats.byFlight).map(([flight, count]: [string, any]) => (
              <div key={flight} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-white/50 text-sm">Vol</p>
                <p className="text-xl font-bold text-white">{flight}</p>
                <p className="text-green-300 mt-2">{count} bagage{count > 1 ? 's' : ''} livré{count > 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
