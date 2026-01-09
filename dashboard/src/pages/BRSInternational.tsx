import { CheckCircle, Download, FileText, Package, RefreshCw, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface BIRSReport {
  id: string;
  report_type: string;
  flight_number: string;
  flight_date: string;
  origin: string;
  destination: string;
  airline: string;
  file_name: string;
  total_baggages: number;
  reconciled_count: number;
  unmatched_count: number;
  uploaded_at: string;
  processed_at: string | null;
}

interface BIRSStats {
  totalInternationalBaggages: number;
  scanned: number;
  reconciled: number;
  unmatched: number;
  totalReports: number;
}

interface ReportItem {
  id: string;
  bag_id: string;
  passenger_name: string;
  pnr: string;
  seat_number: string;
  weight: number;
  route: string;
  reconciled_at: string | null;
}

export default function BRSInternational() {
  const { user } = useAuth();
  
  const [reports, setReports] = useState<BIRSReport[]>([]);
  const [stats, setStats] = useState<BIRSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [selectedReport, setSelectedReport] = useState<BIRSReport | null>(null);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.airport_code) return;

    try {
      setError('');
      
      const [reportsRes, statsRes] = await Promise.all([
        api.get('/api/v1/birs/reports'),
        api.get(`/api/v1/birs/statistics/${user.airport_code}`)
      ]);

      setReports((reportsRes.data as { data: BIRSReport[] }).data || []);
      setStats((statsRes.data as { data: BIRSStats }).data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [user?.airport_code]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const viewReport = async (report: BIRSReport) => {
    setSelectedReport(report);
    setLoadingItems(true);

    try {
      const response = await api.get(`/api/v1/birs/reports/${report.id}`);
      const data = response.data as { data: { items: ReportItem[] } };
      setReportItems(data.data.items || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur chargement détails');
    } finally {
      setLoadingItems(false);
    }
  };

  const reconcileReport = async (reportId: string) => {
    if (!user?.airport_code) return;

    setReconciling(true);
    setError('');

    try {
      const response = await api.post(`/api/v1/birs/reconcile/${reportId}`, {
        airportCode: user.airport_code
      });

      const data = response.data as { data: { matchedCount: number; unmatchedCount: number } };
      setSuccess(`Réconciliation: ${data.data.matchedCount} matchés, ${data.data.unmatchedCount} non matchés`);
      fetchData();
      
      if (selectedReport?.id === reportId) {
        viewReport(selectedReport);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur réconciliation');
    } finally {
      setReconciling(false);
    }
  };

  const exportReport = async (reportId: string, flightNumber: string) => {
    try {
      const response = await api.get(`/api/v1/birs/reports/${reportId}/export?airport=${user?.airport_code}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data as BlobPart], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BRS_${flightNumber}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur export');
    }
  };

  if (loading) {
    return <LoadingPlane text="Chargement des rapports BIRS..." size="md" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-primary-400" />
            BRS International
          </h1>
          <p className="text-sm text-white/60">
            Rapports uploadés par les compagnies aériennes via le portail
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-300">{success}</p>
        </div>
      )}

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{stats.totalReports}</p>
            <p className="text-sm text-white/60">Rapports</p>
          </div>
          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{stats.totalInternationalBaggages}</p>
            <p className="text-sm text-white/60">Bagages Int.</p>
          </div>
          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-4">
            <p className="text-2xl font-bold text-blue-400">{stats.scanned}</p>
            <p className="text-sm text-white/60">Scannés</p>
          </div>
          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-4">
            <p className="text-2xl font-bold text-green-400">{stats.reconciled}</p>
            <p className="text-sm text-white/60">Réconciliés</p>
          </div>
          <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-4">
            <p className="text-2xl font-bold text-orange-400">{stats.unmatched}</p>
            <p className="text-sm text-white/60">Non matchés</p>
          </div>
        </div>
      )}

      {/* Liste des rapports */}
      <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-400" />
            Rapports BIRS
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Vol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Bagages</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white/50 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/50">
                    Aucun rapport BIRS
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-white/5">
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{report.flight_number}</p>
                      <p className="text-xs text-white/50">{report.airline}</p>
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      {report.origin} → {report.destination}
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      {new Date(report.flight_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white">{report.total_baggages}</span>
                      <span className="text-white/50 text-sm ml-1">
                        ({report.reconciled_count} ✓)
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {report.processed_at ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Traité
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-400 text-sm">
                          <XCircle className="w-4 h-4" />
                          En attente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => viewReport(report)}
                          className="px-3 py-1 text-sm bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30"
                        >
                          Voir
                        </button>
                        <button
                          onClick={() => reconcileReport(report.id)}
                          disabled={reconciling}
                          className="px-3 py-1 text-sm bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 disabled:opacity-50"
                        >
                          Réconcilier
                        </button>
                        <button
                          onClick={() => exportReport(report.id, report.flight_number)}
                          className="px-3 py-1 text-sm bg-purple-500/20 text-purple-300 rounded hover:bg-purple-500/30"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Détails du rapport sélectionné */}
      {selectedReport && (
        <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Détails: {selectedReport.flight_number} - {selectedReport.flight_date}
            </h2>
            <button
              onClick={() => setSelectedReport(null)}
              className="text-white/50 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="p-6">
            {loadingItems ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-2 text-left text-xs text-white/50">Tag</th>
                      <th className="px-4 py-2 text-left text-xs text-white/50">Passager</th>
                      <th className="px-4 py-2 text-left text-xs text-white/50">PNR</th>
                      <th className="px-4 py-2 text-left text-xs text-white/50">Siège</th>
                      <th className="px-4 py-2 text-left text-xs text-white/50">Poids</th>
                      <th className="px-4 py-2 text-left text-xs text-white/50">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reportItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 font-mono text-white">{item.bag_id}</td>
                        <td className="px-4 py-2 text-white/80">{item.passenger_name}</td>
                        <td className="px-4 py-2 text-white/60">{item.pnr}</td>
                        <td className="px-4 py-2 text-white/60">{item.seat_number}</td>
                        <td className="px-4 py-2 text-white/60">{item.weight} kg</td>
                        <td className="px-4 py-2">
                          {item.reconciled_at ? (
                            <span className="text-green-400">✓ Réconcilié</span>
                          ) : (
                            <span className="text-orange-400">En attente</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
