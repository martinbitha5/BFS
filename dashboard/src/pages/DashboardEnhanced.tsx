import { useEffect, useState } from 'react';
import { Users, Package, CheckCircle, MapPin, Plane, RefreshCw, AlertTriangle, TrendingUp, Clock, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../config/api';
import StatCard from '../components/StatCard';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  const fetchStats = async () => {
    if (!user?.airportCode) return;
    
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/api/v1/stats/airport/${user.airportCode}`);
      setStats(response.data.data);
      
      // Simuler des activités récentes (en production, ces données viendraient de l'API)
      setRecentActivities([
        {
          id: '1',
          type: 'boarding',
          message: '15 passagers embarqués sur le vol AF345',
          timestamp: new Date(Date.now() - 5 * 60000),
          status: 'success'
        },
        {
          id: '2',
          type: 'baggage',
          message: '3 bagages en retard détectés',
          timestamp: new Date(Date.now() - 12 * 60000),
          status: 'warning'
        },
        {
          id: '3',
          type: 'flight',
          message: 'Vol BA123 prêt pour l\'embarquement',
          timestamp: new Date(Date.now() - 20 * 60000),
          status: 'success'
        },
        {
          id: '4',
          type: 'baggage',
          message: '25 bagages enregistrés pour le vol SN456',
          timestamp: new Date(Date.now() - 35 * 60000),
          status: 'success'
        }
      ]);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.airportCode) {
      fetchStats();
      // Actualiser toutes les 30 secondes
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Données pour les graphiques (simulées - en production viendraient de l'API)
  const trendData = [
    { name: '08:00', passagers: 45, bagages: 120 },
    { name: '10:00', passagers: 89, bagages: 245 },
    { name: '12:00', passagers: 123, bagages: 356 },
    { name: '14:00', passagers: 95, bagages: 289 },
    { name: '16:00', passagers: 156, bagages: 432 },
    { name: '18:00', passagers: 178, bagages: 498 },
    { name: 'Maintenant', passagers: stats?.todayPassengers || 0, bagages: stats?.todayBaggages || 0 }
  ];

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
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `Il y a ${diff} min`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return date.toLocaleDateString('fr-FR');
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
        <p className="ml-3 text-gray-600">Chargement...</p>
      </div>
    );
  }

  if (!user?.airportCode) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Aucun aéroport assigné</p>
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
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Vue d'ensemble - {user?.airportCode}</h2>
          <p className="mt-1 text-sm text-gray-500 flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            Mis à jour automatiquement toutes les 30 secondes
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {stats && (
        <>
          {/* Statistiques principales */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

          {/* Alertes importantes */}
          {stats.notBoardedPassengers > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    Attention: {stats.notBoardedPassengers} passagers non embarqués
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Vérifiez les passagers en attente d'embarquement
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Graphiques et analyses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tendances journalières */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-5 h-5 text-primary-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Tendances de la journée</h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="passagers" stroke="#3b82f6" strokeWidth={2} name="Passagers" />
                  <Line type="monotone" dataKey="bagages" stroke="#10b981" strokeWidth={2} name="Bagages" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Statut des bagages */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Package className="w-5 h-5 text-primary-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Statut des bagages</h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
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
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Users className="w-5 h-5 text-primary-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Embarquement</h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
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
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Activity className="w-5 h-5 text-primary-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Activités récentes</h3>
              </div>
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className={`flex-shrink-0 p-2 rounded-full ${getActivityColor(activity.status)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatTimestamp(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Liste des vols */}
          {stats.uniqueFlights.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Plane className="w-5 h-5 mr-2 text-primary-600" />
                  Vols actifs ({stats.flightsCount})
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {stats.uniqueFlights.map((flight) => (
                    <div
                      key={flight}
                      className="flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border border-blue-200 hover:from-blue-100 hover:to-blue-200 transition"
                    >
                      <Plane className="w-4 h-4 mr-2" />
                      {flight}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Statistiques détaillées en footer */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Bagages arrivés</p>
                  <p className="text-2xl font-bold text-green-600">{stats.arrivedBaggages}</p>
                </div>
                <MapPin className="w-8 h-8 text-green-600 opacity-20" />
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">En transit</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.inTransitBaggages}</p>
                </div>
                <Package className="w-8 h-8 text-yellow-600 opacity-20" />
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Taux d'embarquement</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round((stats.boardedPassengers / (stats.totalPassengers || 1)) * 100)}%
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600 opacity-20" />
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Moyenne bag/pax</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.totalPassengers > 0 ? (stats.totalBaggages / stats.totalPassengers).toFixed(1) : '0'}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600 opacity-20" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
