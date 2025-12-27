import { AlertCircle, Building, CheckCircle, Hash, Lock, Mail, Plane, User, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDomesticAirports, getInternationalAirports } from '../config/airports';
import api from '../config/api';

type TabType = 'user' | 'airline';

export default function Administration() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('user');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form pour utilisateur Dashboard
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'supervisor' as 'supervisor' | 'baggage_dispute',
    airport_code: '',
  });

  // Form pour compagnie aérienne
  const [airlineForm, setAirlineForm] = useState({
    name: '',
    code: '',
    email: '',
    password: '',
  });

  // Vérifier que l'utilisateur est support
  if (!user || user.role !== 'support') {
    return (
      <div className="bg-red-900/30 backdrop-blur-md border border-red-400/30 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="w-6 h-6 text-red-300 mr-3" />
          <p className="text-red-200">Accès refusé : Cette page est réservée au support.</p>
        </div>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/api/v1/users/create-by-support', {
        full_name: userForm.full_name,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
        airport_code: userForm.role === 'supervisor' ? userForm.airport_code : 'ALL',
      });

      if (response.data.success) {
        setSuccess(`Utilisateur "${userForm.full_name}" créé avec succès !`);
        setUserForm({
          full_name: '',
          email: '',
          password: '',
          role: 'supervisor',
          airport_code: '',
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAirline = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/api/v1/airlines/create-by-support', {
        name: airlineForm.name,
        code: airlineForm.code.toUpperCase(),
        email: airlineForm.email,
        password: airlineForm.password,
      });

      if (response.data.success) {
        setSuccess(`Compagnie aérienne "${airlineForm.name}" (${airlineForm.code.toUpperCase()}) créée avec succès !`);
        setAirlineForm({
          name: '',
          code: '',
          email: '',
          password: '',
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
        <div className="flex items-center">
          <UserPlus className="w-8 h-8 text-primary-400 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-white">Administration</h1>
            <p className="text-white/70">Créer des comptes utilisateurs et compagnies aériennes</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="bg-green-900/30 backdrop-blur-md border border-green-400/30 rounded-lg p-4 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-300 mr-3" />
          <p className="text-green-200">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 backdrop-blur-md border border-red-400/30 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-300 mr-3" />
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden">
        <div className="flex border-b border-white/20">
          <button
            onClick={() => { setActiveTab('user'); setError(''); setSuccess(''); }}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center ${
              activeTab === 'user'
                ? 'bg-primary-600/30 text-white border-b-2 border-primary-500'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <User className="w-5 h-5 mr-2" />
            Utilisateur Dashboard
          </button>
          <button
            onClick={() => { setActiveTab('airline'); setError(''); setSuccess(''); }}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center ${
              activeTab === 'airline'
                ? 'bg-primary-600/30 text-white border-b-2 border-primary-500'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <Plane className="w-5 h-5 mr-2" />
            Compagnie Aérienne
          </button>
        </div>

        <div className="p-6">
          {/* Formulaire Utilisateur Dashboard */}
          {activeTab === 'user' && (
            <form onSubmit={handleCreateUser} className="space-y-5 max-w-xl">
              <div>
                <label className="block text-sm font-medium text-white/85 mb-2">
                  Nom complet *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                    required
                    placeholder="Jean Dupont"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/85 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    required
                    placeholder="utilisateur@bfs.cd"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/85 mb-2">
                  Mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    required
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-white/60 mt-1">Minimum 6 caractères</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/85 mb-2">
                  Rôle *
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'supervisor' | 'baggage_dispute' })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="supervisor">Superviseur (Aéroport spécifique)</option>
                  <option value="baggage_dispute">Litiges Bagages (Tous les aéroports)</option>
                </select>
                <p className="text-xs text-white/60 mt-1">
                  {userForm.role === 'supervisor' 
                    ? 'Accès limité à un aéroport spécifique' 
                    : 'Accès à tous les aéroports pour la gestion des litiges'}
                </p>
              </div>

              {userForm.role === 'supervisor' && (
                <div>
                  <label className="block text-sm font-medium text-white/85 mb-2">
                    Aéroport *
                  </label>
                  <select
                    value={userForm.airport_code}
                    onChange={(e) => setUserForm({ ...userForm, airport_code: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="">Sélectionner un aéroport</option>
                    <optgroup label="Aéroports RDC">
                      {getDomesticAirports().map((airport) => (
                        <option key={airport.code} value={airport.code}>
                          {airport.name} ({airport.code})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Destinations internationales">
                      {getInternationalAirports().map((airport) => (
                        <option key={airport.code} value={airport.code}>
                          {airport.name}, {airport.country} ({airport.code})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  'Création en cours...'
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Créer l'utilisateur
                  </>
                )}
              </button>
            </form>
          )}

          {/* Formulaire Compagnie Aérienne */}
          {activeTab === 'airline' && (
            <form onSubmit={handleCreateAirline} className="space-y-5 max-w-xl">
              <div>
                <label className="block text-sm font-medium text-white/85 mb-2">
                  Nom de la compagnie *
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={airlineForm.name}
                    onChange={(e) => setAirlineForm({ ...airlineForm, name: e.target.value })}
                    required
                    placeholder="Ethiopian Airlines"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/85 mb-2">
                  Code IATA *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={airlineForm.code}
                    onChange={(e) => setAirlineForm({ ...airlineForm, code: e.target.value.toUpperCase() })}
                    required
                    maxLength={2}
                    pattern="[A-Z]{2}"
                    placeholder="ET"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-white/60 mt-1">Code à 2 lettres (ex: ET, QC, KQ)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/85 mb-2">
                  Email de contact *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={airlineForm.email}
                    onChange={(e) => setAirlineForm({ ...airlineForm, email: e.target.value })}
                    required
                    placeholder="contact@airline.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/85 mb-2">
                  Mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={airlineForm.password}
                    onChange={(e) => setAirlineForm({ ...airlineForm, password: e.target.value })}
                    required
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-white/60 mt-1">Minimum 6 caractères</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  'Création en cours...'
                ) : (
                  <>
                    <Plane className="w-5 h-5 mr-2" />
                    Créer la compagnie aérienne
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

