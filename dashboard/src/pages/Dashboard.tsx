import { CheckCircle, MapPin, Package, Plane, RefreshCw, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
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

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AirportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const fetchStats = async () => {
    if (!user?.airport_code) return;
    
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/api/v1/stats/airport/${user.airport_code}`);
      setStats(response.data.data);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.airport_code) {
      fetchStats();
    }
  }, [user]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Tableau de bord - {user?.airport_code}</h2>
          <p className="mt-1 text-sm text-white/90">Vue d'ensemble des opérations aéroportuaires</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={syncRawScans}
            disabled={syncing}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Synchroniser Raw Scans
          </button>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Messages */}
      {syncMessage && (
        <div className="bg-green-50/95 backdrop-blur-sm border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{syncMessage}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50/95 backdrop-blur-sm border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <>
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
              subtitle={`Non embarqués: ${stats.notBoardedPassengers}`}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              title="Vols actifs"
              value={stats.flightsCount}
              icon={Plane}
              color="blue"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <StatCard
              title="Bagages arrivés"
              value={stats.arrivedBaggages}
              icon={MapPin}
              color="green"
            />
            <StatCard
              title="Bagages en transit"
              value={stats.inTransitBaggages}
              icon={Package}
              color="yellow"
            />
          </div>

          {/* Flights List */}
          {stats.uniqueFlights.length > 0 && (
            <div className="bg-white/95 backdrop-blur-sm/95 backdrop-blur-sm shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200/50">
                <h3 className="text-lg font-medium text-white">
                  Vols ({stats.flightsCount})
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {stats.uniqueFlights.map((flight) => (
                    <span
                      key={flight}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      <Plane className="w-4 h-4 mr-1" />
                      {flight}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
