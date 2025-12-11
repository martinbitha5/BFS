import { AlertCircle, CheckCircle, FileText, Package, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface BirsReport {
  id: string;
  report_type: string;
  flight_number: string;
  flight_date: string;
  origin: string;
  destination: string;
  airline: string;
  file_name: string;
  uploaded_at: string;
  total_baggages: number;
  reconciled_count: number;
  unmatched_count: number;
  processed_at?: string;
}

export default function BIRS() {
  const { user } = useAuth();
  const [reports, setReports] = useState<BirsReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user?.airport_code) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    if (!user?.airport_code) return;
    
    try {
      setLoading(true);
      // Récupérer les rapports uploadés par les compagnies aériennes
      const response = await api.get(`/api/v1/birs/reports?airport=${user.airport_code}`);
      setReports(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des rapports' });
    } finally {
      setLoading(false);
    }
  };


  const handleReconcile = async (reportId: string) => {
    if (!user?.airport_code) return;

    try {
      setMessage(null);
      const response = await api.post(`/api/v1/birs/reconcile/${reportId}`, {
        airportCode: user.airport_code
      });

      if (response.data.success) {
        const { matchedCount, unmatchedCount } = response.data.data;
        setMessage({ 
          type: 'success', 
          text: `Réconciliation terminée: ${matchedCount} bagages matchés, ${unmatchedCount} non matchés` 
        });
        fetchReports();
      }
    } catch (err: any) {
      console.error('Error reconciling:', err);
      setMessage({ 
        type: 'error', 
        text: 'Erreur lors de la réconciliation' 
      });
    }
  };

  const getStatusBadge = (report: BirsReport) => {
    if (!report.processed_at) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">En attente</span>;
    }
    
    const rate = report.total_baggages > 0 
      ? (report.reconciled_count / report.total_baggages) * 100 
      : 0;

    if (rate >= 90) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Excellent ({rate.toFixed(0)}%)</span>;
    } else if (rate >= 70) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Bon ({rate.toFixed(0)}%)</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">À vérifier ({rate.toFixed(0)}%)</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">
            <Package className="w-8 h-8 inline mr-2" />
            Rapports BIRS - Bagages Internationaux
          </h1>
          <p className="text-white/80 mt-1">
            Importation et réconciliation des fichiers des compagnies aériennes
          </p>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <XCircle className="w-5 h-5 mr-2" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Info message - Seules les compagnies peuvent uploader */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex">
          <AlertCircle className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800 mb-1">
              📋 Mode lecture seule
            </h3>
            <p className="text-sm text-yellow-700">
              Les fichiers BIRS sont uploadés directement par les <strong>compagnies aériennes internationales</strong> via leur portail dédié. 
              En tant que superviseur, vous pouvez <strong>visualiser</strong> ces rapports et effectuer des <strong>actions de réconciliation</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Liste des rapports */}
      <div className="bg-white/95 backdrop-blur-lg shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            Historique des rapports
          </h2>
          <button
            onClick={fetchReports}
            className="text-primary-600 hover:text-primary-700"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-white/60" />
            <p className="text-white/70 mt-2">Chargement...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-white/70">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p>Aucun rapport uploadé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-black/25 backdrop-blur-md border border-white/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Vol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Compagnie</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Bagages</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white/95 backdrop-blur-lg divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-black/25 backdrop-blur-md border border-white/20">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {report.flight_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                      {new Date(report.flight_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                      {report.airline}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                      {report.origin} → {report.destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{report.total_baggages}</span>
                        {report.processed_at && (
                          <>
                            <span className="text-green-600">({report.reconciled_count} OK)</span>
                            {report.unmatched_count > 0 && (
                              <span className="text-orange-600">({report.unmatched_count} !)</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!report.processed_at ? (
                        <button
                          onClick={() => handleReconcile(report.id)}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Lancer réconciliation
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReconcile(report.id)}
                          className="text-white/80 hover:text-white/85"
                        >
                          Re-traiter
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aide */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          <AlertCircle className="w-4 h-4 inline mr-1" />
          À propos de la réconciliation BIRS
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Les fichiers BIRS sont uploadés par les compagnies aériennes via le <strong>Portail Airlines</strong></li>
          <li>• La réconciliation compare ces fichiers avec les bagages scannés à l'arrivée à FIH</li>
          <li>• Cliquez sur <strong>"Lancer réconciliation"</strong> pour matcher les bagages automatiquement</li>
          <li>• Les bagages non matchés peuvent être déclarés en <strong>RUSH</strong> (réacheminement)</li>
          <li>• Vous pouvez re-traiter un rapport si de nouveaux bagages arrivent</li>
        </ul>
      </div>
    </div>
  );
}
