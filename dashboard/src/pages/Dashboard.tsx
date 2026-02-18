import { AlertCircle, Package, Plane, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import LoadingPlane from '../components/LoadingPlane';
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
  airline_code?: string;
  baggages: {
    id: string;
    tag_number: string;
    status: string;
    weight: number | null;
    checked_at: string | null;
    arrived_at: string | null;
    delivered_at: string | null;
  }[];
  boarding_status: {
    boarded: boolean;
    boarded_at: string | null;
  }[];
}

interface DashboardStats {
  totalFlights: number;
  totalPassengers: number;
  totalBaggages: number;
  checkedInPassengers: number;
  boardedPassengers: number;
  deliveredBaggages: number;
  pendingBaggages: number;
  avgBaggagesPerPassenger: number;
}

interface FlightData {
  flight: string;
  passengers: number;
  boarded: number;
  baggages: number;
  delivered: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const { user } = useAuth();
  const [departures, setDepartures] = useState<Passenger[]>([]);
  const [arrivals, setArrivals] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.airport_code) {
      setError('Code aéroport non disponible');
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
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

      // Fetch departures
      const depResponse = await api.get(`/api/v1/passengers?airport=${encodeURIComponent(user.airport_code)}`, { headers });
      const depData = depResponse.data as { success: boolean; data: Passenger[] };

      // Fetch arrivals
      const arrResponse = await api.get(`/api/v1/passengers?airport=${encodeURIComponent(user.airport_code)}&filter=arrival`, { headers });
      const arrData = arrResponse.data as { success: boolean; data: Passenger[] };

      if (depData.success && Array.isArray(depData.data)) {
        // Filter by airline_code if user has one
        const filteredDepartures = user.airline_code && user.airline_code !== 'ALL'
          ? depData.data.filter(p => p.airline_code === user.airline_code)
          : depData.data;
        setDepartures(filteredDepartures);
      }

      if (arrData.success && Array.isArray(arrData.data)) {
        // Filter by airline_code if user has one
        const filteredArrivals = user.airline_code && user.airline_code !== 'ALL'
          ? arrData.data.filter(p => p.airline_code === user.airline_code)
          : arrData.data;
        setArrivals(filteredArrivals);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Erreur chargement données:', err);
      setError(err.message || 'Erreur lors du chargement des données');
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  }, [user?.airport_code, user?.airline_code]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = (): DashboardStats => {
    const allPassengers = [...departures, ...arrivals];
    const allBaggages = allPassengers.flatMap(p => p.baggages || []);

    return {
      totalFlights: new Set([...departures, ...arrivals].map(p => p.flightNumber)).size,
      totalPassengers: allPassengers.length,
      totalBaggages: allBaggages.length,
      checkedInPassengers: allPassengers.filter(p => p.checkedInAt).length,
      boardedPassengers: allPassengers.filter(p => p.boarding_status?.[0]?.boarded).length,
      deliveredBaggages: allBaggages.filter(b => b.delivered_at).length,
      pendingBaggages: allBaggages.filter(b => !b.delivered_at && b.arrived_at).length,
      avgBaggagesPerPassenger: allPassengers.length > 0 ? Math.round((allBaggages.length / allPassengers.length) * 10) / 10 : 0
    };
  };

  const flightChartData = (): FlightData[] => {
    const flightMap = new Map<string, FlightData>();
    const allPassengers = [...departures, ...arrivals];

    allPassengers.forEach(p => {
      if (!flightMap.has(p.flightNumber)) {
        flightMap.set(p.flightNumber, {
          flight: p.flightNumber,
          passengers: 0,
          boarded: 0,
          baggages: 0,
          delivered: 0
        });
      }
      const data = flightMap.get(p.flightNumber)!;
      data.passengers += 1;
      if (p.boarding_status?.[0]?.boarded) data.boarded += 1;
      data.baggages += (p.baggages?.length || 0);
      data.delivered += (p.baggages?.filter(b => b.delivered_at).length || 0);
    });

    return Array.from(flightMap.values()).slice(0, 10);
  };

  const statusDistribution = (): StatusData[] => {
    const allBaggages = [...departures, ...arrivals].flatMap(p => p.baggages || []);
    const statusMap = new Map<string, number>();

    allBaggages.forEach(b => {
      const status = b.status || 'Unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    const statuses = Array.from(statusMap.entries()).map(([name, value], index) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: COLORS[index % COLORS.length]
    }));

    return statuses;
  };

  const passengersVsBaggages = (): any[] => {
    const allPassengers = [...departures, ...arrivals];
    const flightMap = new Map<string, { flight: string; passengers: number; baggages: number }>();

    allPassengers.forEach(p => {
      if (!flightMap.has(p.flightNumber)) {
        flightMap.set(p.flightNumber, {
          flight: p.flightNumber.substring(0, 6),
          passengers: 0,
          baggages: 0
        });
      }
      const data = flightMap.get(p.flightNumber)!;
      data.passengers += 1;
      data.baggages += (p.baggages?.length || 0);
    });

    return Array.from(flightMap.values()).slice(0, 10);
  };

  const boardingProgress = (): any[] => {
    const boardedCount = stats().boardedPassengers;
    const unbordedCount = stats().totalPassengers - boardedCount;

    return [
      { name: 'Embarqués', value: boardedCount, color: '#10b981' },
      { name: 'En attente', value: unbordedCount, color: '#f59e0b' }
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingPlane />
      </div>
    );
  }

  const dashboardStats = stats();
  const flightData = flightChartData();
  const statusData = statusDistribution();
  const pvbData = passengersVsBaggages();
  const boardingData = boardingProgress();

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Opérationnel</h1>
          <p className="text-white/60 mt-2">Aéroport: {user?.airport_code}</p>
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-200">{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Flights Card */}
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-300/70 text-sm mb-1">Vols Actifs</p>
              <p className="text-3xl font-bold text-blue-300">{dashboardStats.totalFlights}</p>
            </div>
            <Plane className="w-8 h-8 text-blue-400/50" />
          </div>
          <p className="text-blue-300/50 text-xs mt-3">Aujourd'hui</p>
        </div>

        {/* Passengers Card */}
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-300/70 text-sm mb-1">Passagers</p>
              <p className="text-3xl font-bold text-green-300">{dashboardStats.totalPassengers}</p>
              <p className="text-green-300/50 text-xs mt-2">{dashboardStats.checkedInPassengers} enregistrés</p>
            </div>
            <Users className="w-8 h-8 text-green-400/50" />
          </div>
        </div>

        {/* Baggages Card */}
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-300/70 text-sm mb-1">Bagages</p>
              <p className="text-3xl font-bold text-purple-300">{dashboardStats.totalBaggages}</p>
              <p className="text-purple-300/50 text-xs mt-2">{dashboardStats.deliveredBaggages} livrés</p>
            </div>
            <Package className="w-8 h-8 text-purple-400/50" />
          </div>
        </div>

        {/* Boarded Card */}
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-amber-300/70 text-sm mb-1">Embarqués</p>
              <p className="text-3xl font-bold text-amber-300">{dashboardStats.boardedPassengers}</p>
              <p className="text-amber-300/50 text-xs mt-2">{Math.round((dashboardStats.boardedPassengers / dashboardStats.totalPassengers) * 100) || 0}% du total</p>
            </div>
            <TrendingUp className="w-8 h-8 text-amber-400/50" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Embarquement Progress */}
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">État d'Embarquement</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={boardingData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {boardingData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Distribution des Statuts Bagages</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Flight Performance */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Performance par Vol (Top 10)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={flightData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="flight" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}
              labelStyle={{ color: 'white' }}
            />
            <Legend />
            <Bar dataKey="passengers" fill="#3b82f6" name="Passagers" />
            <Bar dataKey="boarded" fill="#10b981" name="Embarqués" />
            <Bar dataKey="delivered" fill="#8b5cf6" name="Bagages Livrés" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Passengers vs Baggages */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Passagers vs Bagages par Vol</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={pvbData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="flight" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}
              labelStyle={{ color: 'white' }}
            />
            <Legend />
            <Bar dataKey="passengers" fill="#3b82f6" name="Passagers" radius={[8, 8, 0, 0]} />
            <Bar dataKey="baggages" fill="#f59e0b" name="Bagages" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
          <p className="text-white/60 text-sm mb-2">Moyenne de Bagages par Passager</p>
          <p className="text-2xl font-bold text-white">{dashboardStats.avgBaggagesPerPassenger}</p>
        </div>
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
          <p className="text-white/60 text-sm mb-2">Taux de Check-in</p>
          <p className="text-2xl font-bold text-white">
            {dashboardStats.totalPassengers > 0 
              ? Math.round((dashboardStats.checkedInPassengers / dashboardStats.totalPassengers) * 100)
              : 0}%
          </p>
        </div>
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
          <p className="text-white/60 text-sm mb-2">Bagages Livrés / Total</p>
          <p className="text-2xl font-bold text-white">
            {dashboardStats.totalBaggages > 0
              ? Math.round((dashboardStats.deliveredBaggages / dashboardStats.totalBaggages) * 100)
              : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}
