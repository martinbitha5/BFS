import { Building, Hash, Lock, Mail, Plane } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Signup() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      await signup(name, code, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
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
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Plane className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('dashboard.title')}</h1>
          <p className="text-primary-100">{t('signup.subtitle')}</p>
        </div>

        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-2">{t('signup.title')}</h2>
          <p className="text-sm text-white/70 mb-6">{t('signup.subtitle')}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 backdrop-blur-md border border-red-400/30 rounded-md">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/85 mb-2">
                {t('signup.airlineName')} *
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('signup.airlineName.placeholder')}
                />
              </div>
              <p className="text-xs text-white/60 mt-1">{t('signup.airlineName.help')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/85 mb-2">
                {t('signup.iataCode')} *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  maxLength={2}
                  pattern="[A-Z]{2}"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
                  placeholder="ET"
                />
              </div>
              <p className="text-xs text-white/60 mt-1">{t('signup.iataCode.help')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/85 mb-2">
                {t('signup.contactEmail')} *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('signup.contactEmail.placeholder')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/85 mb-2">
                {t('signup.password')} *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/85 mb-2">
                {t('signup.confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? `${t('signup.button')}...` : t('signup.button')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-white/70">
              {t('signup.hasAccount')}{' '}
              <Link to="/login" className="text-primary-300 hover:text-primary-200 font-medium">
                {t('signup.login')}
              </Link>
            </p>
          </div>

          {/* Informations sur l'utilisation */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-400/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-200 mb-2 flex items-center">
                <Plane className="w-4 h-4 mr-2" />
                {t('signup.info.title')}
              </h3>
              <ul className="text-xs text-white/70 space-y-1">
                <li>• {t('signup.info.line1')}</li>
                <li>• {t('signup.info.line2')}</li>
                <li>• {t('signup.info.line3')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
