import { CheckCircle, Clock, Download, Luggage, Package, Plane, RefreshCw, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { exportToExcel } from '../utils/exportExcel';

interface AirportStats {
  totalPassengers: number;
  totalBaggages: number;
  boardedPassengers: number;
  notBoardedPassengers: number;
  todayPassengers: number;
  todayBaggages: number;
  flightsCount: number;
}

interface FlightStats {
  id: string;
  flightNumber: string;
  airline: string;
  departure: string;
  arrival: string;
  scheduledTime: string;
  status: string;
  stats: {
    totalPassengers: number;
    boardedPassengers: number;
    totalBaggages: number;
    boardingProgress: number;
  };
}

interface RecentPassenger {
  id: string;
  pnr: string;
  fullName: string;
  flightNumber: string;
  route: string;
  baggageCount: number;
  checkedInAt: string;
}

interface RecentBaggage {
  id: string;
  tagNumber: string;
  status: string;
  passenger: {
    fullName: string;
    flightNumber: string;
  } | null;
}

interface ArrivedBaggage {
  id: string;
  tagNumber: string;
  status: string;
  flightNumber: string | null;
  arrivedAt: string | null;
  passengers: {
    fullName: string;
    pnr: string;
    flightNumber: string;
  } | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AirportStats | null>(null);
  const [flights, setFlights] = useState<FlightStats[]>([]);
  const [recentPassengers, setRecentPassengers] = useState<RecentPassenger[]>([]);
  const [recentBaggages, setRecentBaggages] = useState<RecentBaggage[]>([]);
  const [arrivedBaggages, setArrivedBaggages] = useState<ArrivedBaggage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    if (!user?.airport_code) return;

    try {
      setError('');

      const [statsRes, flightsRes, recentRes, arrivedRes] = await Promise.all([
        api.get(`/api/v1/stats/airport/${user.airport_code}`),
        api.get(`/api/v1/stats/flights/${user.airport_code}`),
        api.get(`/api/v1/stats/recent/${user.airport_code}?limit=5`),
        api.get(`/api/v1/baggage?status=arrived&airport=${user.airport_code}`)
      ]);

      setStats((statsRes.data as { data: AirportStats }).data);
      setFlights((flightsRes.data as { data: { flights: FlightStats[] } }).data.flights || []);
      
      const recentData = (recentRes.data as { data: { recentPassengers: RecentPassenger[]; recentBaggages: RecentBaggage[] } }).data;
      setRecentPassengers(recentData.recentPassengers || []);
      setRecentBaggages(recentData.recentBaggages || []);
      
      const arrivedData = (arrivedRes.data as { data: ArrivedBaggage[] }).data || [];
      setArrivedBaggages(arrivedData.slice(0, 10)); // Limiter à 10 bagages arrivés
      
      setLastUpdate(new Date());
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [user?.airport_code]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleExportData = async () => {
    if (!user?.airport_code || !stats) return;

    setExporting(true);
    try {
      // Récupérer les passagers et bagages avec les paramètres actuels
      const [passengersRes, baggagesRes] = await Promise.all([
        api.get(`/api/v1/passengers?airport=${user.airport_code}`),
        api.get(`/api/v1/baggage?airport=${user.airport_code}`)
      ]);

      // Extraire les données de la réponse
      const passengersData = passengersRes.data as any;
      const baggagesData = baggagesRes.data as any;

      // Traiter les passagers - supporter différents formats de réponse
      let allPassengers: any[] = [];
      if (Array.isArray(passengersData)) {
        allPassengers = passengersData;
      } else if (passengersData?.data && Array.isArray(passengersData.data)) {
        allPassengers = passengersData.data;
      } else if (passengersData?.results && Array.isArray(passengersData.results)) {
        allPassengers = passengersData.results;
      }

      // Traiter les bagages - supporter différents formats de réponse
      let allBaggages: any[] = [];
      if (Array.isArray(baggagesData)) {
        allBaggages = baggagesData;
      } else if (baggagesData?.data && Array.isArray(baggagesData.data)) {
        allBaggages = baggagesData.data;
      } else if (baggagesData?.results && Array.isArray(baggagesData.results)) {
        allBaggages = baggagesData.results;
      }

      // Formater les passagers selon ce qui s'affiche dans le dashboard
      const formattedPassengers = allPassengers.map((p: any) => ({
        pnr: p.pnr || p.PNR || '',
        id: p.id || p.passenger_id || '',
        full_name: p.full_name || p.fullName || p.name || '',
        flight_number: p.flight_number || p.flightNumber || p.flight || '',
        departure: p.departure || p.origin || '',
        arrival: p.arrival || p.destination || '',
        seat_number: p.seat_number || p.seatNumber || p.seat || '-',
        checked_in_at: p.checked_in_at || p.checkedInAt || new Date().toISOString(),
        boarding_status: p.boarding_status || p.boardingStatus || [],
        baggage_count: p.baggage_count || p.baggageCount || 0
      }));

      // Formater les bagages selon ce qui s'affiche dans le dashboard
      const formattedBaggages = allBaggages.map((b: any) => ({
        tag_number: b.tag_number || b.tagNumber || b.tag || '',
        passenger_id: b.passenger_id || b.passengerId || b.passengerID || '',
        passenger_name: b.passenger_name || b.passengerName || b.full_name || '',
        flight_number: b.flight_number || b.flightNumber || b.flight || '',
        weight: b.weight || 0,
        status: b.status || 'unknown',
        checked_at: b.checked_at || b.checkedAt || b.registeredAt || new Date().toISOString(),
        arrived_at: b.arrived_at || b.arrivedAt || null,
        current_location: b.current_location || b.currentLocation || b.location || '-'
      }));

      // Préparer les données pour l'export
      const exportData = {
        passengers: formattedPassengers,
        baggages: formattedBaggages,
        statistics: stats,
        birsItems: []
      };

      // Appeler la fonction d'export avec les dates sélectionnées
      await exportToExcel(
        exportData,
        user.airport_code,
        exportStartDate,
        exportEndDate
      );

      // Afficher un message de succès
      setError('');
    } catch (err: unknown) {
      const error = err as { message?: string; response?: { data?: { error?: string } } };
      const errorMsg = error.response?.data?.error || error.message || 'Erreur lors de l\'export';
      console.error('Erreur export:', errorMsg);
      setError(errorMsg);
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'boarding': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'departed': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programmé';
      case 'boarding': return 'Embarquement';
      case 'departed': return 'Parti';
      default: return status;
    }
  };

  if (loading) {
    return <LoadingPlane text="Chargement du tableau de bord..." size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Dashboard - {user?.airport_code}
          </h1>
          <p className="text-sm text-white/60">
            Données traitées par l'application mobile
            {lastUpdate && (
              <span className="ml-2">
                • Mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <label className="text-sm text-white/70">Du:</label>
            <input
              type="date"
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
              className="px-2 py-1 bg-black/30 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-sm text-white/70">Au:</label>
            <input
              type="date"
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
              className="px-2 py-1 bg-black/30 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            onClick={handleExportData}
            disabled={exporting || stats === null}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${exporting ? 'animate-spin' : ''}`} />
            {exporting ? 'Export...' : 'Exporter'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalPassengers}</p>
                <p className="text-sm text-white/60">Passagers</p>
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
                <p className="text-sm text-white/60">Bagages</p>
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
                <p className="text-2xl font-bold text-white">
                  {flights.reduce((sum, f) => sum + f.stats.boardedPassengers, 0)}
                </p>
                <p className="text-sm text-white/60">Embarqués</p>
                <p className="text-xs text-orange-400">
                  {flights.reduce((sum, f) => sum + (f.stats.totalPassengers - f.stats.boardedPassengers), 0)} en attente
                </p>
              </div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Plane className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{flights.length}</p>
                <p className="text-sm text-white/60">Vols actifs</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vols du jour */}
      <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary-400" />
            Vols du jour
          </h2>
        </div>
        <div className="p-6">
          {flights.length === 0 ? (
            <p className="text-center text-white/50 py-8">Aucun vol programmé</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {flights.map((flight) => (
                <div
                  key={flight.id}
                  className="bg-black/20 border border-white/5 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-lg font-bold text-white">{flight.flightNumber}</span>
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded border ${getStatusColor(flight.status)}`}>
                        {getStatusLabel(flight.status)}
                      </span>
                    </div>
                    {flight.scheduledTime && (
                      <span className="text-sm text-white/60 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {flight.scheduledTime}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-white/70 mb-3">
                    {flight.departure} → {flight.arrival}
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-blue-400">{flight.stats.totalPassengers}</p>
                      <p className="text-xs text-white/50">Passagers</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-400">{flight.stats.boardedPassengers}</p>
                      <p className="text-xs text-white/50">Embarqués</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-orange-400">{flight.stats.totalBaggages}</p>
                      <p className="text-xs text-white/50">Bagages</p>
                    </div>
                  </div>

                  {flight.stats.totalPassengers > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-white/50 mb-1">
                        <span>Embarquement</span>
                        <span>{flight.stats.boardingProgress}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${flight.stats.boardingProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Données récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Passagers récents */}
        <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Passagers récents
            </h2>
          </div>
          <div className="p-4">
            {recentPassengers.length === 0 ? (
              <p className="text-center text-white/50 py-4">Aucun passager</p>
            ) : (
              <div className="space-y-2">
                {recentPassengers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                    <div>
                      <p className="font-medium text-white">{p.fullName}</p>
                      <p className="text-xs text-white/50">{p.pnr} • {p.flightNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white/70">{p.route}</p>
                      <p className="text-xs text-white/40">{p.baggageCount} bagage(s)</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bagages récents */}
        <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-green-400" />
              Bagages récents
            </h2>
          </div>
          <div className="p-4">
            {recentBaggages.length === 0 ? (
              <p className="text-center text-white/50 py-4">Aucun bagage</p>
            ) : (
              <div className="space-y-2">
                {recentBaggages.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                    <div>
                      <p className="font-mono font-medium text-white">{b.tagNumber}</p>
                      <p className="text-xs text-white/50">
                        {b.passenger?.fullName || 'Non assigné'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        b.status === 'arrived' ? 'bg-green-500/20 text-green-300' :
                        b.status === 'in_transit' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {b.status}
                      </span>
                      {b.passenger?.flightNumber && (
                        <p className="text-xs text-white/40 mt-1">{b.passenger.flightNumber}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bagages arrivés */}
      <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Luggage className="w-5 h-5 text-emerald-400" />
            Bagages arrivés
            {arrivedBaggages.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 rounded-full">
                {arrivedBaggages.length}
              </span>
            )}
          </h2>
        </div>
        <div className="p-4">
          {arrivedBaggages.length === 0 ? (
            <p className="text-center text-white/50 py-8">Aucun bagage arrivé</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {arrivedBaggages.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-black/20 border border-emerald-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Luggage className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-mono font-medium text-white">{b.tagNumber}</p>
                      <p className="text-xs text-white/50">
                        {b.passengers?.fullName || 'Non assigné'}
                      </p>
                      {b.passengers?.pnr && (
                        <p className="text-xs text-white/40">{b.passengers.pnr}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 rounded">
                      Arrivé
                    </span>
                    <p className="text-xs text-white/40 mt-1">
                      {b.flightNumber || b.passengers?.flightNumber || '-'}
                    </p>
                    {b.arrivedAt && (
                      <p className="text-xs text-white/30">
                        {new Date(b.arrivedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
