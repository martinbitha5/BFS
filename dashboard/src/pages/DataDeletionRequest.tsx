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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 p-4 pt-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trash2 className="w-8 h-8 text-white" />
            <h1 className="text-4xl font-bold text-white">Suppression de compte</h1>
          </div>
          <p className="text-blue-100 text-lg">
            Demande de suppression de votre compte et de vos données associées
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-white rounded-lg shadow-2xl p-8 mb-6 border-l-4 border-green-500">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-green-900 text-xl mb-3">✅ Demande reçue avec succès</h3>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-sm text-gray-700 space-y-2">
                  <p className="font-semibold text-gray-900">Prochaines étapes:</p>
                  <ul className="list-disc list-inside space-y-1.5 text-gray-700">
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
          <div className="bg-white rounded-lg shadow-2xl p-6 mb-6 border-l-4 border-red-500">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-900 mb-2">❌ Erreur</h3>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {!success && (
          <div className="bg-white rounded-lg shadow-2xl p-8">
            {/* Warning Box */}
            <div className="mb-8 p-5 bg-orange-50 border-2 border-orange-200 rounded-lg">
              <p className="text-sm text-orange-900 font-semibold">
                ⚠️ <strong>Important:</strong> La suppression de votre compte est <strong>permanente</strong> et <strong>irréversible</strong>.
                Tous vos données seront supprimées de nos serveurs.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    Adresse email associée au compte
                  </div>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemple@email.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition text-lg"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  ℹ️ L'email doit correspondre exactement à celui de votre compte
                </p>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Raison de la suppression <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Aidez-nous à améliorer nos services..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Vos commentaires nous aideront à mieux servir nos utilisateurs
                </p>
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border-2 border-red-200">
                <input
                  type="checkbox"
                  id="confirm"
                  required
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500 mt-0.5 cursor-pointer"
                />
                <label htmlFor="confirm" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
                  Je comprends que cette action supprimera <strong>définitivement</strong> mon compte et <strong>toutes les données associées</strong>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition transform hover:scale-105 flex items-center justify-center gap-2 text-lg shadow-lg"
              >
                <Trash2 className="w-5 h-5" />
                {loading ? 'Traitement en cours...' : 'Demander la suppression'}
              </button>
            </form>

            {/* Info Box */}
            <div className="mt-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">ℹ️ Informations importantes</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Vous recevrez un <strong>email de confirmation</strong> à l'adresse fournie</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Délai de traitement: <strong>30 jours maximum</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Les données seront supprimées de <strong>tous nos serveurs</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Cette action <strong>ne peut pas être annulée</strong></span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
