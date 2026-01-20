import { AlertCircle, CheckCircle, Mail, Trash2 } from 'lucide-react';
import { useState } from 'react';
import api from '../config/api';

interface DeletionResponse {
  success: boolean;
  message: string;
  error?: string;
  data?: {
    requestId: string;
    email: string;
    expiresAt: string;
  };
}

export default function DataDeletionRequest() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await api.post<DeletionResponse>('/api/v1/auth/request-deletion', {
        email,
        reason
      });

      if (response.data.success) {
        setSuccess(true);
        setEmail('');
        setReason('');
        // Scroll to top
        window.scrollTo(0, 0);
      } else {
        setError(response.data.error || 'Erreur lors de la demande');
      }
    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.response?.data?.error || err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center relative"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/40 z-0"></div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="bg-black/30 backdrop-blur text-white shadow-lg mb-8 border-b border-white/10">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3">
              <Trash2 className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Suppression de compte</h1>
                <p className="text-white/70 mt-1">Demande de suppression de votre compte et de vos données associées</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="max-w-2xl mx-auto px-4 pb-8">

        {/* Success Message */}
        {success && (
          <div className="bg-black/30 backdrop-blur rounded-lg shadow-2xl p-8 mb-6 border border-white/10">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-white text-xl mb-3">✅ Demande reçue avec succès</h3>
                <div className="bg-black/20 backdrop-blur p-4 rounded-lg border border-white/10 text-sm text-white/90 space-y-2">
                  <p className="font-semibold text-white">Prochaines étapes:</p>
                  <ul className="list-disc list-inside space-y-1.5 text-white/80">
                    <li>Un email de confirmation a été envoyé à <strong>{email}</strong></li>
                    <li>Votre demande sera traitée sous <strong>30 jours</strong></li>
                    <li>Toutes vos données seront supprimées de nos serveurs</li>
                    <li>Vous serez notifié une fois le processus terminé</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-black/30 backdrop-blur rounded-lg shadow-2xl p-6 mb-6 border border-white/10">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-white mb-2">❌ Erreur</h3>
                <p className="text-white/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {!success && (
          <div className="bg-black/30 backdrop-blur rounded-lg shadow-2xl p-8 border border-white/10">
            {/* Warning Box */}
            <div className="mb-8 p-5 bg-black/20 backdrop-blur border border-orange-400/30 rounded-lg">
              <p className="text-sm text-orange-300 font-semibold">
                ⚠️ <strong>Important:</strong> La suppression de votre compte est <strong>permanente</strong> et <strong>irréversible</strong>.
                Tous vos données seront supprimées de nos serveurs.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-white mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-400" />
                    Adresse email associée au compte
                  </div>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemple@email.com"
                  className="w-full px-4 py-3 border-2 border-white/20 rounded-lg focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition bg-white/10 text-white placeholder-white/50 text-lg"
                  required
                />
                <p className="text-xs text-white/60 mt-2">
                  ℹ️ L'email doit correspondre exactement à celui de votre compte
                </p>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-bold text-white mb-3">
                  Raison de la suppression <span className="text-white/50 font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Aidez-nous à améliorer nos services..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-white/20 rounded-lg focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition resize-none bg-white/10 text-white placeholder-white/50"
                />
                <p className="text-xs text-white/60 mt-2">
                  Vos commentaires nous aideront à mieux servir nos utilisateurs
                </p>
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-black/20 backdrop-blur rounded-lg border border-white/10">
                <input
                  type="checkbox"
                  id="confirm"
                  required
                  className="w-5 h-5 text-red-500 rounded focus:ring-red-400 mt-0.5 cursor-pointer"
                />
                <label htmlFor="confirm" className="text-sm font-medium text-white cursor-pointer flex-1">
                  Je comprends que cette action supprimera <strong>définitivement</strong> mon compte et <strong>toutes les données associées</strong>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition transform hover:scale-105 flex items-center justify-center gap-2 text-lg shadow-lg"
              >
                <Trash2 className="w-5 h-5" />
                {loading ? 'Traitement en cours...' : 'Demander la suppression'}
              </button>
            </form>

            {/* Info Box */}
            <div className="mt-8 p-6 bg-black/20 backdrop-blur rounded-lg border border-white/30">
              <h3 className="font-bold text-white mb-4 text-lg">ℹ️ Informations importantes</h3>
              <ul className="space-y-3 text-sm text-white/80">
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>Vous recevrez un <strong>email de confirmation</strong> à l'adresse fournie</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>Délai de traitement: <strong>30 jours maximum</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>Les données seront supprimées de <strong>tous nos serveurs</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400 font-bold">•</span>
                  <span>Cette action <strong>ne peut pas être annulée</strong></span>
                </li>
              </ul>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
