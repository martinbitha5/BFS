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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900">Suppression de compte</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Demande de suppression de votre compte et de vos données associées
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-green-900 mb-2">✅ Demande reçue</h3>
                <p className="text-green-800 mb-3">
                  Votre demande de suppression a été enregistrée avec succès.
                </p>
                <div className="bg-white p-4 rounded border border-green-200 text-sm text-gray-700">
                  <p className="mb-2"><strong>Prochaines étapes:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Vous recevrez un email de confirmation à <strong>{email}</strong></li>
                    <li>Votre demande sera traitée sous 30 jours</li>
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
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-900 mb-2">❌ Erreur</h3>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {!success && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm text-gray-700">
                <strong>Important:</strong> La suppression de votre compte est permanente et irréversible.
                Tous vos données seront supprimées de nos serveurs.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Adresse email associée au compte
                  </div>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemple@email.com"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  L'email doit correspondre à celui de votre compte
                </p>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Raison de la suppression (optionnel)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Aidez-nous à améliorer nos services..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Vos commentaires nous aideront à mieux servir nos utilisateurs
                </p>
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="confirm"
                  required
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500 mt-0.5"
                />
                <label htmlFor="confirm" className="text-sm text-gray-700">
                  Je comprends que cette action supprimera définitivement mon compte et toutes les données associées
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                {loading ? 'Traitement en cours...' : 'Demander la suppression'}
              </button>
            </form>

            {/* Info Box */}
            <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3">ℹ️ Informations importantes</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Vous recevrez un email de confirmation à l'adresse fournie</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Délai de traitement: 30 jours maximum</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Les données seront supprimées de tous nos serveurs</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Cette action ne peut pas être annulée</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
