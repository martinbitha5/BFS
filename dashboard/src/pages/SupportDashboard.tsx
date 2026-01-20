import {
    AlertCircle,
    Briefcase,
    LogOut,
    MapPin, Plane,
    Plus,
    RefreshCw, Search,
    Trash2,
    Users
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

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

interface User {
  id: string;
  email: string;
  full_name: string;
  airport_code: string;
  role: 'supervisor' | 'baggage_dispute' | 'support';
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

interface BaggageCreateResponse {
  id: string;
  tag_number: string;
  status: string;
}

export default function SupportDashboard() {
  const { user, logout } = useAuth();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'passengers' | 'users' | 'settings'>('passengers');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAirport, setSelectedAirport] = useState<string>('all');
  const [airports, setAirports] = useState<string[]>([]);

  // Modal states
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [showAddBaggage, setShowAddBaggage] = useState(false);
  const [newBaggageTag, setNewBaggageTag] = useState('');
  const [newBaggageWeight, setNewBaggageWeight] = useState('');

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
      const passResponse = await api.get('/api/v1/passengers/all', { headers });
      const passData = passResponse.data as { success: boolean; data: Passenger[] };

      if (passData.success && Array.isArray(passData.data)) {
        setPassengers(passData.data);
        // Extract unique airports
        const uniqueAirports = [...new Set(passData.data.map(p => p.airportCode).filter(Boolean))];
        setAirports(uniqueAirports.sort());
      } else {
        setPassengers([]);
      }

      // Fetch all users
      const usersResponse = await api.get('/api/v1/users/all', { headers });
      const usersData = usersResponse.data as { success: boolean; data: User[] };

      if (usersData.success && Array.isArray(usersData.data)) {
        setUsers(usersData.data);
      } else {
        setUsers([]);
      }

    } catch (err: any) {
      console.error('Erreur chargement données:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Erreur lors du chargement';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Add baggage to passenger
  const handleAddBaggage = async () => {
    if (!selectedPassenger || !newBaggageTag) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const token = localStorage.getItem('bfs_token');
      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await api.post<ApiResponse<BaggageCreateResponse>>('/api/v1/baggages/create', {
        passengerId: selectedPassenger.id,
        tag_number: newBaggageTag,
        weight: newBaggageWeight ? parseFloat(newBaggageWeight) : null,
        status: 'checked_in'
      }, { headers });

      if (response.data.success) {
        // Update local passenger data
        const updatedPassengers = passengers.map(p => {
          if (p.id === selectedPassenger.id) {
            return {
              ...p,
              baggageCount: p.baggageCount + 1,
              baggages: [
                ...p.baggages,
                {
                  id: response.data.data.id,
                  tag_number: newBaggageTag,
                  status: 'checked_in',
                  weight: newBaggageWeight ? parseFloat(newBaggageWeight) : null,
                  checked_at: new Date().toISOString(),
                  arrived_at: null
                }
              ]
            };
          }
          return p;
        });
        setPassengers(updatedPassengers);
        setSelectedPassenger(updatedPassengers.find(p => p.id === selectedPassenger.id) || null);
        setNewBaggageTag('');
        setNewBaggageWeight('');
        setShowAddBaggage(false);
        alert('✅ Bagage ajouté avec succès!');
      } else {
        alert('❌ Erreur: ' + response.data.error);
      }
    } catch (err: any) {
      console.error('Erreur ajout bagage:', err);
      alert('Erreur: ' + (err.response?.data?.error || err.message));
    }
  };

  // Delete baggage
  const handleDeleteBaggage = async (baggageId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce bagage?')) {
      return;
    }

    try {
      const token = localStorage.getItem('bfs_token');
      if (!token) return;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await api.delete<ApiResponse<{ success: boolean }>>(`/api/v1/baggages/${baggageId}`, { headers });

      if (response.data.success) {
        if (selectedPassenger) {
          const updated = {
            ...selectedPassenger,
            baggageCount: selectedPassenger.baggageCount - 1,
            baggages: selectedPassenger.baggages.filter(b => b.id !== baggageId)
          };
          setSelectedPassenger(updated);
          setPassengers(passengers.map(p => p.id === updated.id ? updated : p));
        }
        alert('✅ Bagage supprimé avec succès!');
      }
    } catch (err: any) {
      alert('Erreur: ' + (err.response?.data?.error || err.message));
    }
  };

  // Filter passengers
  const filteredPassengers = passengers.filter(p => {
    const matchesSearch = 
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.pnr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.flightNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAirport = selectedAirport === 'all' || p.airportCode === selectedAirport;

    return matchesSearch && matchesAirport;
  });

  if (!user) return <LoadingPlane text="Redirection..." size="lg" />;

  if (user.role !== 'support') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Accès Refusé</h1>
          <p className="text-gray-600 mb-6">Cette page est réservée au support uniquement.</p>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 mx-auto"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingPlane text="Chargement des données support..." size="lg" />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Briefcase className="w-8 h-8" />
                Dashboard Support
              </h1>
              <p className="text-blue-100 mt-1">Bienvenue {user.full_name} - Accès complet au système</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800">Erreur</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Passagers</p>
                <p className="text-2xl font-bold text-gray-800">{passengers.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-30" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Bagages Total</p>
                <p className="text-2xl font-bold text-gray-800">
                  {passengers.reduce((sum, p) => sum + p.baggageCount, 0)}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-green-500 opacity-30" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Utilisateurs</p>
                <p className="text-2xl font-bold text-gray-800">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500 opacity-30" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Aéroports</p>
                <p className="text-2xl font-bold text-gray-800">{airports.length}</p>
              </div>
              <MapPin className="w-8 h-8 text-orange-500 opacity-30" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('passengers')}
              className={`px-6 py-4 font-semibold flex items-center gap-2 ${
                activeTab === 'passengers'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-5 h-5" />
              Passagers ({filteredPassengers.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-4 font-semibold flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-5 h-5" />
              Utilisateurs ({users.length})
            </button>
          </div>

          {/* Passengers Tab */}
          {activeTab === 'passengers' && (
            <div className="p-6">
              {/* Search & Filters */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, PNR ou vol..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <select
                  value={selectedAirport}
                  onChange={(e) => setSelectedAirport(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">Tous les aéroports</option>
                  {airports.map(apt => (
                    <option key={apt} value={apt}>{apt}</option>
                  ))}
                </select>

                <button
                  onClick={fetchAllData}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Actualiser
                </button>
              </div>

              {/* Passengers List */}
              {filteredPassengers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Plane className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Aucun passager trouvé</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPassengers.map(passenger => (
                    <div
                      key={passenger.id}
                      onClick={() => {
                        setSelectedPassenger(passenger);
                        setShowAddBaggage(false);
                      }}
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        selectedPassenger?.id === passenger.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800">{passenger.fullName}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm text-gray-600 mt-2">
                            <div>
                              <span className="font-semibold">PNR:</span> {passenger.pnr}
                            </div>
                            <div>
                              <span className="font-semibold">Vol:</span> {passenger.flightNumber}
                            </div>
                            <div>
                              <span className="font-semibold">Siège:</span> {passenger.seatNumber || '-'}
                            </div>
                            <div>
                              <span className="font-semibold">Aéroport:</span> {passenger.airportCode}
                            </div>
                            <div>
                              <span className="font-semibold">Bagages:</span> {passenger.baggageCount}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="p-6">
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800">{u.full_name}</h3>
                        <p className="text-sm text-gray-600">{u.email}</p>
                        <div className="flex gap-4 text-sm text-gray-600 mt-2">
                          <span>Aéroport: <strong>{u.airport_code}</strong></span>
                          <span>Rôle: <strong className={`px-2 py-1 rounded ${
                            u.role === 'support' ? 'bg-red-100 text-red-700' :
                            u.role === 'supervisor' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>{u.role}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Passenger Details Modal */}
        {selectedPassenger && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Détails: {selectedPassenger.fullName}
              </h2>
              <button
                onClick={() => setSelectedPassenger(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Bagages Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Bagages ({selectedPassenger.baggageCount})
                </h3>
                <button
                  onClick={() => setShowAddBaggage(!showAddBaggage)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter Bagage
                </button>
              </div>

              {/* Add Baggage Form */}
              {showAddBaggage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Numéro de tag"
                      value={newBaggageTag}
                      onChange={(e) => setNewBaggageTag(e.target.value)}
                      className="px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Poids (kg)"
                      value={newBaggageWeight}
                      onChange={(e) => setNewBaggageWeight(e.target.value)}
                      className="px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddBaggage}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold"
                      >
                        Ajouter
                      </button>
                      <button
                        onClick={() => {
                          setShowAddBaggage(false);
                          setNewBaggageTag('');
                          setNewBaggageWeight('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bagages List */}
              {selectedPassenger.baggages.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucun bagage enregistré</p>
              ) : (
                <div className="space-y-2">
                  {selectedPassenger.baggages.map(baggage => (
                    <div key={baggage.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-800">{baggage.tag_number}</p>
                        <div className="text-sm text-gray-600 space-y-1">
                          {baggage.weight && <p>Poids: {baggage.weight} kg</p>}
                          <p>Status: <span className="font-semibold">{baggage.status}</span></p>
                          {baggage.checked_at && <p>Enregistré: {new Date(baggage.checked_at).toLocaleString('fr-FR')}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBaggage(baggage.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
