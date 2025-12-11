import { AlertCircle, Plane, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDomesticAirports, getInternationalAirports } from '../config/airports';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    airportCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.airportCode) {
      setError('Tous les champs sont requis');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password, formData.name, formData.airportCode);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      {/* Overlay sombre pour améliorer la lisibilité */}
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl p-8">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">Baggage Found Solution</h1>
          <p className="text-white/80 mt-2">Créer un compte superviseur</p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 bg-red-900/30 backdrop-blur-md border border-red-400/30 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-300 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white/85 mb-2">
              Nom complet
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Jean Dupont"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/85 mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="superviseur@bfs.cd"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="airportCode" className="block text-sm font-medium text-white/85 mb-2">
              Aéroport
            </label>
            <select
              id="airportCode"
              name="airportCode"
              value={formData.airportCode}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              disabled={loading}
            >
              <option value="">Sélectionner un aéroport</option>
              <optgroup label="Aéroports RDC (10)">
                {getDomesticAirports().map((airport) => (
                  <option key={airport.code} value={airport.code}>
                    {airport.name} ({airport.code})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Destinations internationales (7)">
                {getInternationalAirports().map((airport) => (
                  <option key={airport.code} value={airport.code}>
                    {airport.name}, {airport.country} ({airport.code})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/85 mb-2">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/85 mb-2">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Inscription...' : 'Créer mon compte'}
          </button>
        </form>

        {/* Lien vers la connexion */}
        <div className="mt-6 text-center">
          <p className="text-sm text-white/80">
            Vous avez déjà un compte ?{' '}
            <Link
              to="/login"
              className="font-medium text-primary-300 hover:text-primary-200 transition"
            >
              Se connecter
            </Link>
          </p>
        </div>

        {/* Note d'information */}
        <div className="mt-6 pt-6 border-t border-white/20">
          <div className="flex items-start">
            <Plane className="w-5 h-5 text-primary-300 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/70">
              Ce compte vous permettra de gérer les opérations de bagages et de passagers pour votre aéroport.
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
