import { Activity, AlertTriangle, Barcode, CheckCircle, Clock, Database, MapPin, Package, Plane, RefreshCw, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AlertsPanel from '../components/AlertsPanel';
import StatCard from '../components/StatCard';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface AirportStats {
  totalPassengers: number;
  totalBaggages: number;
  boardedPassengers: number;
  notBoardedPassengers: number;
  arrivedBaggages: number;
  inTransitBaggages: number;
  todayPassengers: number;
  todayBaggages: number;
  flightsCount: number;
  uniqueFlights: string[];
}

interface RawScansStats {
  total: number;
  by_type: {
    boarding_pass: number;
    baggage_tag: number;
  };
  by_status: {
    checkin: number;
    baggage: number;
    boarding: number;
    arrival: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'boarding' | 'baggage' | 'flight';
  message: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error';
}

interface RecentPassenger {
  id: string;
  pnr: string;
  fullName: string;
  flightNumber: string;
  route: string;
  airline: string;
  baggageCount: number;
  seatNumber?: string;
  cabinClass?: string;
  checkedInAt: string;
}

interface RecentBaggage {
  id: string;
  rfidTag: string;
  status: string;
  weight?: number;
  checkedAt: string;
  arrivedAt?: string;
  passenger?: {
    fullName: string;
    pnr: string;
    flightNumber: string;
    route: string;
  };
}

interface FlightWithStats {
  id: string;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  departure: string;
  arrival: string;
  scheduledTime: string;
  status: string;
  flightType: string;
  baggageRestriction: string;
  stats: {
    totalPassengers: number;
    boardedPassengers: number;
    totalBaggages: number;
    boardingProgress: number;
  };
}

export default function DashboardEnhanced() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AirportStats | null>(null);
  const [rawScansStats, setRawScansStats] = useState<RawScansStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [recentPassengers, setRecentPassengers] = useState<RecentPassenger[]>([]);
  const [recentBaggages, setRecentBaggages] = useState<RecentBaggage[]>([]);
  const [flightsWithStats, setFlightsWithStats] = useState<FlightWithStats[]>([]);

  const fetchStats = async () => {
    if (!user?.airport_code) return;

    try {
      setLoading(true);
      setError('');
      
      // 1. Statistiques principales
      const response = await api.get(`/api/v1/stats/airport/${user.airport_code}`);
      setStats(response.data.data);

      // 2. Raw scans statistics
      try {
        const rawScansResponse = await api.get(`/api/v1/raw-scans/stats?airport=${user.airport_code}`);
        setRawScansStats(rawScansResponse.data.data);
      } catch (rawScansErr) {
        console.error('Error fetching raw scans stats:', rawScansErr);
      }

      // 3. Données récentes parsées (passagers, bagages, activités)
      try {
        const recentResponse = await api.get(`/api/v1/stats/recent/${user.airport_code}?limit=10`);
        if (recentResponse.data.data) {
          setRecentPassengers(recentResponse.data.data.recentPassengers || []);
          setRecentBaggages(recentResponse.data.data.recentBaggages || []);
          
          // Transformer les activités pour l'affichage
          const activities = (recentResponse.data.data.recentActivities || []).map((a: any) => ({
            id: a.id,
            type: a.entityType === 'passenger' ? 'boarding' : a.entityType === 'baggage' ? 'baggage' : 'flight',
            message: a.details || a.action,
            timestamp: new Date(a.createdAt),
            status: a.action.includes('ERROR') ? 'error' : a.action.includes('SUSPECT') ? 'warning' : 'success'
          }));
          setRecentActivities(activities);
        }
      } catch (recentErr) {
        console.error('Error fetching recent data:', recentErr);
      }

      // 4. Vols avec statistiques détaillées
      try {
        const flightsResponse = await api.get(`/api/v1/stats/flights/${user.airport_code}`);
        if (flightsResponse.data.data) {
          setFlightsWithStats(flightsResponse.data.data.flights || []);
        }
      } catch (flightsErr) {
        console.error('Error fetching flights stats:', flightsErr);
      }

    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const syncRawScans = async () => {
    if (!user?.airport_code) return;
    
    try {
      setSyncing(true);
      setSyncMessage('');
      setError('');
      
      const response = await api.post('/api/v1/sync-raw-scans', {
        airport_code: user.airport_code
      });
      
      const { stats: syncStats } = response.data;
      setSyncMessage(`Synchronisation terminée ! ${syncStats.passengersCreated} passagers et ${syncStats.baggagesCreated} bagages créés.`);
      
      // Recharger les stats après sync
      await fetchStats();
    } catch (err: any) {
      console.error('Error syncing raw scans:', err);
      setError(err.response?.data?.error || 'Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (user?.airport_code) {
      fetchStats();
      // Actualiser toutes les 30 secondes
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Données réelles pour les graphiques
  const baggageStatusData = stats ? [
    { name: 'Arrivés', value: stats.arrivedBaggages, color: '#10b981' },
    { name: 'En transit', value: stats.inTransitBaggages, color: '#f59e0b' },
  ] : [];

  const passengerStatusData = stats ? [
    { name: 'Embarqués', value: stats.boardedPassengers, color: '#10b981' },
    { name: 'Non embarqués', value: stats.notBoardedPassengers, color: '#ef4444' },
  ] : [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'boarding': return <Users className="w-5 h-5" />;
      case 'baggage': return <Package className="w-5 h-5" />;
      case 'flight': return <Plane className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-900/40 backdrop-blur-sm';
      case 'warning': return 'text-yellow-300 bg-yellow-900/40 backdrop-blur-sm';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-white/80 bg-white/85 backdrop-blur-lg';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `Il y a ${diff} min`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `Il y a ${hours} h`;
    return date.toLocaleDateString('fr-FR');
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
        <p className="ml-3 text-white/80">Chargement...</p>
      </div>
    );
  }

  if (!user?.airport_code) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-white/80">Aucun aéroport assigné</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 backdrop-blur-md border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header avec actions - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <span>Vue d'ensemble</span>
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800">
              {user?.airport_code}
            </span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-white/70 flex items-center">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            Mis à jour automatiquement toutes les 30s
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={syncRawScans}
            disabled={syncing}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Synchroniser Raw Scans</span>
            <span className="sm:hidden">Sync</span>
          </button>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
            <span className="sm:hidden">Actualiser</span>
          </button>
        </div>
      </div>

      {/* Messages de synchronisation */}
      {syncMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{syncMessage}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-900/30 backdrop-blur-md border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Panneau d'Alertes en temps réel */}
      <AlertsPanel className="animate-fade-in" />

      {stats && (
        <>
          {/* Statistiques principales - Grid responsive */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Passagers"
              value={stats.totalPassengers}
              subtitle={`Aujourd'hui: ${stats.todayPassengers}`}
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Total Bagages"
              value={stats.totalBaggages}
              subtitle={`Aujourd'hui: ${stats.todayBaggages}`}
              icon={Package}
              color="green"
            />
            <StatCard
              title="Embarqués"
              value={stats.boardedPassengers}
              subtitle={`${Math.round((stats.boardedPassengers / (stats.totalPassengers || 1)) * 100)}% du total`}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              title="Vols actifs"
              value={stats.flightsCount}
              subtitle={`${stats.uniqueFlights?.length || 0} vols uniques`}
              icon={Plane}
              color="blue"
            />
          </div>

          {/* Raw Scans Statistics - Responsive */}
          {
            rawScansStats && (
              <div className="bg-black/25 backdrop-blur-md border border-purple-200 rounded-lg p-4 sm:p-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center flex-wrap gap-2">
                    <div className="flex items-center">
                      <Database className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 mr-2" />
                      <h3 className="text-base sm:text-lg font-semibold text-white">Scans Bruts</h3>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/40 backdrop-blur-sm text-green-800">
                      Système anti-doublons
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-white/80 mt-2">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                        Check-in: {rawScansStats.by_status.checkin}
                      </span>
                      <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-black/25 backdrop-blur-md0 mr-1"></span>
                        Bagage: {rawScansStats.by_status.baggage}
                      </span>
                      <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-purple-500 mr-1"></span>
                        Embarquement: {rawScansStats.by_status.boarding}
                      </span>
                      <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-orange-500 mr-1"></span>
                        Arrivée: {rawScansStats.by_status.arrival}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/70 mb-1">Total Scans</p>
                        <p className="text-xl sm:text-2xl font-bold text-purple-600">{rawScansStats.total}</p>
                      </div>
                      <Barcode className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/70 mb-1">Boarding Pass</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600">{rawScansStats.by_type.boarding_pass}</p>
                      </div>
                      <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/70 mb-1">Baggage Tag</p>
                        <p className="text-xl sm:text-2xl font-bold text-orange-600">{rawScansStats.by_type.baggage_tag}</p>
                      </div>
                      <Package className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/70 mb-1">Checkpoints</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-300">
                          {rawScansStats.by_status.checkin + rawScansStats.by_status.baggage + rawScansStats.by_status.boarding + rawScansStats.by_status.arrival}
                        </p>
                      </div>
                      <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-300 opacity-20" />
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          {/* Alertes importantes - Responsive */}
          {
            stats.notBoardedPassengers > 0 && (
              <div className="bg-black/25 backdrop-blur-md border-l-4 border-yellow-400 p-3 sm:p-4 rounded-r-lg animate-fade-in">
                <div className="flex items-start">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-xs sm:text-sm font-medium text-yellow-800">
                      {stats.notBoardedPassengers} passagers non embarqués
                    </h3>
                    <p className="text-xs sm:text-sm text-yellow-700 mt-1 hidden sm:block">
                      Vérifiez les passagers en attente d'embarquement
                    </p>
                  </div>
                </div>
              </div>
            )
          }

          {/* Graphiques de statut réels - Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Statut des bagages */}
            <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg p-4 sm:p-6">
              <div className="flex items-center mb-4">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 mr-2" />
                <h3 className="text-base sm:text-lg font-medium text-white">Statut des bagages</h3>
              </div>
              <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
                <PieChart>
                  <Pie
                    data={baggageStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {baggageStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Statut des passagers */}
            <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg p-4 sm:p-6">
              <div className="flex items-center mb-4">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 mr-2" />
                <h3 className="text-base sm:text-lg font-medium text-white">Embarquement</h3>
              </div>
              <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
                <BarChart data={passengerStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Passagers">
                    {passengerStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Activités récentes */}
            <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg p-4 sm:p-6 lg:col-span-2">
              <div className="flex items-center mb-4">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 mr-2" />
                <h3 className="text-base sm:text-lg font-medium text-white">Activités récentes</h3>
              </div>
              <div className="space-y-2 sm:space-y-3 max-h-[200px] sm:max-h-[250px] overflow-y-auto">
                {recentActivities.length > 0 ? recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-black/25 backdrop-blur-md border border-white/20 rounded-lg hover:bg-white/85 backdrop-blur-lg transition">
                    <div className={`flex-shrink-0 p-2 rounded-full ${getActivityColor(activity.status)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{activity.message}</p>
                      <p className="text-xs text-white/70 mt-1">{formatTimestamp(activity.timestamp)}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-white/60 text-center py-4">Aucune activité récente</p>
                )}
              </div>
            </div>
          </div>

          {/* Passagers récents avec infos parsées */}
          {recentPassengers.length > 0 && (
            <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg overflow-hidden animate-fade-in">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/20 bg-gradient-to-r from-blue-900/30 to-blue-800/20">
                <h3 className="text-base sm:text-lg font-medium text-white flex items-center">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-400" />
                  Passagers récents ({recentPassengers.length})
                  <span className="ml-2 text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full">Données parsées</span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-black/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Passager</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">PNR</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Vol</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Route</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Bagages</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Check-in</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {recentPassengers.map((passenger) => (
                      <tr key={passenger.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-blue-900/40 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-blue-300" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-white">{passenger.fullName}</p>
                              {passenger.seatNumber && (
                                <p className="text-xs text-white/60">Siège: {passenger.seatNumber}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-mono text-blue-300 bg-blue-900/30 px-2 py-1 rounded">{passenger.pnr}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-semibold text-white">{passenger.flightNumber}</span>
                          {passenger.airline && (
                            <p className="text-xs text-white/60">{passenger.airline}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-white/80">{passenger.route}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            passenger.baggageCount > 0 ? 'bg-green-900/40 text-green-300' : 'bg-gray-900/40 text-gray-400'
                          }`}>
                            <Package className="w-3 h-3 mr-1" />
                            {passenger.baggageCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-white/60">
                          {new Date(passenger.checkedInAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bagages récents avec infos parsées */}
          {recentBaggages.length > 0 && (
            <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg overflow-hidden animate-fade-in">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/20 bg-gradient-to-r from-green-900/30 to-green-800/20">
                <h3 className="text-base sm:text-lg font-medium text-white flex items-center">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-400" />
                  Bagages récents ({recentBaggages.length})
                  <span className="ml-2 text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full">Données parsées</span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-black/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Tag RFID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Passager</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Vol</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Statut</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Poids</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Heure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {recentBaggages.map((baggage) => (
                      <tr key={baggage.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-mono text-green-300 bg-green-900/30 px-2 py-1 rounded">{baggage.rfidTag}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {baggage.passenger ? (
                            <div>
                              <p className="text-sm font-medium text-white">{baggage.passenger.fullName}</p>
                              <p className="text-xs text-white/60">PNR: {baggage.passenger.pnr}</p>
                            </div>
                          ) : (
                            <span className="text-sm text-white/50">Non associé</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {baggage.passenger ? (
                            <div>
                              <span className="text-sm font-semibold text-white">{baggage.passenger.flightNumber}</span>
                              <p className="text-xs text-white/60">{baggage.passenger.route}</p>
                            </div>
                          ) : (
                            <span className="text-sm text-white/50">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            baggage.status === 'arrived' ? 'bg-green-900/40 text-green-300' :
                            baggage.status === 'checked' ? 'bg-blue-900/40 text-blue-300' :
                            baggage.status === 'in_transit' ? 'bg-yellow-900/40 text-yellow-300' :
                            'bg-gray-900/40 text-gray-400'
                          }`}>
                            {baggage.status === 'arrived' ? 'Arrivé' :
                             baggage.status === 'checked' ? 'Enregistré' :
                             baggage.status === 'in_transit' ? 'En transit' :
                             baggage.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-white/80">
                          {baggage.weight ? `${baggage.weight} kg` : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-white/60">
                          {new Date(baggage.checkedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vols du jour avec statistiques détaillées */}
          {flightsWithStats.length > 0 && (
            <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg overflow-hidden animate-fade-in">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/20 bg-gradient-to-r from-purple-900/30 to-purple-800/20">
                <h3 className="text-base sm:text-lg font-medium text-white flex items-center">
                  <Plane className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-purple-400" />
                  Vols du jour ({flightsWithStats.length})
                  <span className="ml-2 text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">Statistiques temps réel</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {flightsWithStats.map((flight) => (
                  <div
                    key={flight.id}
                    className={`bg-black/20 border rounded-lg p-4 hover:scale-[1.02] transition-all duration-200 ${
                      flight.flightType === 'departure' ? 'border-blue-500/30' : 'border-green-500/30'
                    }`}
                  >
                    {/* En-tête du vol */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full mr-3 ${
                          flight.flightType === 'departure' ? 'bg-blue-900/40' : 'bg-green-900/40'
                        }`}>
                          <Plane className={`w-5 h-5 ${
                            flight.flightType === 'departure' ? 'text-blue-400' : 'text-green-400'
                          }`} />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">{flight.flightNumber}</p>
                          <p className="text-xs text-white/60">{flight.airline}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          flight.flightType === 'departure' 
                            ? 'bg-blue-900/40 text-blue-300' 
                            : 'bg-green-900/40 text-green-300'
                        }`}>
                          {flight.flightType === 'departure' ? 'Départ' : 'Arrivée'}
                        </span>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center justify-center mb-3 text-white/80">
                      <span className="font-semibold">{flight.departure}</span>
                      <span className="mx-2">→</span>
                      <span className="font-semibold">{flight.arrival}</span>
                      {flight.scheduledTime && (
                        <span className="ml-3 text-xs text-white/50">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {flight.scheduledTime}
                        </span>
                      )}
                    </div>

                    {/* Statistiques */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center bg-black/20 rounded p-2">
                        <p className="text-lg font-bold text-white">{flight.stats.totalPassengers}</p>
                        <p className="text-xs text-white/60">Passagers</p>
                      </div>
                      <div className="text-center bg-black/20 rounded p-2">
                        <p className="text-lg font-bold text-green-400">{flight.stats.boardedPassengers}</p>
                        <p className="text-xs text-white/60">Embarqués</p>
                      </div>
                      <div className="text-center bg-black/20 rounded p-2">
                        <p className="text-lg font-bold text-blue-400">{flight.stats.totalBaggages}</p>
                        <p className="text-xs text-white/60">Bagages</p>
                      </div>
                    </div>

                    {/* Barre de progression embarquement */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-white/60 mb-1">
                        <span>Embarquement</span>
                        <span>{flight.stats.boardingProgress}%</span>
                      </div>
                      <div className="w-full bg-black/30 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            flight.stats.boardingProgress >= 100 ? 'bg-green-500' :
                            flight.stats.boardingProgress >= 50 ? 'bg-blue-500' :
                            'bg-yellow-500'
                          }`}
                          style={{ width: `${Math.min(flight.stats.boardingProgress, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Restriction bagage */}
                    {flight.baggageRestriction !== 'allow' && (
                      <div className={`text-xs p-2 rounded flex items-center ${
                        flight.baggageRestriction === 'block' 
                          ? 'bg-red-900/30 text-red-300' 
                          : 'bg-yellow-900/30 text-yellow-300'
                      }`}>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {flight.baggageRestriction === 'block' ? 'Bagages non enregistrés: BLOQUER' : 'Bagages non enregistrés: Paiement requis'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Liste simple des vols (fallback si pas de stats détaillées) */}
          {flightsWithStats.length === 0 && stats.uniqueFlights && stats.uniqueFlights.length > 0 && (
            <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-black/25 backdrop-blur-md">
                <h3 className="text-base sm:text-lg font-medium text-white flex items-center">
                  <Plane className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary-600" />
                  Vols actifs ({stats.flightsCount})
                </h3>
              </div>
              <div className="px-4 sm:px-6 py-3 sm:py-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                  {stats.uniqueFlights.map((flight) => (
                    <div
                      key={flight}
                      className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-xs sm:text-sm font-medium bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border border-blue-200 hover:from-blue-100 hover:to-blue-200 hover:scale-105 transition-all duration-200 cursor-pointer"
                    >
                      <Plane className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      {flight}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Statistiques détaillées en footer - Responsive */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70">Arrivés</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.arrivedBaggages}</p>
                </div>
                <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 opacity-20" />
              </div>
            </div>
            <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70">En transit</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-300">{stats.inTransitBaggages}</p>
                </div>
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-300 opacity-20" />
              </div>
            </div>
            <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70">Embarq.</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-300">
                    {Math.round((stats.boardedPassengers / (stats.totalPassengers || 1)) * 100)}%
                  </p>
                </div>
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-300 opacity-20" />
              </div>
            </div>
            <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70">Moy. bag</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">
                    {stats.totalPassengers > 0 ? (stats.totalBaggages / stats.totalPassengers).toFixed(1) : '0'}
                  </p>
                </div>
                <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 opacity-20" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
