import { Calendar, CheckCircle, Download, Eye, Plane, RefreshCw, Search, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { exportToExcel } from '../utils/exportExcel';

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

export default function Arrivals() {
  const { user } = useAuth();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [selectedFlight, setSelectedFlight] = useState<FlightGroup | null>(null);

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

  // Filter: Only flights ARRIVING to user's airport
  const arrivalFlights = useMemo(() => {
    return passengers.filter(p => p.arrival === user?.airport_code);
  }, [passengers, user?.airport_code]);

  const periodFilteredPassengers = useMemo(() => {
    return arrivalFlights.filter(pax => {
      const checkInDate = pax.checkedInAt;
      const boardedDate = Array.isArray(pax.boarding_status) && pax.boarding_status.find(bs => bs?.boarded)?.boarded_at;
      
      return isWithinPeriod(checkInDate, periodFilter) || isWithinPeriod(boardedDate || null, periodFilter);
    });
  }, [arrivalFlights, periodFilter, customDate]);

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
      
      if (pax.checkedInAt) {
        if (!group.lastCheckIn || new Date(pax.checkedInAt) > new Date(group.lastCheckIn)) {
          group.lastCheckIn = pax.checkedInAt;
        }
      }
    });
    
    return Array.from(groups.values()).sort((a, b) => {
      if (!a.lastCheckIn) return 1;
      if (!b.lastCheckIn) return -1;
      return new Date(b.lastCheckIn).getTime() - new Date(a.lastCheckIn).getTime();
    });
  }, [periodFilteredPassengers]);

  const filteredFlights = useMemo(() => {
    if (!searchTerm) return flightGroups;
    
    const term = searchTerm.toLowerCase();
    return flightGroups.filter(flight => 
      flight.flightNumber.toLowerCase().includes(term) ||
      flight.route.toLowerCase().includes(term)
    );
  }, [flightGroups, searchTerm]);

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

  const handleDownloadFlightReport = async (flight: FlightGroup) => {
    try {
      const flightPassengers = flight.passengers.map(p => ({
        id: p.id,
        pnr: p.pnr,
        full_name: p.fullName,
        flight_number: p.flightNumber,
        departure: p.departure,
        arrival: p.arrival,
        seat_number: p.seatNumber,
        baggage_count: p.baggageCount,
        checked_at: p.checkedInAt,
        boarding_status: p.boarding_status,
        baggages: p.baggages
      }));

      const flightBaggages = flight.passengers.reduce((acc: any[], p) => {
        if (p.baggages && Array.isArray(p.baggages)) {
          return acc.concat(p.baggages.map(b => ({
            ...b,
            passenger_id: p.id,
            passengers: {
              pnr: p.pnr,
              full_name: p.fullName
            },
            flight_number: p.flightNumber
          })));
        }
        return acc;
      }, []);

      await exportToExcel(
        {
          passengers: flightPassengers,
          baggages: flightBaggages,
          statistics: {}
        },
        user?.airport_code || 'FIH',
        new Date().toISOString().split('T')[0],
        new Date().toISOString().split('T')[0],
        flight.flightNumber,
        flight.arrival
      );
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors du téléchargement du rapport');
    }
  };

  if (loading && !error) {
    return <LoadingPlane text="Chargement des arrivées..." size="md" />;
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Vols en Arrivée - {user?.airport_code}</h1>
        <button
          onClick={fetchPassengers}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Rafraîchir
        </button>
      </div>

      {error && passengers.length === 0 && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-300/70 text-sm">Vols</p>
          <p className="text-2xl font-bold text-white">{stats.totalFlights}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-white/50 text-sm">Passagers</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-300/70 text-sm">Débarqués</p>
          <p className="text-2xl font-bold text-green-300">{stats.boarded}</p>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-yellow-300/70 text-sm">En attente</p>
          <p className="text-2xl font-bold text-yellow-300">{stats.pending}</p>
        </div>
        <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
          <p className="text-purple-300/70 text-sm">Bagages liés</p>
          <p className="text-2xl font-bold text-purple-300">{stats.baggagesLinked}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Rechercher un vol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['today', 'yesterday', 'week', 'month', 'all'] as const).map(period => (
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

      {/* Flights Table */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Plane className="w-5 h-5 text-blue-400" />
            Liste des Arrivées
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
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Débarqués</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Bagages</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white/50 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredFlights.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-white/50">
                    Aucun vol en arrivée trouvé
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
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedFlight(flight)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            Voir
                          </button>
                          <button
                            onClick={() => handleDownloadFlightReport(flight)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 transition-colors"
                            title={`Télécharger le rapport pour le vol ${flight.flightNumber}`}
                          >
                            <Download className="w-4 h-4" />
                            Télécharger
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flight Details Section */}
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

          <div className="px-6 py-3 border-b border-white/10 bg-white/5 flex gap-6 flex-wrap text-sm">
            <div>
              <span className="text-white/50">Total:</span>
              <span className="text-white ml-2 font-medium">{selectedFlight.totalPassengers}</span>
            </div>
            <div>
              <span className="text-white/50">Débarqués:</span>
              <span className="text-white ml-2 font-medium text-green-400">{selectedFlight.boardedCount}</span>
            </div>
            <div>
              <span className="text-white/50">En attente:</span>
              <span className="text-white ml-2 font-medium text-yellow-400">{selectedFlight.pendingCount}</span>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">PNR</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Siège</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Check-in</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Débarquement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Bagages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {selectedFlight.passengers.map((passenger) => (
                  <tr key={passenger.id} className="hover:bg-white/5">
                    <td className="px-6 py-3 text-white/70">{passenger.pnr}</td>
                    <td className="px-6 py-3 text-white">{passenger.fullName}</td>
                    <td className="px-6 py-3 text-white/70">{passenger.seatNumber || '-'}</td>
                    <td className="px-6 py-3 text-white/70 text-xs">{formatFullDate(passenger.checkedInAt)}</td>
                    <td className="px-6 py-3 text-white/70 text-xs">
                      {passenger.boarding_status?.[0]?.boarded
                        ? formatFullDate(passenger.boarding_status[0].boarded_at)
                        : '-'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        (passenger.baggages?.length || 0) === passenger.baggageCount
                          ? 'bg-green-500/20 text-green-300'
                          : (passenger.baggages?.length || 0) > 0
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {passenger.baggages?.length || 0}/{passenger.baggageCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
