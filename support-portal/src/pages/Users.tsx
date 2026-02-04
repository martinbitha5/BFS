import {
    AlertCircle,
    Check,
    Eye,
    EyeOff,
    Key,
    Mail,
    MapPin,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    User,
    Users as UsersIcon,
    X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import api from '../config/api';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  airport_code: string;
  role: 'supervisor' | 'baggage_dispute' | 'support';
  is_approved?: boolean;
  created_at?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

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

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'supervisor' as 'supervisor' | 'baggage_dispute',
    airport_code: ''
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('bfs_support_token');
      const response = await api.get('/api/v1/support/users/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = response.data as ApiResponse<UserData[]>;
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (newUser.role === 'supervisor' && !newUser.airport_code) {
      setError('Le code aéroport est requis pour les superviseurs');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const token = localStorage.getItem('bfs_support_token');
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
        setShowModal(false);
        setNewUser({ email: '', password: '', full_name: '', role: 'supervisor', airport_code: '' });
        fetchUsers();
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${userName}" ?`)) return;

    try {
      const token = localStorage.getItem('bfs_support_token');
      await api.delete(`/api/v1/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccessMessage(`Utilisateur "${userName}" supprimé`);
      fetchUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.airport_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'support': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'supervisor': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'baggage_dispute': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'support': return 'Support';
      case 'supervisor': return 'Superviseur';
      case 'baggage_dispute': return 'Litige Bagage';
      default: return role;
    }
  };

  if (loading && users.length === 0) {
    return <LoadingPlane text="Chargement des utilisateurs..." size="lg" />;
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
            <UsersIcon className="w-7 h-7 text-blue-400" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-sm text-white/60">
            {filteredUsers.length} utilisateur(s) enregistré(s)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvel Utilisateur
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou aéroport..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Users List */}
      <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredUsers.map(user => (
              <div key={user.id} className="p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      user.role === 'support' ? 'bg-red-500/20' :
                      user.role === 'supervisor' ? 'bg-blue-500/20' : 'bg-green-500/20'
                    }`}>
                      <User className={`w-6 h-6 ${
                        user.role === 'support' ? 'text-red-400' :
                        user.role === 'supervisor' ? 'text-blue-400' : 'text-green-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{user.full_name}</h3>
                      <p className="text-white/60 text-sm flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {user.email}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-white/50 text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {user.airport_code}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs border ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {user.role !== 'support' && (
                    <button
                      onClick={() => handleDeleteUser(user.id, user.full_name)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-white/20">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-6 h-6" />
                Nouvel Utilisateur
              </h2>
              <button onClick={() => setShowModal(false)} className="text-white/60 hover:text-white">
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
                  <option value="supervisor" className="bg-slate-800">Superviseur</option>
                  <option value="baggage_dispute" className="bg-slate-800">Litige Bagage</option>
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
                onClick={() => setShowModal(false)}
                className="px-5 py-2 text-white/60 hover:text-white transition"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateUser}
                disabled={creating}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
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
