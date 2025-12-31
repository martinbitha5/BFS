import { AlertCircle, Package, ShieldAlert, UserCheck, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface BaggageAuthorizationRequest {
  id: string;
  passenger_id: string;
  tag_number: string;
  requested_baggage_count: number;
  declared_baggage_count: number;
  current_baggage_count: number;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  baggage_id: string | null;
  notes: string | null;
  airport_code: string;
  flight_number: string;
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

export default function BaggageAuthorization() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<BaggageAuthorizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<BaggageAuthorizationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Vérifier que l'utilisateur est support
  useEffect(() => {
    if (!authLoading && user && user.role !== 'support') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/baggage-authorization/requests', {
        params: {
          status: filter === 'all' ? undefined : filter
        }
      });

      if (response.data.success) {
        setRequests(response.data.data || []);
      } else {
        setError(response.data.error || 'Erreur lors du chargement des demandes');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir approuver cette demande et créer le bagage ?')) {
      return;
    }

    try {
      setApproving(true);
      const response = await api.post(`/api/v1/baggage-authorization/requests/${requestId}/approve`);

      if (response.data.success) {
        await fetchRequests();
        setSelectedRequest(null);
        alert('Demande approuvée et bagage créé avec succès');
      } else {
        alert(response.data.error || 'Erreur lors de l\'approbation');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors de l\'approbation');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      alert('Veuillez fournir une raison de rejet');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir rejeter cette demande ?')) {
      return;
    }

    try {
      setRejecting(true);
      const response = await api.post(`/api/v1/baggage-authorization/requests/${requestId}/reject`, {
        rejection_reason: rejectionReason
      });

      if (response.data.success) {
        await fetchRequests();
        setSelectedRequest(null);
        setRejectionReason('');
        alert('Demande rejetée');
      } else {
        alert(response.data.error || 'Erreur lors du rejet');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors du rejet');
    } finally {
      setRejecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">En attente</span>;
      case 'approved':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Approuvé</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Rejeté</span>;
      default:
        return null;
    }
  };

  // Afficher un loader pendant le chargement de l'authentification
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si l'utilisateur n'est pas support, afficher un message d'accès refusé
  if (!user || user.role !== 'support') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h2>
          <p className="text-gray-600 mb-4">Seuls les utilisateurs support peuvent accéder à cette page.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-8 h-8 text-primary-600" />
            Autorisations de Bagages Supplémentaires
          </h1>
          <p className="text-gray-600 mt-1">Approuver ou rejeter les demandes de bagages dépassant le nombre déclaré dans le boarding pass</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Toutes
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'pending' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          En attente ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'approved' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Approuvées
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'rejected' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Rejetées
        </button>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Liste des demandes */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des demandes...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aucune demande {filter !== 'all' ? filter === 'pending' ? 'en attente' : filter === 'approved' ? 'approuvée' : 'rejetée' : ''}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Passager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tag RFID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bagages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{request.passengers?.full_name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">PNR: {request.passengers?.pnr || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                      {request.tag_number}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {request.current_baggage_count} / {request.declared_baggage_count} déclaré(s)
                      </div>
                      <div className="text-red-600 font-semibold">
                        +{request.requested_baggage_count - request.declared_baggage_count} supplémentaire(s)
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.flight_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.requested_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={approving}
                          className="text-green-600 hover:text-green-900 flex items-center gap-1 disabled:opacity-50"
                        >
                          <UserCheck className="w-4 h-4" />
                          Approuver
                        </button>
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="text-red-600 hover:text-red-900 flex items-center gap-1"
                        >
                          <UserX className="w-4 h-4" />
                          Rejeter
                        </button>
                      </div>
                    )}
                    {request.status === 'rejected' && request.rejection_reason && (
                      <div className="text-xs text-gray-500 max-w-xs truncate" title={request.rejection_reason}>
                        Raison: {request.rejection_reason}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de rejet */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Rejeter la demande</h3>
            <p className="text-sm text-gray-600 mb-4">
              Vous êtes sur le point de rejeter la demande de bagage supplémentaire pour <strong>{selectedRequest.passengers?.full_name}</strong> (Tag: {selectedRequest.tag_number})
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Raison du rejet *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={4}
                placeholder="Expliquez pourquoi cette demande est rejetée..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={rejecting}
              >
                Annuler
              </button>
              <button
                onClick={() => handleReject(selectedRequest.id)}
                disabled={rejecting || !rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejecting ? 'Rejet en cours...' : 'Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

