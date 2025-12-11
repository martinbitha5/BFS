import { Activity, AlertTriangle, Barcode, CheckCircle, Clock, Database, MapPin, Package, Plane, RefreshCw, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

export default function DashboardEnhanced() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AirportStats | null>(null);
  const [rawScansStats, setRawScansStats] = useState<RawScansStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const fetchStats = async () => {
    if (!user?.airport_code) return;

    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/api/v1/stats/airport/${user.airport_code}`);
      setStats(response.data.data);

      // Fetch raw scans statistics
      try {
        const rawScansResponse = await api.get(`/api/v1/raw-scans/stats?airport=${user.airport_code}`);
        setRawScansStats(rawScansResponse.data.data);
      } catch (rawScansErr) {
        console.error('Error fetching raw scans stats:', rawScansErr);
        // Continue même si raw scans stats échoue
      }

      // Activités récentes réelles (pour l'instant vide - sera implémenté avec un endpoint dédié)
      setRecentActivities([]);
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
      setSyncMessage(`✅ Synchronisation terminée ! ${syncStats.passengersCreated} passagers et ${syncStats.baggagesCreated} bagages créés.`);
      
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
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

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
              subtitle={`${stats.uniqueFlights.length} vols uniques`}
              icon={Plane}
              color="blue"
            />
          </div>

          {/* Raw Scans Statistics - Responsive */}
          {
            rawScansStats && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 sm:p-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center flex-wrap gap-2">
                    <div className="flex items-center">
                      <Database className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 mr-2" />
                      <h3 className="text-base sm:text-lg font-semibold text-white">Scans Bruts</h3>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
                        <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
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
                  <div className="bg-white/95 backdrop-blur-lg rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/70 mb-1">Total Scans</p>
                        <p className="text-xl sm:text-2xl font-bold text-purple-600">{rawScansStats.total}</p>
                      </div>
                      <Barcode className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white/95 backdrop-blur-lg rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/70 mb-1">Boarding Pass</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600">{rawScansStats.by_type.boarding_pass}</p>
                      </div>
                      <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white/95 backdrop-blur-lg rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/70 mb-1">Baggage Tag</p>
                        <p className="text-xl sm:text-2xl font-bold text-orange-600">{rawScansStats.by_type.baggage_tag}</p>
                      </div>
                      <Package className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 opacity-20" />
                    </div>
                  </div>
                  <div className="bg-white/95 backdrop-blur-lg rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/70 mb-1">Checkpoints</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">
                          {rawScansStats.by_status.checkin + rawScansStats.by_status.baggage + rawScansStats.by_status.boarding + rawScansStats.by_status.arrival}
                        </p>
                      </div>
                      <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 opacity-20" />
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          {/* Alertes importantes - Responsive */}
          {
            stats.notBoardedPassengers > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 sm:p-4 rounded-r-lg animate-fade-in">
                <div className="flex items-start">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-xs sm:text-sm font-medium text-yellow-800">
                      ⚠️ {stats.notBoardedPassengers} passagers non embarqués
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
            <div className="bg-white/95 backdrop-blur-lg shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg p-4 sm:p-6">
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
            <div className="bg-white/95 backdrop-blur-lg shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg p-4 sm:p-6">
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
            <div className="bg-white/95 backdrop-blur-lg shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg p-4 sm:p-6 lg:col-span-2">
              <div className="flex items-center mb-4">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 mr-2" />
                <h3 className="text-base sm:text-lg font-medium text-white">Activités récentes</h3>
              </div>
              <div className="space-y-2 sm:space-y-3 max-h-[200px] sm:max-h-[250px] overflow-y-auto">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-black/25 backdrop-blur-md border border-white/20 rounded-lg hover:bg-white/85 backdrop-blur-lg transition">
                    <div className={`flex-shrink-0 p-2 rounded-full ${getActivityColor(activity.status)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{activity.message}</p>
                      <p className="text-xs text-white/70 mt-1">{formatTimestamp(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Liste des vols - Responsive */}
          {
            stats.uniqueFlights.length > 0 && (
              <div className="bg-white/95 backdrop-blur-lg shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
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
            )
          }

          {/* Statistiques détaillées en footer - Responsive */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white/95 backdrop-blur-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70">Arrivés</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.arrivedBaggages}</p>
                </div>
                <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 opacity-20" />
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70">En transit</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.inTransitBaggages}</p>
                </div>
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 opacity-20" />
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70">Embarq.</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {Math.round((stats.boardedPassengers / (stats.totalPassengers || 1)) * 100)}%
                  </p>
                </div>
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 opacity-20" />
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 rounded-lg p-3 sm:p-4">
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
