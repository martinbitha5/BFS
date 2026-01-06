/**
 * Dashboard Superviseur - Design Simple et Fonctionnel
 * Intègre la gestion des vols directement dans le dashboard
 */

import { AlertCircle, AlertTriangle, CheckCircle, Clock, MapPin, Package, Plane, Plus, RefreshCw, Search, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AlertsPanel from '../components/AlertsPanel';
import FlightFormModal from '../components/FlightFormModal';
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

interface BaggageDisputeStats {
  totalBaggages: number;
  rushBaggages: number;
  lostBaggages: number;
  unmatchedBaggages: number;
  todayRush: number;
}

interface RushBaggage {
  id: string;
  tagNumber: string;
  passengerName: string;
  flightNumber: string;
  reason: string;
  declaredAt: string;
  status: string;
}

interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  departure: string;
  arrival: string;
  scheduledDate: string;
  scheduledTime?: string;
  status: 'scheduled' | 'boarding' | 'departed' | 'arrived' | 'cancelled';
  flightType: 'departure' | 'arrival';
  baggageRestriction: 'block' | 'allow_with_payment' | 'allow';
  restrictionNote?: string;
  airportCode: string;
}

interface FlightWithStats {
  id: string;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  departure: string;
  arrival: string;
  scheduledDate: string;
  scheduledTime?: string;
  status: 'scheduled' | 'boarding' | 'departed' | 'arrived' | 'cancelled';
  flightType: 'departure' | 'arrival';
  baggageRestriction: 'block' | 'allow_with_payment' | 'allow';
  restrictionNote?: string;
  airportCode: string;
  stats: {
    totalPassengers: number;
    boardedPassengers: number;
    totalBaggages: number;
    boardingProgress: number;
  };
}

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DashboardSupervisor() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AirportStats | null>(null);
  const [flightsWithStats, setFlightsWithStats] = useState<FlightWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showAddFlightModal, setShowAddFlightModal] = useState(false);
  const [selectedDate] = useState(getLocalDate());
  
  // États pour baggage_dispute
  const [disputeStats, setDisputeStats] = useState<BaggageDisputeStats | null>(null);
  const [rushBaggages, setRushBaggages] = useState<RushBaggage[]>([]);
  
  const isBaggageDispute = user?.role === 'baggage_dispute';

  const fetchAllData = useCallback(async () => {
    if (!user?.airport_code) return;

    try {
      if (!stats && !disputeStats) setLoading(true);
      setError('');

      if (isBaggageDispute) {
        // Pour baggage_dispute: charger les stats de litiges bagages
        try {
          const rushResponse = await api.get('/api/v1/rush/baggages');
          const rushData = rushResponse.data.data || [];
          setRushBaggages(rushData.slice(0, 10)); // Derniers 10 rush
          
          // Calculer les stats de litiges
          setDisputeStats({
            totalBaggages: rushData.length,
            rushBaggages: rushData.filter((b: any) => b.status === 'rush').length,
            lostBaggages: rushData.filter((b: any) => b.status === 'lost').length,
            unmatchedBaggages: rushData.filter((b: any) => b.status === 'unmatched').length,
            todayRush: rushData.filter((b: any) => {
              const today = new Date().toISOString().split('T')[0];
              return b.declaredAt?.startsWith(today);
            }).length,
          });
        } catch (err) {
          console.error('Erreur chargement rush:', err);
          setDisputeStats({
            totalBaggages: 0,
            rushBaggages: 0,
            lostBaggages: 0,
            unmatchedBaggages: 0,
            todayRush: 0,
          });
        }
      } else {
        // Pour supervisor: charger les stats normales
        const statsResponse = await api.get(`/api/v1/stats/airport/${user.airport_code}`);
        setStats(statsResponse.data.data);

        const flightsResponse = await api.get(`/api/v1/stats/flights/${user.airport_code}`);
        if (flightsResponse.data.data) {
          setFlightsWithStats(flightsResponse.data.data.flights || []);
        }
      }

      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Erreur chargement données:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user?.airport_code, stats, disputeStats, isBaggageDispute]);

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
      setSyncMessage(`✅ ${syncStats.passengersCreated} passagers et ${syncStats.baggagesCreated} bagages synchronisés`);

      await fetchAllData();
    } catch (err: any) {
      console.error('Erreur sync:', err);
      setError(err.response?.data?.error || 'Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddFlight = async (flightData: any) => {
    try {
      await api.post('/api/v1/flights', flightData);
      setShowAddFlightModal(false);
      setSyncMessage(`✅ Vol ${flightData.flightNumber} ajouté avec succès`);
      await fetchAllData();
    } catch (err: any) {
      console.error('Erreur ajout vol:', err);
      setError(err.response?.data?.error || 'Erreur lors de l\'ajout du vol');
    }
  };

  const handleDeleteFlight = async (flight: FlightWithStats) => {
    if (!confirm(`Supprimer le vol ${flight.flightNumber} ?`)) return;

    try {
      await api.delete(`/api/v1/flights/${flight.id}`);
      setSyncMessage(`✅ Vol ${flight.flightNumber} supprimé`);
      await fetchAllData();
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      setError('Erreur lors de la suppression du vol');
    }
  };

  useEffect(() => {
    if (user?.airport_code) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.airport_code, fetchAllData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-900/40 text-blue-300 border-blue-500/30';
      case 'boarding': return 'bg-green-900/40 text-green-300 border-green-500/30';
      case 'departed': return 'bg-gray-900/40 text-gray-300 border-gray-500/30';
      case 'cancelled': return 'bg-red-900/40 text-red-300 border-red-500/30';
      default: return 'bg-gray-900/40 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programmé';
      case 'boarding': return 'Embarquement';
      case 'departed': return 'Parti';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  if (loading && !stats && !disputeStats) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
        <p className="ml-3 text-white/80">Chargement...</p>
      </div>
    );
  }

  // Dashboard pour Litiges Bagages
  if (isBaggageDispute) {
    return (
      <div className="space-y-6">
        {/* Header Litiges */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-8 h-8 text-orange-400" />
                Gestion des Litiges Bagages
              </h2>
              <p className="mt-1 text-sm text-white/70 flex items-center">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                Tous les aéroports - Actualisation automatique toutes les 30s
                {lastUpdate && (
                  <span className="ml-2 text-white/50">
                    • Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-900/30 backdrop-blur-md border border-red-400/30 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Statistiques Litiges */}
        {disputeStats && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Bagages RUSH"
              value={disputeStats.totalBaggages}
              subtitle={`Aujourd'hui: ${disputeStats.todayRush}`}
              icon={Package}
              color="orange"
            />
            <StatCard
              title="En cours"
              value={disputeStats.rushBaggages}
              subtitle="Bagages en attente"
              icon={AlertTriangle}
              color="yellow"
            />
            <StatCard
              title="Non matchés"
              value={disputeStats.unmatchedBaggages}
              subtitle="À réconcilier"
              icon={Search}
              color="blue"
            />
            <StatCard
              title="Perdus"
              value={disputeStats.lostBaggages}
              subtitle="Déclarés perdus"
              icon={AlertCircle}
              color="red"
            />
          </div>
        )}

        {/* Section Derniers Bagages RUSH */}
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
              <div>
                <h3 className="text-xl font-bold text-white">Derniers Bagages RUSH</h3>
                <p className="text-sm text-white/60">Bagages nécessitant une attention</p>
              </div>
            </div>
            <a
              href="/baggages"
              className="inline-flex items-center px-4 py-2 border border-white/20 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-all"
            >
              Voir tous les bagages
            </a>
          </div>

          <div className="p-6">
            {rushBaggages.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-400/40 mx-auto mb-4" />
                <p className="text-white/60 text-lg">Aucun bagage RUSH en attente</p>
                <p className="text-white/40 text-sm mt-2">Tous les litiges sont résolus</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rushBaggages.map((baggage) => (
                  <div
                    key={baggage.id}
                    className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:border-orange-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-orange-500/20 rounded-lg">
                          <Package className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                          <p className="font-mono font-bold text-white">{baggage.tagNumber}</p>
                          <p className="text-sm text-white/60">{baggage.passengerName || 'Passager inconnu'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white/80">{baggage.flightNumber || 'Vol N/A'}</p>
                        <p className="text-xs text-white/50">
                          {baggage.declaredAt ? new Date(baggage.declaredAt).toLocaleDateString('fr-FR') : 'Date N/A'}
                        </p>
                      </div>
                    </div>
                    {baggage.reason && (
                      <p className="mt-2 text-sm text-orange-300/80 bg-orange-500/10 px-3 py-1 rounded">
                        {baggage.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions rapides */}
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Actions rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/baggages"
              className="flex items-center gap-3 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all"
            >
              <Package className="w-6 h-6 text-blue-400" />
              <div>
                <p className="font-medium text-white">Gérer les bagages</p>
                <p className="text-xs text-white/60">Voir et modifier les bagages</p>
              </div>
            </a>
            <a
              href="/passengers"
              className="flex items-center gap-3 p-4 bg-green-500/20 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-all"
            >
              <Users className="w-6 h-6 text-green-400" />
              <div>
                <p className="font-medium text-white">Rechercher passager</p>
                <p className="text-xs text-white/60">Trouver un passager par PNR</p>
              </div>
            </a>
            <a
              href="/audit-logs"
              className="flex items-center gap-3 p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-all"
            >
              <Clock className="w-6 h-6 text-purple-400" />
              <div>
                <p className="font-medium text-white">Historique</p>
                <p className="text-xs text-white/60">Voir les actions récentes</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Superviseur (par défaut)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-2">
              Dashboard - {user?.airport_code}
            </h2>
            <p className="mt-1 text-sm text-white/70 flex items-center">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Actualisation automatique toutes les 30s
              {lastUpdate && (
                <span className="ml-2 text-white/50">
                  • Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={syncRawScans}
              disabled={syncing}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Synchroniser
            </button>
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {syncMessage && (
        <div className="bg-green-900/30 backdrop-blur-md border border-green-500/30 rounded-lg p-4">
          <p className="text-green-300">{syncMessage}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 backdrop-blur-md border border-red-400/30 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Alertes */}
      <AlertsPanel />

      {/* Statistiques principales */}
      {stats && (
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
            subtitle={`${stats.uniqueFlights?.length || 0} vols uniques`}
            icon={Plane}
            color="blue"
          />
        </div>
      )}

      {/* Section Gestion des Vols */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Plane className="w-6 h-6 text-primary-400" />
            <div>
              <h3 className="text-xl font-bold text-white">Vols du jour</h3>
              <p className="text-sm text-white/60">{selectedDate}</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddFlightModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un vol
          </button>
        </div>

        <div className="p-6">
          {flightsWithStats.length === 0 ? (
            <div className="text-center py-12">
              <Plane className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 text-lg">Aucun vol programmé pour aujourd'hui</p>
              <button
                onClick={() => setShowAddFlightModal(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-white/20 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter le premier vol
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {flightsWithStats.map((flight) => (
                <div
                  key={flight.id}
                  className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-5 hover:border-white/30 transition-all"
                >
                  {/* En-tête du vol */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-xl font-bold text-white">{flight.flightNumber}</h4>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(flight.status)}`}>
                          {getStatusLabel(flight.status)}
                        </span>
                      </div>
                      <p className="text-sm text-white/60">{flight.airline}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteFlight(flight)}
                      className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-all"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Route */}
                  <div className="flex items-center gap-3 mb-4 text-white/80">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">{flight.departure}</span>
                    </div>
                    <div className="flex-1 border-t border-dashed border-white/20"></div>
                    <Plane className="w-4 h-4" />
                    <div className="flex-1 border-t border-dashed border-white/20"></div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{flight.arrival}</span>
                      <MapPin className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Heure */}
                  {flight.scheduledTime && (
                    <div className="flex items-center gap-2 mb-4 text-white/60">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{flight.scheduledTime}</span>
                    </div>
                  )}

                  {/* Statistiques */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{flight.stats.totalPassengers}</div>
                      <div className="text-xs text-white/50">Passagers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{flight.stats.boardedPassengers}</div>
                      <div className="text-xs text-white/50">Embarqués</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400">{flight.stats.totalBaggages}</div>
                      <div className="text-xs text-white/50">Bagages</div>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  {flight.stats.totalPassengers > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                        <span>Embarquement</span>
                        <span>{flight.stats.boardingProgress}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${flight.stats.boardingProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Restriction bagages */}
                  {flight.baggageRestriction === 'block' && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Bagages bloqués</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Ajout Vol */}
      {showAddFlightModal && (
        <FlightFormModal
          onClose={() => setShowAddFlightModal(false)}
          onSubmit={handleAddFlight}
          defaultDate={selectedDate}
          airportCode={user?.airport_code || 'FIH'}
        />
      )}
    </div>
  );
}
