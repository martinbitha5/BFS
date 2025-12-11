import axios from 'axios';
import { Calendar, CheckCircle, Package, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

// URL de l'API depuis les variables d'environnement
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface BIRSReport {
  id: string;
  flight_number: string;
  airline_code: string;
  airline_name: string;
  uploaded_at: string;
  file_name: string;
  total_baggages: number;
  reconciled_count: number;
  missing_count: number;
  status: string;
}

export default function History() {
  const { airline } = useAuth();
  const [reports, setReports] = useState<BIRSReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_URL}/api/v1/birs/history?airline_code=${airline?.code}`);
      setReports(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (airline?.code) {
      fetchReports();
    }
  }, [airline]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'À vérifier (0%)': { bg: 'bg-orange-100', text: 'text-orange-800', icon: XCircle },
      'Complet': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      icon: Package,
    };

    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  return (
    <Layout>
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Historique des rapports</h1>
            <p className="text-white/90">
              Consultez l'historique de vos uploads BIRS (lecture seule)
            </p>
          </div>

          <button
            onClick={fetchReports}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-black/30 backdrop-blur-md border border-white/20 text-primary-600 rounded-lg hover:bg-black/40 disabled:opacity-50 transition-colors shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading && !error ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Aucun rapport</h3>
            <p className="text-gray-500">Vous n'avez pas encore uploadé de fichiers BIRS</p>
          </div>
        ) : (
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compagnie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bagages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="bg-black/25 backdrop-blur-md divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-black/35 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-white">{report.flight_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(report.uploaded_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {report.airline_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      IST → FIH
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {report.total_baggages} ({report.reconciled_count} OK, {report.missing_count} manquants)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Mode lecture seule</h3>
          <p className="text-sm text-yellow-800">
            Cette page affiche l'historique de vos uploads. La réconciliation des bagages est gérée par
            l'équipe de supervision de l'aéroport. Vous ne pouvez pas effectuer d'actions de réconciliation
            depuis ce portail.
          </p>
        </div>
      </div>
    </Layout>
  );
}
