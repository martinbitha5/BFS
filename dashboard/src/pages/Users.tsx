/**
 * Page de Gestion des Utilisateurs
 * Permet aux superviseurs de gérer les agents de leur aéroport
 */

import {
  AlertCircle,
  Check,
  ChevronDown,
  Edit2,
  Mail,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users as UsersIcon,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  airport_code: string;
  role: 'checkin' | 'baggage' | 'boarding' | 'arrival' | 'supervisor' | 'baggage_dispute' | 'support';
  created_at: string;
  updated_at: string;
  is_approved?: boolean;
  last_login?: string;
}

interface UserStats {
  total: number;
  byRole: Record<string, number>;
  activeToday: number;
}

const ROLE_LABELS: Record<string, string> = {
  checkin: 'Agent Check-in',
  baggage: 'Agent Bagages',
  boarding: 'Agent Embarquement',
  arrival: 'Agent Arrivée',
  supervisor: 'Superviseur',
  baggage_dispute: 'Litige Bagages',
  support: 'Support Technique'
};

const ROLE_COLORS: Record<string, string> = {
  checkin: 'bg-blue-900/40 text-blue-300 border-blue-500/30',
  baggage: 'bg-green-900/40 text-green-300 border-green-500/30',
  boarding: 'bg-purple-900/40 text-purple-300 border-purple-500/30',
  arrival: 'bg-orange-900/40 text-orange-300 border-orange-500/30',
  supervisor: 'bg-red-900/40 text-red-300 border-red-500/30',
  baggage_dispute: 'bg-yellow-900/40 text-yellow-300 border-yellow-500/30',
  support: 'bg-pink-900/40 text-pink-300 border-pink-500/30'
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'checkin',
    password: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  // Menu dropdown
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, filterRole]);

  const fetchUsers = async () => {
    if (!currentUser?.airport_code) return;

    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/api/v1/users?airport=${currentUser.airport_code}`);
      const userData = response.data.data || [];
      setUsers(userData);
      
      // Calculer les statistiques
      const roleStats: Record<string, number> = {};
      userData.forEach((u: UserData) => {
        roleStats[u.role] = (roleStats[u.role] || 0) + 1;
      });
      
      setStats({
        total: userData.length,
        byRole: roleStats,
        activeToday: userData.filter((u: UserData) => {
          if (!u.last_login) return false;
          const today = new Date().toDateString();
          return new Date(u.last_login).toDateString() === today;
        }).length
      });
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.full_name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      );
    }

    if (filterRole) {
      filtered = filtered.filter(u => u.role === filterRole);
    }

    setFilteredUsers(filtered);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      email: '',
      full_name: '',
      role: 'checkin',
      password: ''
    });
    setShowModal(true);
  };

  const openEditModal = (user: UserData) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      password: ''
    });
    setShowModal(true);
    setOpenDropdown(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.airport_code) return;

    try {
      setFormLoading(true);
      setError('');

      if (modalMode === 'create') {
        await api.post('/api/v1/users', {
          ...formData,
          airport_code: currentUser.airport_code
        });
        setSuccess('Utilisateur créé avec succès');
      } else if (selectedUser) {
        await api.put(`/api/v1/users/${selectedUser.id}`, {
          full_name: formData.full_name,
          role: formData.role,
          ...(formData.password ? { password: formData.password } : {})
        });
        setSuccess('Utilisateur modifié avec succès');
      }

      setShowModal(false);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      await api.delete(`/api/v1/users/${userId}`);
      setSuccess('Utilisateur supprimé avec succès');
      fetchUsers();
      setOpenDropdown(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('Entrez le nouveau mot de passe (min 6 caractères):');
    if (!newPassword || newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      await api.post(`/api/v1/users/${userId}/reset-password`, {
        password: newPassword
      });
      setSuccess('Mot de passe réinitialisé avec succès');
      setOpenDropdown(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.response?.data?.error || 'Erreur lors de la réinitialisation');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <UsersIcon className="w-8 h-8 mr-3" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-white/70 mt-1">
            Gérez les agents de l'aéroport {currentUser?.airport_code}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="px-4 py-2 bg-black/30 backdrop-blur-md border border-white/20 rounded-lg text-white hover:bg-black/50 transition-colors flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nouvel Agent
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-900/30 backdrop-blur-md border border-red-500/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-300">{error}</span>
          </div>
          <button onClick={() => setError('')}>
            <X className="w-4 h-4 text-red-300" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-900/30 backdrop-blur-md border border-green-500/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-400 mr-2" />
            <span className="text-green-300">{success}</span>
          </div>
          <button onClick={() => setSuccess('')}>
            <X className="w-4 h-4 text-green-300" />
          </button>
        </div>
      )}

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-primary-400 opacity-50" />
            </div>
          </div>
          {Object.entries(stats.byRole).map(([role, count]) => (
            <div key={role} className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
              <div>
                <p className="text-white/60 text-xs truncate">{ROLE_LABELS[role] || role}</p>
                <p className="text-xl font-bold text-white">{count}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Tous les rôles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-white/60 mb-4" />
            <p className="text-white/70">Chargement...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <User className="w-12 h-12 mx-auto text-white/30 mb-4" />
            <p className="text-white/70">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Aéroport
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Créé le
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary-600/30 flex items-center justify-center mr-3">
                          <User className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.full_name}</p>
                          <p className="text-xs text-white/60 flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${ROLE_COLORS[user.role] || 'bg-gray-900/40 text-gray-300 border-gray-500/30'}`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-white/70">{user.airport_code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-white/70">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-white/70" />
                      </button>
                      
                      {openDropdown === user.id && (
                        <div className="absolute right-6 top-12 w-48 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg shadow-xl z-50 overflow-hidden">
                          <button
                            onClick={() => openEditModal(user)}
                            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center"
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Modifier
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center"
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Réinitialiser MDP
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/30 flex items-center"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Création/Edition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-white/20 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center">
                {modalMode === 'create' ? (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Nouvel Agent
                  </>
                ) : (
                  <>
                    <Edit2 className="w-5 h-5 mr-2" />
                    Modifier l'Agent
                  </>
                )}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Jean Dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={modalMode === 'edit'}
                  className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  placeholder="jean.dupont@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Rôle *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Mot de passe {modalMode === 'create' ? '*' : '(laisser vide pour ne pas changer)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={modalMode === 'create'}
                  minLength={6}
                  className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center transition-colors disabled:opacity-50"
                >
                  {formLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {modalMode === 'create' ? 'Créer' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fermer le dropdown quand on clique ailleurs */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  );
}

