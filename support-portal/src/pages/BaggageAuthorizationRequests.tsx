import { AlertCircle, Calendar, CheckCircle, Clock, Package, Plane, Tag, User, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface AuthorizationRequest {
  id: string;
  pnr: string;
  rfid_tag: string;
  additional_baggage_count: number;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  rejection_reason?: string;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  airport_code: string;
  passengers: {
    id: string;
    full_name: string;
    pnr: string;
    flight_number: string;
    departure: string;
    arrival: string;
    baggage_count: number;
  };
}

export default function BaggageAuthorizationRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AuthorizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/v1/baggage-authorization/requests?status=pending');
      const data = response.data as any;
      
      if (data.success) {
        setRequests(data.data);
      } else {
        setError('Erreur lors du chargement des demandes');
      }
    } catch (err: any) {
      console.error('Erreur chargement demandes:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      setProcessing(requestId);
      setError(null);
      setSuccess(null);

      const response = await api.post(`/api/v1/baggage-authorization/requests/${requestId}/approve`, {
        notes: 'Approuvé par le support'
      });

      const data = response.data as any;
      if (data.success) {
        setSuccess('Demande approuvée avec succès');
        // Recharger la liste
        await loadRequests();
      } else {
        setError(data.error || 'Erreur lors de l\'approbation');
      }
    } catch (err: any) {
      console.error('Erreur approbation:', err);
      setError(err.response?.data?.error || 'Erreur lors de l\'approbation');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string, rejectionReason: string) => {
    try {
      setProcessing(requestId);
      setError(null);
      setSuccess(null);

      const response = await api.post(`/api/v1/baggage-authorization/requests/${requestId}/reject`, {
        rejection_reason: rejectionReason
      });

      const data = response.data as any;
      if (data.success) {
        setSuccess('Demande rejetée avec succès');
        // Recharger la liste
        await loadRequests();
      } else {
        setError(data.error || 'Erreur lors du rejet');
      }
    } catch (err: any) {
      console.error('Erreur rejet:', err);
      setError(err.response?.data?.error || 'Erreur lors du rejet');
    } finally {
      setProcessing(null);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (!user) return null;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Demandes d'Autorisation Bagages</h1>
        <p className="text-white/60">Gérer les demandes d'autorisation pour les bagages supplémentaires</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center text-red-200">
          <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
          <span>{error}</span>
          <button onClick={clearMessages} className="ml-auto text-red-400 hover:text-red-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center text-green-200">
          <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
          <span>{success}</span>
          <button onClick={clearMessages} className="ml-auto text-green-400 hover:text-green-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-blue-400 mr-3" />
            <div>
              <div className="text-2xl font-bold text-blue-300">{requests.length}</div>
              <div className="text-blue-300/70">Demandes en attente</div>
            </div>
          </div>
        </div>
        
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-400 mr-3" />
            <div>
              <div className="text-2xl font-bold text-green-300">
                {requests.filter(r => r.status === 'approved').length}
              </div>
              <div className="text-green-300/70">Approuvées aujourd'hui</div>
            </div>
          </div>
        </div>
        
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-red-400 mr-3" />
            <div>
              <div className="text-2xl font-bold text-red-300">
                {requests.filter(r => r.status === 'rejected').length}
              </div>
              <div className="text-red-300/70">Rejetées aujourd'hui</div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des demandes */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Demandes en attente</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Chargement des demandes...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Aucune demande d'autorisation en attente</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {requests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* En-tête */}
                    <div className="flex items-center mb-3">
                      <User className="w-5 h-5 text-blue-400 mr-2" />
                      <h3 className="text-lg font-semibold text-white">
                        {request.passengers?.full_name || 'Passager inconnu'}
                      </h3>
                      <span className="ml-3 px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
                        En attente
                      </span>
                    </div>

                    {/* Détails */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center text-gray-300">
                        <Tag className="w-4 h-4 text-gray-500 mr-2" />
                        <span>Tag RFID: <span className="font-mono">{request.rfid_tag}</span></span>
                      </div>
                      
                      <div className="flex items-center text-gray-300">
                        <Plane className="w-4 h-4 text-gray-500 mr-2" />
                        <span>Vol: {request.passengers?.flight_number || 'N/A'}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-300">
                        <User className="w-4 h-4 text-gray-500 mr-2" />
                        <span>PNR: <span className="font-mono">{request.pnr}</span></span>
                      </div>
                      
                      <div className="flex items-center text-gray-300">
                        <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                        <span>Demandé: {new Date(request.requested_at).toLocaleString('fr-FR')}</span>
                      </div>
                    </div>

                    {/* Bagages */}
                    <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
                      <div className="text-sm text-gray-300">
                        <span className="font-medium">Bagages déclarés:</span> {request.passengers?.baggage_count || 0}
                        <span className="mx-2">→</span>
                        <span className="font-medium">Bagages demandés:</span> {request.passengers?.baggage_count || 0 + request.additional_baggage_count}
                        <span className="ml-2 text-yellow-400">(+{request.additional_baggage_count} bagage(s) supplémentaire(s))</span>
                      </div>
                    </div>

                    {/* Notes */}
                    {request.notes && (
                      <div className="mt-3">
                        <span className="text-sm font-medium text-gray-400">Notes:</span>
                        <p className="text-sm text-gray-300 mt-1">{request.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="ml-6 flex space-x-2">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processing === request.id}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      {processing === request.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      Approuver
                    </button>
                    
                    <button
                      onClick={() => {
                        const reason = prompt('Raison du rejet (obligatoire):');
                        if (reason && reason.trim()) {
                          handleReject(request.id, reason.trim());
                        }
                      }}
                      disabled={processing === request.id}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}