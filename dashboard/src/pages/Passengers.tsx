import { Briefcase, CheckCircle, RefreshCw, Search, User, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

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
  baggages: any[];
  boarding_status: {
    boarded: boolean;
    boarded_at: string | null;
  }[];
}

export default function Passengers() {
  const { user } = useAuth();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [flightFilter, setFlightFilter] = useState<string>('all');
  const [boardingFilter, setBoardingFilter] = useState<string>('all');

  const fetchPassengers = useCallback(async () => {
    if (!user?.airport_code) return;
    
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('bfs_token');
      const headers = { Authorization: `Bearer ${token}` };

      const response = await api.get(`/api/v1/passengers?airport=${user.airport_code}`, { headers });
      const data = response.data as { success: boolean; data: Passenger[] };
      
      if (data.success) {
        setPassengers(data.data);
      }
    } catch (err: any) {
      console.error('Erreur chargement passagers:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des passagers');
    } finally {
      setLoading(false);
    }
  }, [user?.airport_code]);

  useEffect(() => {
    fetchPassengers();
  }, [fetchPassengers]);

  // Get unique flights for filter
  const uniqueFlights = [...new Set(passengers.map(p => p.flightNumber).filter(Boolean))];

  const filteredPassengers = passengers.filter(pax => {
    const matchesSearch = 
      pax.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pax.pnr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pax.flightNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pax.seatNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFlight = flightFilter === 'all' || pax.flightNumber === flightFilter;
    
    const isBoarded = pax.boarding_status?.some(bs => bs.boarded);
    const matchesBoarding = 
      boardingFilter === 'all' ||
      (boardingFilter === 'boarded' && isBoarded) ||
      (boardingFilter === 'not_boarded' && !isBoarded);
    
    return matchesSearch && matchesFlight && matchesBoarding;
  });

  const stats = {
    total: passengers.length,
    boarded: passengers.filter(p => p.boarding_status?.some(bs => bs.boarded)).length,
    withBaggage: passengers.filter(p => p.baggageCount > 0).length,
    baggagesLinked: passengers.reduce((acc, p) => acc + (p.baggages?.length || 0), 0),
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
          <h1 className="text-2xl font-bold text-white">Passagers - {user?.airport_code}</h1>
          <p className="text-white/60 text-sm">Liste des passagers enregistrés</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-white/60">Total Passagers</p>
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
              <p className="text-2xl font-bold text-white">{stats.total - stats.boarded}</p>
              <p className="text-xs text-white/60">En attente</p>
            </div>
          </div>
        </div>

        <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Briefcase className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.baggagesLinked}</p>
              <p className="text-xs text-white/60">Bagages liés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher par nom, PNR, vol, siège..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={flightFilter}
          onChange={(e) => setFlightFilter(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Tous les vols</option>
          {uniqueFlights.map(flight => (
            <option key={flight} value={flight}>{flight}</option>
          ))}
        </select>
        <select
          value={boardingFilter}
          onChange={(e) => setBoardingFilter(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">Tous</option>
          <option value="boarded">Embarqués</option>
          <option value="not_boarded">Non embarqués</option>
        </select>
      </div>

      {/* Passengers Table */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-white/60 font-medium text-sm">Nom</th>
                <th className="text-left p-4 text-white/60 font-medium text-sm">PNR</th>
                <th className="text-left p-4 text-white/60 font-medium text-sm">Vol</th>
                <th className="text-left p-4 text-white/60 font-medium text-sm">Route</th>
                <th className="text-left p-4 text-white/60 font-medium text-sm">Siège</th>
                <th className="text-left p-4 text-white/60 font-medium text-sm">Bagages</th>
                <th className="text-left p-4 text-white/60 font-medium text-sm">Statut</th>
                <th className="text-left p-4 text-white/60 font-medium text-sm">Check-in</th>
              </tr>
            </thead>
            <tbody>
              {filteredPassengers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-white/40">
                    Aucun passager trouvé
                  </td>
                </tr>
              ) : (
                filteredPassengers.map((pax) => {
                  const isBoarded = pax.boarding_status?.some(bs => bs.boarded);
                  const boardedAt = pax.boarding_status?.find(bs => bs.boarded)?.boarded_at;
                  
                  return (
                    <tr key={pax.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4 text-white font-medium">{pax.fullName}</td>
                      <td className="p-4 text-white/80 font-mono text-sm">{pax.pnr}</td>
                      <td className="p-4 text-white/80">{pax.flightNumber || '-'}</td>
                      <td className="p-4 text-white/60 text-sm">
                        {pax.departure && pax.arrival ? `${pax.departure} → ${pax.arrival}` : '-'}
                      </td>
                      <td className="p-4 text-white/80">{pax.seatNumber || '-'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          pax.baggages?.length > 0 
                            ? 'bg-green-500/20 text-green-300' 
                            : pax.baggageCount > 0 
                              ? 'bg-orange-500/20 text-orange-300'
                              : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {pax.baggages?.length || 0}/{pax.baggageCount || 0}
                        </span>
                      </td>
                      <td className="p-4">
                        {isBoarded ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                            <CheckCircle className="w-3 h-3" />
                            Embarqué
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
                            En attente
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-white/60 text-sm">
                        {isBoarded ? formatDate(boardedAt || null) : formatDate(pax.checkedInAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="text-center text-white/40 text-sm">
        Affichage de {filteredPassengers.length} passager(s) sur {passengers.length}
      </div>
    </div>
  );
}
