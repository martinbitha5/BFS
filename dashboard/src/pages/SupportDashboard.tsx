import {
    AlertCircle,
    Briefcase,
    Building2,
    Check,
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    Key,
    LogOut,
    Mail,
    MapPin,
    Plane,
    Plus,
    RefreshCw,
    Search,
    Settings,
    Trash2,
    User,
    Users,
    X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

// Types
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

interface UserData {
  id: string;
  email: string;
  full_name: string;
  airport_code: string;
  role: 'supervisor' | 'baggage_dispute' | 'support';
  is_approved?: boolean;
  created_at?: string;
}

interface Airline {
  id: string;
  name: string;
  code: string;
  email: string;
  is_approved: boolean;
  created_at: string;
}

interface AirlineRequest {
  id: string;
  name: string;
  code: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Liste des aéroports
const AIRPORTS = [
  { code: 'FIH', name: 'Kinshasa N\'Djili' },
  { code: 'FBM', name: 'Lubumbashi' },
  { code: 'KND', name: 'Kindu' },
  { code: 'FKI', name: 'Kisangani' },
  { code: 'GOM', name: 'Goma' },
  { code: 'BKY', name: 'Bukavu' },
  { code: 'MJM', name: 'Mbuji-Mayi' },
  { code: 'KWZ', name: 'Kolwezi' },
  { code: 'FDU', name: 'Bandundu' },
  { code: 'MDK', name: 'Mbandaka' },
  { code: 'BDT', name: 'Gbadolite' },
  { code: 'KGA', name: 'Kananga' },
  { code: 'LJA', name: 'Lodja' },
  { code: 'IKL', name: 'Ikela' },
  { code: 'TSH', name: 'Tshikapa' },
  { code: 'BZU', name: 'Bunia' },
  { code: 'IRP', name: 'Isiro' },
  { code: 'ADD', name: 'Addis Ababa' },
  { code: 'NBO', name: 'Nairobi' },
  { code: 'JNB', name: 'Johannesburg' },
];

export default function SupportDashboard() {
  const { user, logout } = useAuth();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [pendingAirlineRequests, setPendingAirlineRequests] = useState<AirlineRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'airlines' | 'passengers' | 'settings'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAirport, setSelectedAirport] = useState<string>('all');
  const [airports, setAirports] = useState<string[]>([]);

  // Modal states
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateAirlineModal, setShowCreateAirlineModal] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [showAddBaggage, setShowAddBaggage] = useState(false);
  const [newBaggageTag, setNewBaggageTag] = useState('');
  const [newBaggageWeight, setNewBaggageWeight] = useState('');

  // Create user form
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'supervisor' as 'supervisor' | 'baggage_dispute',
    airport_code: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // Create airline form
  const [newAirline, setNewAirline] = useState({
    name: '',
    code: '',
    email: '',
    password: ''
  });
  const [creatingAirline, setCreatingAirline] = useState(false);

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    stats: true,
    pendingApprovals: true
  });

  // Check access
  useEffect(() => {
    if (user && user.role !== 'support') {
      setError('Accès refusé. Cette page est réservée au support.');
    }
  }, [user]);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('bfs_token');
      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch passengers from ALL airports
      try {
        const passResponse = await api.get('/api/v1/passengers/all', { headers });
        const passData = passResponse.data as ApiResponse<Passenger[]>;
        if (passData.success && Array.isArray(passData.data)) {
          setPassengers(passData.data);
          const uniqueAirports = [...new Set(passData.data.map(p => p.airportCode).filter(Boolean))];
          setAirports(uniqueAirports.sort());
        }
      } catch (e) {
        console.warn('Erreur chargement passagers:', e);
        setPassengers([]);
      }

      // Fetch all users
      try {
        const usersResponse = await api.get('/api/v1/support/users/all', { headers });
        const usersData = usersResponse.data as ApiResponse<UserData[]>;
        if (usersData.success && Array.isArray(usersData.data)) {
          setUsers(usersData.data);
        }
      } catch (e) {
        console.warn('Erreur chargement utilisateurs:', e);
        setUsers([]);
      }

      // Fetch all airlines
      try {
        const airlinesResponse = await api.get('/api/v1/airlines', { headers });
        const airlinesData = airlinesResponse.data as ApiResponse<Airline[]>;
        if (airlinesData.success && Array.isArray(airlinesData.data)) {
          setAirlines(airlinesData.data);
        }
      } catch (e) {
        console.warn('Erreur chargement compagnies:', e);
        setAirlines([]);
      }

      // Fetch pending airline requests
      try {
        const pendingResponse = await api.get('/api/v1/airline-approval/requests?status=pending', { headers });
        const pendingData = pendingResponse.data as ApiResponse<AirlineRequest[]>;
        if (pendingData.success && Array.isArray(pendingData.data)) {
          setPendingAirlineRequests(pendingData.data);
        }
      } catch (e) {
        console.warn('Erreur chargement demandes compagnies:', e);
        setPendingAirlineRequests([]);
      }

    } catch (err: any) {
      console.error('Erreur chargement données:', err);
      setError(err.response?.data?.error || err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Create dashboard user
  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name || !newUser.role) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (newUser.role === 'supervisor' && !newUser.airport_code) {
      setError('Le code aéroport est requis pour les superviseurs');
      return;
    }

    try {
      setCreatingUser(true);
      setError(null);

      const token = localStorage.getItem('bfs_token');
      const response = await api.post('/api/v1/users/create-by-support', {
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.full_name,
        role: newUser.role,
        airport_code: newUser.role === 'baggage_dispute' ? 'ALL' : newUser.airport_code
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = response.data as ApiResponse<UserData>;
      if (data.success) {
        setSuccessMessage(`Utilisateur "${newUser.full_name}" créé avec succès !`);
        setShowCreateUserModal(false);
        setNewUser({ email: '', password: '', full_name: '', role: 'supervisor', airport_code: '' });
        fetchAllData();
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(data.error || 'Erreur lors de la création');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la création de l\'utilisateur');
    } finally {
      setCreatingUser(false);
    }
  };

  // Create airline
  const handleCreateAirline = async () => {
    if (!newAirline.name || !newAirline.code || !newAirline.email || !newAirline.password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setCreatingAirline(true);
      setError(null);

      const token = localStorage.getItem('bfs_token');
      const response = await api.post('/api/v1/airlines/create-by-support', {
        name: newAirline.name,
        code: newAirline.code.toUpperCase(),
        email: newAirline.email,
        password: newAirline.password
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = response.data as ApiResponse<Airline>;
      if (data.success) {
        setSuccessMessage(`Compagnie "${newAirline.name}" créée avec succès !`);
        setShowCreateAirlineModal(false);
        setNewAirline({ name: '', code: '', email: '', password: '' });
        fetchAllData();
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(data.error || 'Erreur lors de la création');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la création de la compagnie');
    } finally {
      setCreatingAirline(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('bfs_token');
      await api.delete(`/api/v1/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccessMessage(`Utilisateur "${userName}" supprimé`);
      fetchAllData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  // Approve airline
  const handleApproveAirline = async (airlineId: string) => {
    try {
      const token = localStorage.getItem('bfs_token');
      await api.post(`/api/v1/airline-approval/requests/${airlineId}/approve`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccessMessage('Compagnie approuvée !');
      fetchAllData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de l\'approbation');
    }
  };

  // Add baggage to passenger
  const handleAddBaggage = async () => {
    if (!selectedPassenger || !newBaggageTag) {
      setError('Veuillez remplir le numéro de tag');
      return;
    }

    try {
      const token = localStorage.getItem('bfs_token');
      const response = await api.post('/api/v1/support/baggages/create', {
        passengerId: selectedPassenger.id,
        tag_number: newBaggageTag,
        weight: newBaggageWeight ? parseFloat(newBaggageWeight) : null,
        status: 'checked_in'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = response.data as ApiResponse<any>;
      if (data.success) {
        setSuccessMessage('Bagage ajouté !');
        setNewBaggageTag('');
        setNewBaggageWeight('');
        setShowAddBaggage(false);
        fetchAllData();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de l\'ajout');
    }
  };

  // Delete baggage
  const handleDeleteBaggage = async (baggageId: string) => {
    if (!window.confirm('Supprimer ce bagage ?')) return;

    try {
      const token = localStorage.getItem('bfs_token');
      await api.delete(`/api/v1/support/baggages/${baggageId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccessMessage('Bagage supprimé');
      fetchAllData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur');
    }
  };

  // Filter passengers
  const filteredPassengers = passengers.filter(p => {
    const matchesSearch = 
      p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.pnr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.flightNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAirport = selectedAirport === 'all' || p.airportCode === selectedAirport;
    return matchesSearch && matchesAirport;
  });

  // Pending approvals
  const pendingUsers = users.filter(u => u.is_approved === false);

  if (!user) return <LoadingPlane text="Redirection..." size="lg" />;

  if (user.role !== 'support') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Accès Refusé</h1>
          <p className="text-gray-600 mb-6">Cette page est réservée au support.</p>
          <button onClick={logout} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg">
            Déconnexion
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingPlane text="Chargement du panneau support..." size="lg" />;

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed" style={{
      backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)), url('/images/airport-bg.jpg')`
    }}>
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
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-2 hover:bg-red-600 rounded p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
                <Settings className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Panneau Support</h1>
                <p className="text-white/80">Bienvenue {user.full_name} - Administration complète du système</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="bg-red-500/80 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-lg"
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Section */}
        <div className={`bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl mb-6 overflow-hidden border border-white/20`}>
          <button 
            onClick={() => setExpandedSections(s => ({ ...s, stats: !s.stats }))}
            className="w-full px-6 py-4 flex items-center justify-between text-white hover:bg-white/5 transition"
          >
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Briefcase className="w-6 h-6" />
              Statistiques Globales
            </h2>
            {expandedSections.stats ? <ChevronUp /> : <ChevronDown />}
          </button>
          
          {expandedSections.stats && (
            <div className="px-6 pb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-xl p-5 border border-blue-400/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm">Passagers</p>
                    <p className="text-3xl font-bold text-white">{passengers.length}</p>
                  </div>
                  <Users className="w-10 h-10 text-blue-400/50" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 rounded-xl p-5 border border-emerald-400/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-200 text-sm">Bagages</p>
                    <p className="text-3xl font-bold text-white">{passengers.reduce((sum, p) => sum + (p.baggages?.length || 0), 0)}</p>
                  </div>
                  <Briefcase className="w-10 h-10 text-emerald-400/50" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/30 rounded-xl p-5 border border-purple-400/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-200 text-sm">Utilisateurs</p>
                    <p className="text-3xl font-bold text-white">{users.length}</p>
                  </div>
                  <User className="w-10 h-10 text-purple-400/50" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/30 rounded-xl p-5 border border-amber-400/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-200 text-sm">Compagnies</p>
                    <p className="text-3xl font-bold text-white">{airlines.length}</p>
                  </div>
                  <Plane className="w-10 h-10 text-amber-400/50" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        {(pendingAirlineRequests.length > 0 || pendingUsers.length > 0) && (
          <div className="bg-amber-500/20 backdrop-blur-lg rounded-2xl shadow-xl mb-6 border border-amber-400/30">
            <button 
              onClick={() => setExpandedSections(s => ({ ...s, pendingApprovals: !s.pendingApprovals }))}
              className="w-full px-6 py-4 flex items-center justify-between text-amber-100 hover:bg-amber-500/10 transition"
            >
              <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-amber-400" />
                En Attente d'Approbation ({pendingAirlineRequests.length + pendingUsers.length})
              </h2>
              {expandedSections.pendingApprovals ? <ChevronUp /> : <ChevronDown />}
            </button>
            
            {expandedSections.pendingApprovals && (
              <div className="px-6 pb-6 space-y-3">
                {pendingAirlineRequests.map(request => (
                  <div key={request.id} className="bg-white/10 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Plane className="w-8 h-8 text-amber-400" />
                      <div>
                        <p className="text-white font-semibold">{request.name} ({request.code})</p>
                        <p className="text-white/60 text-sm">{request.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleApproveAirline(request.id)}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Approuver
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-white/20">
          <div className="flex border-b border-white/20">
            {[
              { id: 'users', label: 'Utilisateurs', icon: Users, count: users.length },
              { id: 'airlines', label: 'Compagnies', icon: Building2, count: airlines.length },
              { id: 'passengers', label: 'Passagers', icon: User, count: filteredPassengers.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition ${
                  activeTab === tab.id
                    ? 'text-white bg-white/10 border-b-2 border-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    placeholder="Rechercher un utilisateur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-white/50 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchAllData}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 shadow-lg transition"
                  >
                    <Plus className="w-5 h-5" />
                    Nouvel Utilisateur
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {users.filter(u => 
                  u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(u => (
                  <div key={u.id} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          u.role === 'support' ? 'bg-red-500/20' :
                          u.role === 'supervisor' ? 'bg-blue-500/20' : 'bg-green-500/20'
                        }`}>
                          <User className={`w-6 h-6 ${
                            u.role === 'support' ? 'text-red-400' :
                            u.role === 'supervisor' ? 'text-blue-400' : 'text-green-400'
                          }`} />
                        </div>
                        <div>
                          <h3 className="text-white font-bold">{u.full_name}</h3>
                          <p className="text-white/60 text-sm flex items-center gap-1">
                            <Mail className="w-4 h-4" /> {u.email}
                          </p>
                          <div className="flex gap-3 mt-1 text-sm">
                            <span className="text-white/60 flex items-center gap-1">
                              <MapPin className="w-4 h-4" /> {u.airport_code}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              u.role === 'support' ? 'bg-red-500/20 text-red-300' :
                              u.role === 'supervisor' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-green-500/20 text-green-300'
                            }`}>
                              {u.role}
                            </span>
                          </div>
                        </div>
                      </div>
                      {u.role !== 'support' && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.full_name)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-2 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Airlines Tab */}
          {activeTab === 'airlines' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    placeholder="Rechercher une compagnie..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-white/50 outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowCreateAirlineModal(true)}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 shadow-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  Nouvelle Compagnie
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {airlines.filter(a => 
                  a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  a.code?.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(airline => (
                  <div key={airline.id} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center">
                        <Plane className="w-8 h-8 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg">{airline.name}</h3>
                        <p className="text-amber-400 font-mono font-bold">{airline.code}</p>
                        <p className="text-white/60 text-sm">{airline.email}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        airline.is_approved 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {airline.is_approved ? 'Approuvée' : 'En attente'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passengers Tab */}
          {activeTab === 'passengers' && (
            <div className="p-6">
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, PNR ou vol..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-white/50 outline-none"
                  />
                </div>
                <select
                  value={selectedAirport}
                  onChange={(e) => setSelectedAirport(e.target.value)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-white/50 outline-none"
                >
                  <option value="all" className="bg-slate-800">Tous les aéroports</option>
                  {airports.map(apt => (
                    <option key={apt} value={apt} className="bg-slate-800">{apt}</option>
                  ))}
                </select>
                <button
                  onClick={fetchAllData}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              {filteredPassengers.length === 0 ? (
                <div className="text-center py-12 text-white/60">
                  <Plane className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Aucun passager trouvé</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {filteredPassengers.slice(0, 50).map(passenger => (
                    <div
                      key={passenger.id}
                      onClick={() => {
                        setSelectedPassenger(passenger);
                        setShowAddBaggage(false);
                      }}
                      className={`bg-white/5 border rounded-xl p-4 cursor-pointer transition ${
                        selectedPassenger?.id === passenger.id
                          ? 'border-blue-400 bg-blue-500/10'
                          : 'border-white/10 hover:border-white/30 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-white font-bold">{passenger.fullName}</h3>
                          <div className="flex flex-wrap gap-3 text-sm text-white/60 mt-1">
                            <span><strong>PNR:</strong> {passenger.pnr}</span>
                            <span><strong>Vol:</strong> {passenger.flightNumber}</span>
                            <span><strong>Route:</strong> {passenger.departure} → {passenger.arrival}</span>
                            <span><strong>Aéroport:</strong> {passenger.airportCode}</span>
                            <span><strong>Bagages:</strong> {passenger.baggages?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Passenger Details */}
        {selectedPassenger && (
          <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-6 h-6" />
                {selectedPassenger.fullName}
              </h2>
              <button onClick={() => setSelectedPassenger(null)} className="text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-white/80"><strong>PNR:</strong> {selectedPassenger.pnr}</div>
              <div className="text-white/80"><strong>Vol:</strong> {selectedPassenger.flightNumber}</div>
              <div className="text-white/80"><strong>Route:</strong> {selectedPassenger.departure} → {selectedPassenger.arrival}</div>
              <div className="text-white/80"><strong>Siège:</strong> {selectedPassenger.seatNumber || 'N/A'}</div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Bagages ({selectedPassenger.baggages?.length || 0})
              </h3>
              <button
                onClick={() => setShowAddBaggage(!showAddBaggage)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Ajouter
              </button>
            </div>

            {showAddBaggage && (
              <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Numéro de tag"
                    value={newBaggageTag}
                    onChange={(e) => setNewBaggageTag(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                  />
                  <input
                    type="number"
                    placeholder="Poids (kg)"
                    value={newBaggageWeight}
                    onChange={(e) => setNewBaggageWeight(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                  />
                  <button
                    onClick={handleAddBaggage}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold"
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            )}

            {selectedPassenger.baggages?.length === 0 ? (
              <p className="text-white/60 text-center py-4">Aucun bagage</p>
            ) : (
              <div className="space-y-2">
                {selectedPassenger.baggages?.map(baggage => (
                  <div key={baggage.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex justify-between items-center">
                    <div className="text-white">
                      <span className="font-mono font-bold">{baggage.tag_number}</span>
                      <span className="text-white/60 ml-4">
                        {baggage.weight && `${baggage.weight} kg`} | {baggage.status}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteBaggage(baggage.id)}
                      className="text-red-400 hover:text-red-300 p-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-white/20">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-6 h-6" />
                Créer un Utilisateur Dashboard
              </h2>
              <button onClick={() => setShowCreateUserModal(false)} className="text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-white/80 text-sm mb-1">Nom complet *</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                    placeholder="Jean Dupont"
                  />
                </div>
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                    placeholder="jean@exemple.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Mot de passe *</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full pl-10 pr-12 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-white/40 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Rôle *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="supervisor" className="bg-slate-800">Superviseur (aéroport spécifique)</option>
                  <option value="baggage_dispute" className="bg-slate-800">Litige Bagage (tous aéroports)</option>
                </select>
              </div>
              {newUser.role === 'supervisor' && (
                <div>
                  <label className="block text-white/80 text-sm mb-1">Aéroport *</label>
                  <select
                    value={newUser.airport_code}
                    onChange={(e) => setNewUser({ ...newUser, airport_code: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value="" className="bg-slate-800">Sélectionner un aéroport</option>
                    {AIRPORTS.map(apt => (
                      <option key={apt.code} value={apt.code} className="bg-slate-800">
                        {apt.code} - {apt.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="px-5 py-2 text-white/60 hover:text-white transition"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateUser}
                disabled={creatingUser}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {creatingUser ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Airline Modal */}
      {showCreateAirlineModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-white/20">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plane className="w-6 h-6" />
                Créer une Compagnie Aérienne
              </h2>
              <button onClick={() => setShowCreateAirlineModal(false)} className="text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-white/80 text-sm mb-1">Nom de la compagnie *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    value={newAirline.name}
                    onChange={(e) => setNewAirline({ ...newAirline, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                    placeholder="Air Congo"
                  />
                </div>
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Code IATA (2-3 lettres) *</label>
                <input
                  type="text"
                  maxLength={3}
                  value={newAirline.code}
                  onChange={(e) => setNewAirline({ ...newAirline, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 font-mono"
                  placeholder="AC"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                  <input
                    type="email"
                    value={newAirline.email}
                    onChange={(e) => setNewAirline({ ...newAirline, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                    placeholder="contact@aircongo.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Mot de passe *</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newAirline.password}
                    onChange={(e) => setNewAirline({ ...newAirline, password: e.target.value })}
                    className="w-full pl-10 pr-12 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-white/40 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateAirlineModal(false)}
                className="px-5 py-2 text-white/60 hover:text-white transition"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateAirline}
                disabled={creatingAirline}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {creatingAirline ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
