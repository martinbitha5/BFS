import {
    AlertCircle,
    Building2,
    Check,
    Eye,
    EyeOff,
    Key,
    Mail,
    Plane,
    Plus,
    RefreshCw,
    Search,
    X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import api from '../config/api';

interface Airline {
  id: string;
  name: string;
  code: string;
  email: string;
  is_approved: boolean;
  created_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export default function Airlines() {
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newAirline, setNewAirline] = useState({
    name: '',
    code: '',
    email: '',
    password: ''
  });

  const fetchAirlines = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('bfs_support_token');
      const response = await api.get('/api/v1/airlines', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = response.data as ApiResponse<Airline[]>;
      if (data.success && Array.isArray(data.data)) {
        setAirlines(data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAirlines();
  }, [fetchAirlines]);

  const handleCreateAirline = async () => {
    if (!newAirline.name || !newAirline.code || !newAirline.email || !newAirline.password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const token = localStorage.getItem('bfs_support_token');
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
        setShowModal(false);
        setNewAirline({ name: '', code: '', email: '', password: '' });
        fetchAirlines();
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const filteredAirlines = airlines.filter(a =>
    a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && airlines.length === 0) {
    return <LoadingPlane text="Chargement des compagnies..." size="lg" />;
  }

  return (
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-amber-400" />
            Gestion des Compagnies
          </h1>
          <p className="text-sm text-white/60">
            {filteredAirlines.length} compagnie(s) enregistrée(s)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Compagnie
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher par nom, code ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <button
          onClick={fetchAirlines}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Airlines Grid */}
      {filteredAirlines.length === 0 ? (
        <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-12 text-center">
          <Plane className="w-16 h-16 mx-auto mb-4 text-white/30" />
          <p className="text-lg text-white/60">Aucune compagnie trouvée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAirlines.map(airline => (
            <div key={airline.id} className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-5 hover:bg-white/5 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <Plane className="w-8 h-8 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white font-bold truncate">{airline.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      airline.is_approved 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {airline.is_approved ? 'Approuvée' : 'En attente'}
                    </span>
                  </div>
                  <p className="text-amber-400 font-mono font-bold text-lg">{airline.code}</p>
                  <p className="text-white/50 text-sm truncate mt-1">{airline.email}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Airline Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-white/20">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plane className="w-6 h-6" />
                Nouvelle Compagnie
              </h2>
              <button onClick={() => setShowModal(false)} className="text-white/60 hover:text-white">
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
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 font-mono text-center text-xl"
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
                onClick={() => setShowModal(false)}
                className="px-5 py-2 text-white/60 hover:text-white transition"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateAirline}
                disabled={creating}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
