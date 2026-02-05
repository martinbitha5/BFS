import {
    AlertCircle,
    AlertTriangle,
    Briefcase,
    Calendar,
    Check,
    CheckCircle,
    Clock,
    FileText,
    Filter,
    Loader2,
    Luggage,
    MapPin,
    Package,
    Plane,
    Plus,
    RefreshCw,
    Search,
    Tag,
    TrendingUp,
    User,
    Users as UsersIcon,
    X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import api from '../config/api';

interface GlobalStats {
  totalBaggages: number;
  arrivedBaggages: number;
  inTransitBaggages: number;
  todayBaggages: number;
}

interface Baggage {
  id: string;
  tag_number: string;
  status: string;
  weight: number | null;
  flight_number: string | null;
  airport_code: string;
  checked_at: string | null;
  arrived_at: string | null;
  created_at: string;
  passengers?: {
    full_name: string;
    pnr: string;
    flight_number: string;
    departure: string;
    arrival: string;
  } | null;
}

interface RushBaggage {
  id: string;
  tag_number: string;
  flight_number: string;
  status: string;
  origin_airport: string;
  destination_airport: string;
  created_at: string;
  passengers?: {
    full_name: string;
    pnr: string;
  } | null;
}

interface PassengerBaggage {
  id: string;
  tag_number: string;
  status: string;
  weight?: number;
  created_at?: string;
}

interface Passenger {
  id: string;
  fullName: string;
  pnr: string;
  flightNumber: string;
  seatNumber?: string;
  class?: string;
  departure: string;
  arrival: string;
  airportCode: string;
  baggageCount: number;
  checkedInAt?: string;
  baggages?: PassengerBaggage[];
  created_at?: string;
}

type Tab = 'overview' | 'all-baggages' | 'rush' | 'passengers' | 'disputes';
type StatusFilter = 'all' | 'checked' | 'loaded' | 'in_transit' | 'arrived' | 'delivered' | 'rush' | 'unmatched';
type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'specific' | 'custom';

// Fonction helper pour formater une date en YYYY-MM-DD
const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Fonction helper pour obtenir les dates de filtrage selon le filtre sélectionné
const getDateRangeFromFilter = (
  filter: DateFilter,
  specificDate: string,
  customStart: string,
  customEnd: string
): { date_from?: string; date_to?: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (filter) {
    case 'today':
      return { date_from: formatDateForAPI(today), date_to: formatDateForAPI(today) };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { date_from: formatDateForAPI(yesterday), date_to: formatDateForAPI(yesterday) };
    }
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { date_from: formatDateForAPI(weekAgo), date_to: formatDateForAPI(today) };
    }
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { date_from: formatDateForAPI(monthAgo), date_to: formatDateForAPI(today) };
    }
    case 'specific':
      if (specificDate) {
        return { date_from: specificDate, date_to: specificDate };
      }
      return {};
    case 'custom': {
      const result: { date_from?: string; date_to?: string } = {};
      if (customStart) result.date_from = customStart;
      if (customEnd) result.date_to = customEnd;
      return result;
    }
    default:
      return {};
  }
};

export default function BaggageDispute() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [rushBaggages, setRushBaggages] = useState<RushBaggage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [airportFilter, setAirportFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [specificDate, setSpecificDate] = useState('');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');

  // State pour la gestion des passagers
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [passengersLoading, setPassengersLoading] = useState(false);
  const [passengerSearchTerm, setPassengerSearchTerm] = useState('');
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [showBaggageModal, setShowBaggageModal] = useState(false);
  const [addingBaggage, setAddingBaggage] = useState(false);
  const [newBaggageTag, setNewBaggageTag] = useState('');
  const [newBaggageWeight, setNewBaggageWeight] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passengerError, setPassengerError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError('');
      setLoading(true);

      const token = localStorage.getItem('bfs_litige_token');
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      // Récupérer toutes les données en parallèle (accès à tous les aéroports)
      // Note: L'intercepteur ajoute automatiquement airport=ALL pour les utilisateurs baggage_dispute
      const errors: string[] = [];
      
      // Calculer les paramètres de date
      const dateParams = getDateRangeFromFilter(dateFilter, specificDate, customDateStart, customDateEnd);
      
      const [statsRes, baggagesRes, rushRes] = await Promise.all([
        api.get('/api/v1/stats/global').catch((err) => {
          const msg = err?.response?.data?.error || err.message;
          console.warn('Erreur stats:', msg);
          errors.push(`Stats: ${msg}`);
          return { data: { data: { totalBaggages: 0, arrivedBaggages: 0, inTransitBaggages: 0, todayBaggages: 0 } } };
        }),
        api.get('/api/v1/baggage', { params: dateParams }).catch((err) => {
          const msg = err?.response?.data?.error || err.message;
          console.warn('Erreur bagages:', msg);
          errors.push(`Bagages: ${msg}`);
          return { data: { data: [] } };
        }),
        api.get('/api/v1/rush/recent').catch((err) => {
          const msg = err?.response?.data?.error || err.message;
          console.warn('Erreur rush:', msg);
          errors.push(`Rush: ${msg}`);
          return { data: { data: [] } };
        })
      ]);
      
      // Afficher les erreurs si présentes
      if (errors.length > 0) {
        console.error('Erreurs de chargement:', errors);
        setError(`Erreurs de chargement: ${errors.join(', ')}`);
      }

      const statsData = (statsRes.data as { data: GlobalStats }).data;
      const baggagesData = (baggagesRes.data as { data: Baggage[] }).data || [];
      const rushData = (rushRes.data as { data: RushBaggage[] }).data || [];

      setStats(statsData);
      setBaggages(baggagesData);
      setRushBaggages(rushData);
      
      setLastUpdate(new Date());
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      console.error('Erreur fetchData:', err);
      setError(error.response?.data?.error || error.message || 'Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, specificDate, customDateStart, customDateEnd]);

  // Fonction pour récupérer les passagers
  const fetchPassengers = useCallback(async () => {
    try {
      setPassengersLoading(true);
      setPassengerError(null);
      const token = localStorage.getItem('bfs_litige_token');
      const response = await api.get('/api/v1/passengers/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = response.data as { success: boolean; data: Passenger[] };
      if (data.success && Array.isArray(data.data)) {
        setPassengers(data.data);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setPassengerError(error.response?.data?.error || 'Erreur lors du chargement des passagers');
    } finally {
      setPassengersLoading(false);
    }
  }, []);

  const handleOpenBaggageModal = (passenger: Passenger) => {
    setSelectedPassenger(passenger);
    setShowBaggageModal(true);
    setNewBaggageTag('');
    setNewBaggageWeight('');
    setPassengerError(null);
  };

  const handleCloseBaggageModal = () => {
    setShowBaggageModal(false);
    setSelectedPassenger(null);
    setNewBaggageTag('');
    setNewBaggageWeight('');
  };

  const handleAddBaggage = async () => {
    if (!selectedPassenger || !newBaggageTag.trim()) {
      setPassengerError('Veuillez entrer un numéro de tag');
      return;
    }

    try {
      setAddingBaggage(true);
      setPassengerError(null);

      const token = localStorage.getItem('bfs_litige_token');
      // Utiliser la route support spécifique qui ne vérifie pas les limites
      const response = await api.post('/api/v1/support/baggages/create', {
        passengerId: selectedPassenger.id,
        tag_number: newBaggageTag.trim(),
        weight: newBaggageWeight ? parseFloat(newBaggageWeight) : null,
        status: 'checked'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = response.data as { success: boolean; data: PassengerBaggage };
      if (data.success) {
        const addedTag = newBaggageTag;
        setSuccessMessage(`Bagage ${addedTag} ajouté à ${selectedPassenger.fullName}`);
        setNewBaggageTag('');
        setNewBaggageWeight('');
        
        // Ajouter le nouveau bagage localement au passager sélectionné
        const newBaggage: PassengerBaggage = {
          id: data.data?.id || Date.now().toString(),
          tag_number: addedTag,
          status: 'checked',
          weight: newBaggageWeight ? parseFloat(newBaggageWeight) : undefined
        };
        
        setSelectedPassenger(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            baggages: [...(prev.baggages || []), newBaggage]
          };
        });
        
        // Rafraîchir la liste complète en arrière-plan
        fetchPassengers();
        
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = error.response?.data?.error || 'Erreur lors de l\'ajout du bagage';
      setPassengerError(errorMessage);
    } finally {
      setAddingBaggage(false);
    }
  };

  // Filtrer les passagers par recherche
  const filteredPassengers = passengers.filter(p =>
    p.fullName?.toLowerCase().includes(passengerSearchTerm.toLowerCase()) ||
    p.pnr?.toLowerCase().includes(passengerSearchTerm.toLowerCase()) ||
    p.flightNumber?.toLowerCase().includes(passengerSearchTerm.toLowerCase()) ||
    p.airportCode?.toLowerCase().includes(passengerSearchTerm.toLowerCase())
  );

  // Trier par date de création (plus récent en premier)
  const sortedPassengers = [...filteredPassengers].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  // Charger les passagers quand on passe à l'onglet passagers
  useEffect(() => {
    if (activeTab === 'passengers' && passengers.length === 0) {
      fetchPassengers();
    }
  }, [activeTab, fetchPassengers, passengers.length]);

  // Recharger les données quand les filtres de date changent
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Rafraîchissement automatique toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filtrer les bagages (le filtrage par date se fait côté serveur)
  const filteredBaggages = baggages.filter(b => {
    const matchSearch = !searchTerm || 
      b.tag_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.passengers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.passengers?.pnr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.flight_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchAirport = !airportFilter || b.airport_code === airportFilter;
    
    return matchSearch && matchStatus && matchAirport;
  });

  // Obtenir les aéroports uniques
  const uniqueAirports = [...new Set(baggages.map(b => b.airport_code))].sort();

  // Stats par statut (tous les statuts du tracking)
  const statusCounts = {
    checked: baggages.filter(b => b.status === 'checked' || b.status === 'scanned').length,
    loaded: baggages.filter(b => b.status === 'loaded').length,
    in_transit: baggages.filter(b => b.status === 'in_transit').length,
    arrived: baggages.filter(b => b.status === 'arrived' || b.status === 'reconciled').length,
    delivered: baggages.filter(b => b.status === 'delivered').length,
    rush: rushBaggages.length,
    unmatched: baggages.filter(b => b.status === 'unmatched' || b.status === 'lost').length
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'checked':
      case 'scanned':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'loaded':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'in_transit':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'arrived':
      case 'reconciled':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'delivered':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'rush':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'unmatched':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'lost':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'pending':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: 
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'checked': return 'Enregistré';
      case 'scanned': return 'Scanné';
      case 'loaded': return 'Chargé';
      case 'in_transit': return 'En transit';
      case 'arrived': return 'Arrivé';
      case 'reconciled': return 'Réconcilié';
      case 'delivered': return 'Livré';
      case 'rush': return 'Rush';
      case 'unmatched': return 'Non apparié';
      case 'lost': return 'En recherche';
      case 'pending': return 'En attente';
      default: return status || 'Inconnu';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'checked':
      case 'scanned':
        return Package;
      case 'loaded':
        return Plane;
      case 'in_transit':
        return Clock;
      case 'arrived':
      case 'reconciled':
      case 'delivered':
        return CheckCircle;
      case 'rush':
        return AlertTriangle;
      case 'unmatched':
      case 'lost':
        return AlertTriangle;
      default:
        return Package;
    }
  };

  if (loading && !stats) {
    return <LoadingPlane text="Chargement des données bagages..." size="lg" />;
  }

  // Couleurs et labels pour les statuts de bagages (pour la modal passagers)
  const BAGGAGE_STATUS_COLORS: Record<string, string> = {
    checked: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    loaded: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    in_transit: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    arrived: 'bg-green-500/20 text-green-300 border-green-500/30',
    delivered: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    rush: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    lost: 'bg-red-500/20 text-red-300 border-red-500/30',
  };

  const BAGGAGE_STATUS_LABELS: Record<string, string> = {
    checked: 'Enregistré',
    loaded: 'Chargé',
    in_transit: 'En transit',
    arrived: 'Arrivé',
    delivered: 'Livré',
    rush: 'Rush',
    lost: 'Perdu',
  };

  const tabs = [
    { id: 'overview' as Tab, label: 'Vue d\'ensemble', icon: TrendingUp },
    { id: 'all-baggages' as Tab, label: 'Tous les bagages', icon: Luggage, badge: baggages.length },
    { id: 'rush' as Tab, label: 'Rush / Prioritaires', icon: AlertTriangle, badge: rushBaggages.length },
    { id: 'passengers' as Tab, label: 'Passagers', icon: UsersIcon, badge: passengers.length > 0 ? passengers.length : undefined },
    { id: 'disputes' as Tab, label: 'Réclamations', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Luggage className="w-7 h-7 text-purple-400" />
            Suivi Global des Bagages
          </h1>
          <p className="text-sm text-white/60">
            Visualisation et gestion des bagages - Toutes stations
            {lastUpdate && (
              <span className="ml-2 inline-flex items-center gap-1">
                • <Clock className="w-3 h-3" /> {lastUpdate.toLocaleTimeString('fr-FR')}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-black/30 border border-white/10 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-white/60">En direct</span>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5 hover:border-purple-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Package className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalBaggages}</p>
                  <p className="text-sm text-white/60">Bagages totaux</p>
                  <p className="text-xs text-purple-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +{stats.todayBaggages} aujourd'hui
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5 hover:border-green-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.arrivedBaggages}</p>
                  <p className="text-sm text-white/60">Arrivés / Livrés</p>
                  <p className="text-xs text-green-400">
                    {stats.totalBaggages > 0 ? Math.round((stats.arrivedBaggages / stats.totalBaggages) * 100) : 0}% du total
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5 hover:border-yellow-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.inTransitBaggages}</p>
                  <p className="text-sm text-white/60">En transit</p>
                  <p className="text-xs text-yellow-400">En cours d'acheminement</p>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5 hover:border-orange-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{rushBaggages.length}</p>
                  <p className="text-sm text-white/60">Rush bagages</p>
                  <p className="text-xs text-orange-400">Réacheminement prioritaire</p>
                </div>
              </div>
            </div>
          </div>

          {/* Répartition par statut et par station */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Par statut */}
            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-400" />
                  Répartition par statut
                </h3>
              </div>
              <div className="space-y-2">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const StatusIcon = getStatusIcon(status);
                  const percentage = stats.totalBaggages > 0 ? Math.round((count / stats.totalBaggages) * 100) : 0;
                  return (
                    <div 
                      key={status} 
                      className="flex items-center justify-between p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setActiveTab('all-baggages');
                        setStatusFilter(status as StatusFilter);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`w-4 h-4 ${getStatusColor(status).includes('green') ? 'text-green-400' : 
                          getStatusColor(status).includes('yellow') ? 'text-yellow-400' : 
                          getStatusColor(status).includes('orange') ? 'text-orange-400' : 
                          getStatusColor(status).includes('blue') ? 'text-blue-400' : 
                          getStatusColor(status).includes('red') ? 'text-red-400' : 
                          getStatusColor(status).includes('indigo') ? 'text-indigo-400' : 
                          getStatusColor(status).includes('emerald') ? 'text-emerald-400' : 'text-gray-400'}`} />
                        <span className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${getStatusColor(status).replace('/20', '/60').replace('text-', 'bg-').split(' ')[0]}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-white font-bold min-w-[40px] text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Par station */}
            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-400" />
                  Répartition par station
                </h3>
                <span className="text-xs text-white/50">{uniqueAirports.length} stations</span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {uniqueAirports.map(airport => {
                  const count = baggages.filter(b => b.airport_code === airport).length;
                  const percentage = baggages.length > 0 ? Math.round((count / baggages.length) * 100) : 0;
                  return (
                    <div 
                      key={airport} 
                      className="flex items-center justify-between p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setActiveTab('all-baggages');
                        setAirportFilter(airport);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Plane className="w-4 h-4 text-purple-400" />
                        <span className="text-white font-medium">{airport}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500/60 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-white font-bold min-w-[40px] text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
                {uniqueAirports.length === 0 && (
                  <p className="text-center text-white/50 py-4">Aucune station</p>
                )}
              </div>
            </div>
          </div>

          {/* Statistiques du jour */}
          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Activité du jour
              </h3>
              <span className="text-sm text-white/50">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-black/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{stats.todayBaggages}</p>
                <p className="text-sm text-white/60">Nouveaux bagages</p>
              </div>
              <div className="bg-black/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-400">
                  {baggages.filter(b => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return b.arrived_at && new Date(b.arrived_at) >= today;
                  }).length}
                </p>
                <p className="text-sm text-white/60">Arrivés aujourd'hui</p>
              </div>
              <div className="bg-black/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-yellow-400">{statusCounts.in_transit}</p>
                <p className="text-sm text-white/60">En transit</p>
              </div>
              <div className="bg-black/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-orange-400">{rushBaggages.length}</p>
                <p className="text-sm text-white/60">Rush actifs</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Baggages Tab */}
      {activeTab === 'all-baggages' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-4 space-y-4">
            {/* Première ligne: Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Rechercher par tag, PNR, nom, vol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* Deuxième ligne: Filtres */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filtre par statut */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full pl-10 pr-8 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="checked">Enregistré</option>
                  <option value="loaded">Chargé</option>
                  <option value="in_transit">En transit</option>
                  <option value="arrived">Arrivé</option>
                  <option value="delivered">Livré</option>
                  <option value="rush">Rush</option>
                  <option value="unmatched">Non apparié</option>
                </select>
              </div>

              {/* Filtre par station/aéroport */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <select
                  value={airportFilter}
                  onChange={(e) => setAirportFilter(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
                >
                  <option value="">Toutes les stations</option>
                  {uniqueAirports.map(airport => (
                    <option key={airport} value={airport}>{airport}</option>
                  ))}
                </select>
              </div>

              {/* Filtre par période */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  className="w-full pl-10 pr-8 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
                >
                  <option value="all">Toutes les périodes</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="yesterday">Hier</option>
                  <option value="week">7 derniers jours</option>
                  <option value="month">30 derniers jours</option>
                  <option value="specific">Jour spécifique</option>
                  <option value="custom">Période personnalisée</option>
                </select>
              </div>

              {/* Bouton reset */}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setAirportFilter('');
                  setDateFilter('all');
                  setSpecificDate('');
                  setCustomDateStart('');
                  setCustomDateEnd('');
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Réinitialiser
              </button>
            </div>

            {/* Sélection jour spécifique */}
            {dateFilter === 'specific' && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/10">
                <div className="flex-1">
                  <label className="block text-xs text-white/50 mb-1">Sélectionner une date</label>
                  <input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div className="flex-1 flex items-end">
                  <p className="text-sm text-white/50 pb-2">
                    {specificDate ? `Bagages du ${new Date(specificDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : 'Choisissez une date pour voir les bagages de ce jour'}
                  </p>
                </div>
              </div>
            )}

            {/* Dates personnalisées */}
            {dateFilter === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/10">
                <div className="flex-1">
                  <label className="block text-xs text-white/50 mb-1">Date de début</label>
                  <input
                    type="date"
                    value={customDateStart}
                    onChange={(e) => setCustomDateStart(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-white/50 mb-1">Date de fin</label>
                  <input
                    type="date"
                    value={customDateEnd}
                    onChange={(e) => setCustomDateEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Results count and active filters */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm text-white/60">
                <span className="font-bold text-white">{filteredBaggages.length}</span> bagage(s) trouvé(s)
              </p>
              {/* Afficher les filtres actifs */}
              {(statusFilter !== 'all' || airportFilter || dateFilter !== 'all') && (
                <div className="flex flex-wrap gap-1">
                  {statusFilter !== 'all' && (
                    <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full">
                      {getStatusLabel(statusFilter)}
                    </span>
                  )}
                  {airportFilter && (
                    <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-full">
                      {airportFilter}
                    </span>
                  )}
                  {dateFilter !== 'all' && (
                    <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-300 rounded-full">
                      {dateFilter === 'today' ? "Aujourd'hui" : 
                       dateFilter === 'yesterday' ? 'Hier' : 
                       dateFilter === 'week' ? '7 jours' : 
                       dateFilter === 'month' ? '30 jours' : 
                       dateFilter === 'specific' ? (specificDate ? new Date(specificDate).toLocaleDateString('fr-FR') : 'Jour spécifique') :
                       'Personnalisé'}
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-white/40">
              sur {baggages.length} bagages au total
            </p>
          </div>

          {/* Baggages list */}
          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/40 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Tag</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Passager</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Vol</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Station</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Poids</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBaggages.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Package className="w-12 h-12 text-white/20 mx-auto mb-3" />
                        <p className="text-white/50">Aucun bagage ne correspond à vos critères</p>
                        <p className="text-sm text-white/30 mt-1">Modifiez vos filtres pour voir plus de résultats</p>
                      </td>
                    </tr>
                  ) : (
                    filteredBaggages.slice(0, 100).map((b) => {
                      const StatusIcon = getStatusIcon(b.status);
                      return (
                        <tr key={b.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-4 py-3">
                            <span className="text-sm font-mono text-white bg-black/30 px-2 py-1 rounded">
                              {b.tag_number || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm text-white font-medium">{b.passengers?.full_name || 'Non assigné'}</p>
                              {b.passengers?.pnr && (
                                <p className="text-xs text-white/50 font-mono">{b.passengers.pnr}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Plane className="w-3 h-3 text-white/40" />
                              <span className="text-sm text-white/70">{b.flight_number || b.passengers?.flight_number || '-'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-white/70 font-medium">{b.airport_code}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`w-4 h-4 ${
                                b.status === 'arrived' || b.status === 'delivered' || b.status === 'reconciled' ? 'text-green-400' :
                                b.status === 'in_transit' ? 'text-yellow-400' :
                                b.status === 'rush' ? 'text-orange-400' :
                                b.status === 'unmatched' || b.status === 'lost' ? 'text-red-400' :
                                'text-blue-400'
                              }`} />
                              <span className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(b.status)}`}>
                                {getStatusLabel(b.status)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-white/50">
                            {b.weight ? `${b.weight} kg` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              <p className="text-white/70">
                                {b.created_at ? new Date(b.created_at).toLocaleDateString('fr-FR') : '-'}
                              </p>
                              <p className="text-xs text-white/40">
                                {b.created_at ? new Date(b.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredBaggages.length > 100 && (
              <div className="px-4 py-3 bg-black/40 border-t border-white/10">
                <p className="text-sm text-white/50 text-center">
                  Affichage limité à 100 résultats sur {filteredBaggages.length}. Utilisez les filtres pour affiner votre recherche.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rush Baggages Tab */}
      {activeTab === 'rush' && (
        <div className="space-y-4">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <p className="text-orange-300 font-medium">Bagages Rush / Prioritaires</p>
              </div>
              <span className="px-3 py-1 text-lg font-bold bg-orange-500/20 text-orange-300 rounded-lg">
                {rushBaggages.length}
              </span>
            </div>
            <p className="text-sm text-white/60 mt-2">
              Bagages déclarés en urgence nécessitant un réacheminement prioritaire vers leur destination.
            </p>
          </div>

          {/* Filtre par station pour les rush */}
          {rushBaggages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAirportFilter('')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  !airportFilter 
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                    : 'bg-black/30 text-white/60 border border-white/10 hover:bg-white/10'
                }`}
              >
                Toutes les stations
              </button>
              {[...new Set(rushBaggages.map(r => r.destination_airport))].sort().map(airport => (
                <button
                  key={airport}
                  onClick={() => setAirportFilter(airport)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    airportFilter === airport 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'bg-black/30 text-white/60 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {airport} ({rushBaggages.filter(r => r.destination_airport === airport).length})
                </button>
              ))}
            </div>
          )}

          {rushBaggages.length === 0 ? (
            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-white font-medium">Aucun rush bagage en cours</p>
              <p className="text-sm text-white/50 mt-1">Tous les bagages sont acheminés normalement</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rushBaggages
                .filter(rush => !airportFilter || rush.destination_airport === airportFilter)
                .map((rush) => (
                <div key={rush.id} className="bg-black/30 backdrop-blur border border-orange-500/30 rounded-xl p-4 hover:border-orange-400/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono font-bold text-white text-lg">{rush.tag_number}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Plane className="w-3 h-3 text-white/40" />
                        <p className="text-sm text-white/50">{rush.flight_number}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Rush
                    </span>
                  </div>
                  <div className="space-y-2 text-sm border-t border-white/10 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/50">Passager</span>
                      <span className="text-white font-medium">{rush.passengers?.full_name || 'N/A'}</span>
                    </div>
                    {rush.passengers?.pnr && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/50">PNR</span>
                        <span className="text-white/70 font-mono">{rush.passengers.pnr}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-white/50">Route</span>
                      <span className="text-white flex items-center gap-1">
                        <span className="font-medium">{rush.origin_airport}</span>
                        <Plane className="w-3 h-3 rotate-90 text-orange-400" />
                        <span className="font-medium text-orange-300">{rush.destination_airport}</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-white/50">Déclaré le</span>
                      <span className="text-white/70 text-xs">
                        {new Date(rush.created_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Passengers Tab */}
      {activeTab === 'passengers' && (
        <div className="space-y-6">
          {/* Success Message */}
          {successMessage && (
            <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
              <Check className="w-5 h-5" />
              {successMessage}
              <button onClick={() => setSuccessMessage(null)} className="ml-2 hover:bg-green-600 rounded p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {passengerError && (
            <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {passengerError}
              <button onClick={() => setPassengerError(null)} className="ml-2 hover:bg-red-600 rounded p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <UsersIcon className="w-6 h-6 text-purple-400" />
                Gestion des Passagers - Toutes Stations
              </h2>
              <p className="text-sm text-white/60">
                {filteredPassengers.length} passager(s) • Ajouter des bagages supplémentaires
              </p>
            </div>
          </div>

          {/* Search and Refresh */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Rechercher par nom, PNR, vol ou aéroport..."
                value={passengerSearchTerm}
                onChange={(e) => setPassengerSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <button
              onClick={fetchPassengers}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${passengersLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Passengers List */}
          {passengersLoading && passengers.length === 0 ? (
            <LoadingPlane text="Chargement des passagers..." size="lg" />
          ) : (
            <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
              {sortedPassengers.length === 0 ? (
                <div className="text-center py-12 text-white/60">
                  <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Aucun passager trouvé</p>
                  <p className="text-sm">Essayez une autre recherche</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {sortedPassengers.slice(0, 100).map(passenger => (
                    <div
                      key={passenger.id}
                      className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => handleOpenBaggageModal(passenger)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <User className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{passenger.fullName}</h3>
                            <div className="flex items-center gap-3 text-white/60 text-sm">
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3" /> {passenger.pnr || 'N/A'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Plane className="w-3 h-3" /> {passenger.flightNumber}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-white/50 text-xs">
                                {passenger.departure} → {passenger.arrival}
                              </span>
                              <span className="text-white/50 text-xs px-2 py-0.5 bg-purple-500/20 rounded">
                                {passenger.airportCode}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-2 text-white">
                              <Briefcase className="w-4 h-4 text-amber-400" />
                              <span className="font-bold text-lg">
                                {passenger.baggages?.length || 0}
                              </span>
                              <span className="text-white/50 text-sm">
                                / {passenger.baggageCount} déclaré(s)
                              </span>
                            </div>
                            <p className="text-xs text-white/40">
                              {passenger.checkedInAt ? 'Enregistré' : 'Non enregistré'}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenBaggageModal(passenger);
                            }}
                            className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                            title="Ajouter un bagage"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {sortedPassengers.length > 100 && (
                <div className="p-4 text-center text-white/50 text-sm border-t border-white/10">
                  Affichage des 100 premiers résultats. Utilisez la recherche pour affiner.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Baggage Modal */}
      {showBaggageModal && selectedPassenger && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-white/20 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-amber-400" />
                  Bagages de {selectedPassenger.fullName}
                </h2>
                <p className="text-sm text-white/60">
                  {selectedPassenger.pnr} • Vol {selectedPassenger.flightNumber} • {selectedPassenger.airportCode}
                </p>
              </div>
              <button onClick={handleCloseBaggageModal} className="text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Info passager */}
              <div className="bg-white/5 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/50">Trajet</span>
                    <p className="text-white font-medium">
                      {selectedPassenger.departure} → {selectedPassenger.arrival}
                    </p>
                  </div>
                  <div>
                    <span className="text-white/50">Aéroport</span>
                    <p className="text-white font-medium">{selectedPassenger.airportCode}</p>
                  </div>
                  <div>
                    <span className="text-white/50">Siège</span>
                    <p className="text-white font-medium">{selectedPassenger.seatNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-white/50">Classe</span>
                    <p className="text-white font-medium">{selectedPassenger.class || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Liste des bagages existants */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Bagages actuels ({selectedPassenger.baggages?.length || 0} / {selectedPassenger.baggageCount} déclaré)
                </h3>
                {selectedPassenger.baggages && selectedPassenger.baggages.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPassenger.baggages.map((bag, index) => (
                      <div
                        key={bag.id}
                        className="bg-white/5 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-white font-mono">{bag.tag_number}</p>
                            {bag.weight && (
                              <p className="text-white/50 text-xs">{bag.weight} kg</p>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs border ${BAGGAGE_STATUS_COLORS[bag.status] || 'bg-gray-500/20 text-gray-300'}`}>
                          {BAGGAGE_STATUS_LABELS[bag.status] || bag.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/5 rounded-lg p-6 text-center text-white/50">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun bagage enregistré</p>
                  </div>
                )}
              </div>

              {/* Formulaire d'ajout de bagage */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-400" />
                  Ajouter un bagage supplémentaire
                </h3>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Tag RFID *</label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                        <input
                          type="text"
                          value={newBaggageTag}
                          onChange={(e) => setNewBaggageTag(e.target.value.toUpperCase())}
                          className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 font-mono"
                          placeholder="0012345678"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Poids (kg)</label>
                      <input
                        type="number"
                        value={newBaggageWeight}
                        onChange={(e) => setNewBaggageWeight(e.target.value)}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                        placeholder="23"
                        min="0"
                        max="50"
                        step="0.1"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddBaggage}
                    disabled={addingBaggage || !newBaggageTag.trim()}
                    className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {addingBaggage ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Ajout en cours...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Ajouter le bagage
                      </>
                    )}
                  </button>
                  <p className="text-white/50 text-xs mt-2 text-center">
                    Le bagage sera lié automatiquement à ce passager
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex justify-end shrink-0">
              <button
                onClick={handleCloseBaggageModal}
                className="px-5 py-2 text-white/60 hover:text-white transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disputes Tab */}
      {activeTab === 'disputes' && (
        <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-8 text-center">
          <FileText className="w-12 h-12 text-purple-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Module Litiges</h3>
          <p className="text-white/60">
            Le module de gestion des litiges sera disponible prochainement.
          </p>
          <p className="text-sm text-white/40 mt-2">
            Ce module permettra de créer, suivre et résoudre les réclamations des passagers concernant leurs bagages.
          </p>
        </div>
      )}
    </div>
  );
}
