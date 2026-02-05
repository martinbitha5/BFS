import { Briefcase, Calendar, CheckCircle, Eye, Luggage, Plane, RefreshCw, Search, User, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface Baggage {
  id: string;
  tag_number: string;
  status: string;
  weight: number | null;
  checked_at: string | null;
  arrived_at: string | null;
}

interface Passenger {
  id: string;
  fullName: string;
  pnr: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  seatNumber: string | null;
  baggageCount: number;
  checkedInAt: string | null;
  airportCode: string;
  baggages: Baggage[];
  boarding_status: {
    boarded: boolean;
    boarded_at: string | null;
  }[];
}

interface FlightGroup {
  flightNumber: string;
  route: string;
  departure: string;
  arrival: string;
  passengers: Passenger[];
  totalPassengers: number;
  boardedCount: number;
  pendingCount: number;
  totalBaggages: number;
  linkedBaggages: number;
  lastCheckIn: string | null;
}

type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';

export default function Passengers() {
  const { user } = useAuth();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Selected flight state
  const [selectedFlight, setSelectedFlight] = useState<FlightGroup | null>(null);
  // Selected passenger for detail modal
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);

  const fetchPassengers = useCallback(async () => {
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
        'Content-Type': 'application/json'
      };

      const response = await api.get(`/api/v1/passengers?airport=${encodeURIComponent(user.airport_code)}`, { headers });
      const data = response.data as { success: boolean; data: Passenger[] };
      
      if (!data.success) {
        setError(`Erreur API: ${data.data ? 'pas de succès' : 'réponse invalide'}`);
        setPassengers([]);
      } else if (data.data && Array.isArray(data.data)) {
        setPassengers(data.data);
      } else {
        setError('Format de réponse invalide - expected array');
        setPassengers([]);
      }
    } catch (err: any) {
      console.error('Erreur chargement passagers:', err);
      const errorMessage = err.response?.data?.error || 
                          err.message || 
                          'Erreur lors du chargement des passagers';
      setError(errorMessage);
      setPassengers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.airport_code]);

  useEffect(() => {
    fetchPassengers();
  }, [user?.airport_code]);

  // Date filtering helper
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
    if (period === 'all') return true;
    if (!dateStr) return false;
    
    const range = getDateRange(period);
    if (!range) return true;
    
    const date = new Date(dateStr);
    return date >= range.start && date < range.end;
  };

  // Filter passengers by period
  const periodFilteredPassengers = useMemo(() => {
    return passengers.filter(pax => {
      const checkInDate = pax.checkedInAt;
      const boardedDate = Array.isArray(pax.boarding_status) && pax.boarding_status.find(bs => bs?.boarded)?.boarded_at;
      
      return isWithinPeriod(checkInDate, periodFilter) || isWithinPeriod(boardedDate || null, periodFilter);
    });
  }, [passengers, periodFilter, customDate]);

  // Group passengers by flight
  const flightGroups = useMemo((): FlightGroup[] => {
    const groups: Map<string, FlightGroup> = new Map();
    
    periodFilteredPassengers.forEach(pax => {
      const flightNumber = pax.flightNumber || 'UNKNOWN';
      
      if (!groups.has(flightNumber)) {
        groups.set(flightNumber, {
          flightNumber,
          route: `${pax.departure || '?'} → ${pax.arrival || '?'}`,
          departure: pax.departure || '?',
          arrival: pax.arrival || '?',
          passengers: [],
          totalPassengers: 0,
          boardedCount: 0,
          pendingCount: 0,
          totalBaggages: 0,
          linkedBaggages: 0,
          lastCheckIn: null,
        });
      }
      
      const group = groups.get(flightNumber)!;
      group.passengers.push(pax);
      group.totalPassengers++;
      
      const isBoarded = Array.isArray(pax.boarding_status) && pax.boarding_status.some(bs => bs?.boarded);
      if (isBoarded) {
        group.boardedCount++;
      } else {
        group.pendingCount++;
      }
      
      group.totalBaggages += pax.baggageCount || 0;
      group.linkedBaggages += pax.baggages?.length || 0;
      
      // Track last check-in
      if (pax.checkedInAt) {
        if (!group.lastCheckIn || new Date(pax.checkedInAt) > new Date(group.lastCheckIn)) {
          group.lastCheckIn = pax.checkedInAt;
        }
      }
    });
    
    // Convert to array and sort by last check-in (most recent first)
    return Array.from(groups.values()).sort((a, b) => {
      if (!a.lastCheckIn) return 1;
      if (!b.lastCheckIn) return -1;
      return new Date(b.lastCheckIn).getTime() - new Date(a.lastCheckIn).getTime();
    });
  }, [periodFilteredPassengers]);

  // Filter flights by search term
  const filteredFlights = useMemo(() => {
    if (!searchTerm) return flightGroups;
    
    const term = searchTerm.toLowerCase();
    return flightGroups.filter(flight => 
      flight.flightNumber.toLowerCase().includes(term) ||
      flight.route.toLowerCase().includes(term) ||
      flight.passengers.some(p => 
        p.fullName?.toLowerCase().includes(term) ||
        p.pnr?.toLowerCase().includes(term)
      )
    );
  }, [flightGroups, searchTerm]);

  // Stats based on period filtered passengers
  const stats = useMemo(() => ({
    totalFlights: flightGroups.length,
    total: periodFilteredPassengers.length,
    boarded: periodFilteredPassengers.filter(p => Array.isArray(p.boarding_status) && p.boarding_status.some(bs => bs?.boarded)).length,
    pending: periodFilteredPassengers.filter(p => !Array.isArray(p.boarding_status) || !p.boarding_status.some(bs => bs?.boarded)).length,
    baggagesLinked: periodFilteredPassengers.reduce((acc, p) => acc + (p.baggages?.length || 0), 0),
  }), [periodFilteredPassengers, flightGroups]);

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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFullDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBaggageStatusColor = (status: string) => {
    switch (status) {
      case 'arrived': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'in_transit': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'checked': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'lost': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getBaggageStatusLabel = (status: string) => {
    switch (status) {
      case 'arrived': return 'Arrivé';
      case 'in_transit': return 'En transit';
      case 'checked': return 'Enregistré';
      case 'lost': return 'Perdu';
      default: return status;
    }
  };

  if (loading && !error) {
    return <LoadingPlane text="Chargement des vols..." size="md" />;
  }

  if (error && passengers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Passagers - {user?.airport_code}</h1>
          <button
            onClick={fetchPassengers}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 text-red-300">
          <p className="font-medium mb-2">Erreur de chargement</p>
          <p className="text-sm mb-4">{error}</p>
          <p className="text-xs text-red-400">Vérifiez votre connexion ou réessayez dans quelques instants.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Plane className="w-7 h-7 text-blue-400" />
            Passagers - {user?.airport_code}
          </h1>
          <p className="text-white/60 text-sm">Gestion des passagers par vol</p>
        </div>
        <button
          onClick={fetchPassengers}
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

      {/* Period Filter + Stats Cards */}
      <div className="space-y-4">
        {/* Period Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-white/60">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Période:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['today', 'yesterday', 'week', 'month', 'all'] as PeriodFilter[]).map((period) => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  periodFilter === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {getPeriodLabel(period)}
              </button>
            ))}
            <button
              onClick={() => setPeriodFilter('custom')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                periodFilter === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Personnalisé
            </button>
          </div>
          {periodFilter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1.5 text-sm bg-slate-800 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Plane className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalFlights}</p>
                <p className="text-xs text-white/60">Vols</p>
              </div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-white/60">Passagers</p>
              </div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.boarded}</p>
                <p className="text-xs text-white/60">Embarqués</p>
              </div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <User className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
                <p className="text-xs text-white/60">En attente</p>
              </div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Briefcase className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.baggagesLinked}</p>
                <p className="text-xs text-white/60">Bagages liés</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text"
          placeholder="Rechercher par vol, route, nom de passager, PNR..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Flights Table */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Plane className="w-5 h-5 text-blue-400" />
            Liste des Vols
            <span className="text-sm text-white/50 font-normal ml-2">
              ({filteredFlights.length} vol{filteredFlights.length > 1 ? 's' : ''})
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Vol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Passagers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Embarqués</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Bagages</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white/50 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredFlights.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-white/50">
                    {periodFilter === 'today' 
                      ? "Aucun vol enregistré aujourd'hui" 
                      : periodFilter === 'yesterday'
                        ? "Aucun vol enregistré hier"
                        : periodFilter === 'custom'
                          ? `Aucun vol pour le ${new Date(customDate).toLocaleDateString('fr-FR')}`
                          : "Aucun vol trouvé pour cette période"
                    }
                  </td>
                </tr>
              ) : (
                filteredFlights.map((flight) => {
                  const allBoarded = flight.boardedCount === flight.totalPassengers && flight.totalPassengers > 0;
                  const boardingRate = flight.totalPassengers > 0 
                    ? Math.round((flight.boardedCount / flight.totalPassengers) * 100) 
                    : 0;
                  
                  return (
                    <tr key={flight.flightNumber} className="hover:bg-white/5">
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{flight.flightNumber}</p>
                      </td>
                      <td className="px-6 py-4 text-white/70">
                        {flight.route}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{flight.totalPassengers}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white">{flight.boardedCount}</span>
                        <span className="text-white/50 text-sm ml-1">({boardingRate}%)</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          flight.linkedBaggages === flight.totalBaggages && flight.totalBaggages > 0
                            ? 'bg-green-500/20 text-green-300'
                            : flight.linkedBaggages > 0
                              ? 'bg-orange-500/20 text-orange-300'
                              : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {flight.linkedBaggages}/{flight.totalBaggages}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {allBoarded ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                            <CheckCircle className="w-3 h-3" />
                            Complet
                          </span>
                        ) : flight.boardedCount > 0 ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                            En cours
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
                            En attente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedFlight(flight)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Voir
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flight Details Section (Passengers List) */}
      {selectedFlight && (
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Passagers du vol {selectedFlight.flightNumber}
              <span className="text-sm text-white/50 font-normal ml-2">
                ({selectedFlight.route})
              </span>
            </h2>
            <button
              onClick={() => setSelectedFlight(null)}
              className="text-white/50 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Flight Summary */}
          <div className="px-6 py-3 border-b border-white/10 bg-white/5 flex gap-6 flex-wrap text-sm">
            <div>
              <span className="text-white/50">Total:</span>
              <span className="text-white ml-2 font-medium">{selectedFlight.totalPassengers}</span>
            </div>
            <div>
              <span className="text-white/50">Embarqués:</span>
              <span className="text-green-400 ml-2 font-medium">{selectedFlight.boardedCount}</span>
            </div>
            <div>
              <span className="text-white/50">En attente:</span>
              <span className="text-yellow-400 ml-2 font-medium">{selectedFlight.pendingCount}</span>
            </div>
            <div>
              <span className="text-white/50">Bagages:</span>
              <span className="text-white ml-2 font-medium">{selectedFlight.linkedBaggages}/{selectedFlight.totalBaggages}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2 text-left text-xs text-white/50">Nom</th>
                  <th className="px-4 py-2 text-left text-xs text-white/50">PNR</th>
                  <th className="px-4 py-2 text-left text-xs text-white/50">Siège</th>
                  <th className="px-4 py-2 text-left text-xs text-white/50">Bagages</th>
                  <th className="px-4 py-2 text-left text-xs text-white/50">Statut</th>
                  <th className="px-4 py-2 text-left text-xs text-white/50">Check-in</th>
                  <th className="px-4 py-2 text-right text-xs text-white/50">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {selectedFlight.passengers.map((pax) => {
                  const isBoarded = Array.isArray(pax.boarding_status) && pax.boarding_status.some(bs => bs?.boarded);
                  const boardedAt = Array.isArray(pax.boarding_status) && pax.boarding_status.find(bs => bs?.boarded)?.boarded_at;
                  
                  return (
                    <tr key={pax.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-white">{pax.fullName || 'N/A'}</td>
                      <td className="px-4 py-3 font-mono text-white/60">{pax.pnr || '-'}</td>
                      <td className="px-4 py-3 text-white/80">{pax.seatNumber || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          Array.isArray(pax.baggages) && pax.baggages.length > 0
                            ? 'bg-green-500/20 text-green-300' 
                            : (pax.baggageCount || 0) > 0 
                              ? 'bg-orange-500/20 text-orange-300'
                              : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {(Array.isArray(pax.baggages) ? pax.baggages.length : 0)}/{pax.baggageCount || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isBoarded ? (
                          <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                            <CheckCircle className="w-3 h-3" />
                            Embarqué
                          </span>
                        ) : (
                          <span className="text-yellow-400 text-xs">En attente</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/60 text-xs">
                        {isBoarded ? formatDate(boardedAt || null) : formatDate(pax.checkedInAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedPassenger(pax)}
                          className="px-2 py-1 text-xs bg-white/10 text-white/70 rounded hover:bg-white/20 transition-colors"
                        >
                          Voir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Détails Passager */}
      {selectedPassenger && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <User className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedPassenger.fullName}</h3>
                  <p className="text-sm text-white/50">PNR: {selectedPassenger.pnr}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPassenger(null)} 
                className="text-white/60 hover:text-white p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-6 space-y-6">
              {/* Informations Vol */}
              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <h4 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                  <Plane className="w-4 h-4" />
                  Informations Vol
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-white/40">Numéro de vol</p>
                    <p className="text-white font-medium">{selectedPassenger.flightNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Route</p>
                    <p className="text-white font-medium">
                      {selectedPassenger.departure} → {selectedPassenger.arrival}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Siège</p>
                    <p className="text-white font-medium">{selectedPassenger.seatNumber || 'Non assigné'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Aéroport</p>
                    <p className="text-white font-medium">{selectedPassenger.airportCode}</p>
                  </div>
                </div>
              </div>

              {/* Statut Embarquement */}
              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <h4 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Statut Embarquement
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-white/40">Check-in</p>
                    <p className="text-white">{formatFullDate(selectedPassenger.checkedInAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Embarquement</p>
                    {Array.isArray(selectedPassenger.boarding_status) && selectedPassenger.boarding_status.some(bs => bs?.boarded) ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 mb-1">
                          <CheckCircle className="w-3 h-3" />
                          Embarqué
                        </span>
                        <p className="text-white/60 text-sm">
                          {formatFullDate(Array.isArray(selectedPassenger.boarding_status) && selectedPassenger.boarding_status.find(bs => bs?.boarded)?.boarded_at || null)}
                        </p>
                      </div>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
                        En attente
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bagages */}
              <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                <h4 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                  <Luggage className="w-4 h-4" />
                  Bagages ({selectedPassenger.baggages?.length || 0}/{selectedPassenger.baggageCount || 0})
                </h4>
                
                {selectedPassenger.baggages && selectedPassenger.baggages.length > 0 ? (
                  <div className="space-y-3">
                    {selectedPassenger.baggages.map((bag, index) => (
                      <div 
                        key={bag.id || index} 
                        className="bg-black/20 rounded-lg p-3 border border-white/5"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-white font-medium">
                            {bag.tag_number || `Bagage ${index + 1}`}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded border ${getBaggageStatusColor(bag.status)}`}>
                            {getBaggageStatusLabel(bag.status)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-white/40">Poids</p>
                            <p className="text-white/70">{bag.weight ? `${bag.weight} kg` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/40">Enregistré</p>
                            <p className="text-white/70">{formatDate(bag.checked_at)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/40">Arrivé</p>
                            <p className="text-white/70">{formatDate(bag.arrived_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedPassenger.baggageCount > 0 ? (
                  <div className="text-center py-4">
                    <p className="text-orange-300">
                      {selectedPassenger.baggageCount} bagage(s) déclaré(s) mais non encore lié(s)
                    </p>
                    <p className="text-white/40 text-sm mt-1">
                      Les bagages seront liés après le scan des étiquettes
                    </p>
                  </div>
                ) : (
                  <p className="text-white/40 text-center py-4">Aucun bagage enregistré</p>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 border-t border-white/10 bg-black/20">
              <button
                onClick={() => setSelectedPassenger(null)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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
