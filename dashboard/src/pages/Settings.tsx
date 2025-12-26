/**
 * Page des Paramètres
 * Configuration personnalisée pour chaque utilisateur
 */

import {
  Bell,
  Check,
  Clock,
  Globe,
  Lock,
  Mail,
  Moon,
  Monitor,
  Palette,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sun,
  User,
  Volume2,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../config/api';

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    sound: boolean;
    rushBaggage: boolean;
    unboardedPassengers: boolean;
    birsReconciliation: boolean;
  };
  display: {
    language: 'fr' | 'en';
    refreshInterval: number; // en secondes
    showStats: boolean;
    compactMode: boolean;
  };
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  notifications: {
    email: true,
    push: true,
    sound: true,
    rushBaggage: true,
    unboardedPassengers: true,
    birsReconciliation: true,
  },
  display: {
    language: 'fr',
    refreshInterval: 30,
    showStats: true,
    compactMode: false,
  }
};

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    // Charger depuis localStorage
    const saved = localStorage.getItem('bfs_user_settings');
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Sauvegarder localement
      localStorage.setItem('bfs_user_settings', JSON.stringify(settings));
      
      // Appliquer le thème
      applyTheme(settings.theme);
      
      setSuccess('Paramètres enregistrés avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      setSaving(true);
      // Appeler l'API pour changer le mot de passe
      await api.post('/api/v1/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setSuccess('Mot de passe modifié avec succès');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du changement de mot de passe');
    } finally {
      setSaving(false);
    }
  };

  const updateNotification = (key: keyof UserSettings['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const updateDisplay = (key: keyof UserSettings['display'], value: any) => {
    setSettings(prev => ({
      ...prev,
      display: {
        ...prev.display,
        [key]: value
      }
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <SettingsIcon className="w-8 h-8 mr-3" />
            Paramètres
          </h1>
          <p className="text-white/70 mt-1">
            Personnalisez votre expérience
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center transition-colors disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Enregistrer
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-900/30 backdrop-blur-md border border-red-500/30 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-300">{error}</span>
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

      {/* Profil */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
          <User className="w-5 h-5 mr-2" />
          Profil
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Nom complet</label>
            <p className="text-white font-medium">{user?.full_name}</p>
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Email</label>
            <p className="text-white font-medium flex items-center">
              <Mail className="w-4 h-4 mr-2 text-white/50" />
              {user?.email}
            </p>
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Rôle</label>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-900/40 text-primary-300 border border-primary-500/30">
              <Shield className="w-4 h-4 mr-1" />
              {user?.role}
            </span>
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Aéroport</label>
            <p className="text-white font-medium">{user?.airport_code}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center transition-colors"
          >
            <Lock className="w-4 h-4 mr-2" />
            Changer le mot de passe
          </button>
        </div>
      </div>

      {/* Thème */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Palette className="w-5 h-5 mr-2" />
          Apparence
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setSettings(prev => ({ ...prev, theme: 'light' }))}
            className={`p-4 rounded-lg border-2 transition-all ${
              settings.theme === 'light'
                ? 'border-primary-500 bg-primary-900/30'
                : 'border-white/20 hover:border-white/40'
            }`}
          >
            <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
            <span className="block text-sm text-white">Clair</span>
          </button>
          <button
            onClick={() => setSettings(prev => ({ ...prev, theme: 'dark' }))}
            className={`p-4 rounded-lg border-2 transition-all ${
              settings.theme === 'dark'
                ? 'border-primary-500 bg-primary-900/30'
                : 'border-white/20 hover:border-white/40'
            }`}
          >
            <Moon className="w-6 h-6 mx-auto mb-2 text-blue-400" />
            <span className="block text-sm text-white">Sombre</span>
          </button>
          <button
            onClick={() => setSettings(prev => ({ ...prev, theme: 'system' }))}
            className={`p-4 rounded-lg border-2 transition-all ${
              settings.theme === 'system'
                ? 'border-primary-500 bg-primary-900/30'
                : 'border-white/20 hover:border-white/40'
            }`}
          >
            <Monitor className="w-6 h-6 mx-auto mb-2 text-white/70" />
            <span className="block text-sm text-white">Système</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Notifications
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <div className="flex items-center">
              <Mail className="w-5 h-5 mr-3 text-white/50" />
              <div>
                <p className="text-white font-medium">Notifications par email</p>
                <p className="text-sm text-white/60">Recevoir les alertes par email</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.email}
                onChange={(e) => updateNotification('email', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <div className="flex items-center">
              <Bell className="w-5 h-5 mr-3 text-white/50" />
              <div>
                <p className="text-white font-medium">Notifications push</p>
                <p className="text-sm text-white/60">Notifications dans le navigateur</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.push}
                onChange={(e) => updateNotification('push', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <div className="flex items-center">
              <Volume2 className="w-5 h-5 mr-3 text-white/50" />
              <div>
                <p className="text-white font-medium">Sons</p>
                <p className="text-sm text-white/60">Alertes sonores</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.sound}
                onChange={(e) => updateNotification('sound', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <h3 className="text-sm font-medium text-white/70 pt-2">Types d'alertes</h3>

          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <div>
              <p className="text-white font-medium">Bagages Rush</p>
              <p className="text-sm text-white/60">Alertes pour les bagages en urgence</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.rushBaggage}
                onChange={(e) => updateNotification('rushBaggage', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <div>
              <p className="text-white font-medium">Passagers non embarqués</p>
              <p className="text-sm text-white/60">Alertes pour les passagers manquants</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.unboardedPassengers}
                onChange={(e) => updateNotification('unboardedPassengers', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-white font-medium">Réconciliation BIRS</p>
              <p className="text-sm text-white/60">Notifications de réconciliation</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.birsReconciliation}
                onChange={(e) => updateNotification('birsReconciliation', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Affichage */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Monitor className="w-5 h-5 mr-2" />
          Affichage
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-2 flex items-center">
              <Globe className="w-4 h-4 mr-2" />
              Langue
            </label>
            <select
              value={settings.display.language}
              onChange={(e) => updateDisplay('language', e.target.value)}
              className="w-full md:w-64 px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Intervalle de rafraîchissement automatique
            </label>
            <select
              value={settings.display.refreshInterval}
              onChange={(e) => updateDisplay('refreshInterval', parseInt(e.target.value))}
              className="w-full md:w-64 px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={10}>10 secondes</option>
              <option value={30}>30 secondes</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={0}>Désactivé</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-white/10 mt-4 pt-4">
            <div>
              <p className="text-white font-medium">Afficher les statistiques</p>
              <p className="text-sm text-white/60">Statistiques sur le dashboard</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.display.showStats}
                onChange={(e) => updateDisplay('showStats', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-white font-medium">Mode compact</p>
              <p className="text-sm text-white/60">Interface condensée</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.display.compactMode}
                onChange={(e) => updateDisplay('compactMode', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Modal Changement de mot de passe */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-white/20 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Changer le mot de passe
              </h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

