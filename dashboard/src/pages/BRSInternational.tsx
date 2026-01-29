import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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
      setError('');
      const response = await api.get(`/api/v1/birs/reports/${reportId}`);
      const data = response.data as { data: { items: ReportItem[] } };
      const reportItems = data.data.items || [];

      if (reportItems.length === 0) {
        setError('Aucune donnée à exporter pour ce rapport');
        return;
      }

      // Créer le workbook avec ExcelJS
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'BFS System - BRS International';
      workbook.created = new Date();

      // ===== FEUILLE 1: RÉSUMÉ AVEC LOGO =====
      const infoSheet = workbook.addWorksheet('Résumé', {
        properties: { tabColor: { argb: 'FF4472C4' } }
      });

      // Charger et ajouter le logo
      try {
        const response = await fetch('/assets/logo-ats-csi.png');
        if (response.ok) {
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();

          const imageId = workbook.addImage({
            buffer: arrayBuffer,
            extension: 'png',
          });

          infoSheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 250, height: 120 }
          });
        }
      } catch (err) {
        console.error('Erreur logo:', err);
      }

      // Ajouter les informations
      infoSheet.getCell('A8').value = 'RAPPORT BRS INTERNATIONAL - BAGAGES ATTENDUS';
      infoSheet.getCell('A8').font = { bold: true, size: 14, color: { argb: 'FF1F2937' } };

      infoSheet.getCell('A9').value = 'Baggage Found Solution - African Transport Systems';
      infoSheet.getCell('A9').font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };

      infoSheet.getCell('A11').value = 'Vol';
      infoSheet.getCell('B11').value = flightNumber;
      infoSheet.getCell('B11').font = { bold: true };

      infoSheet.getCell('A12').value = 'Aéroport';
      infoSheet.getCell('B12').value = user?.airport_code || '';
      infoSheet.getCell('B12').font = { bold: true };

      infoSheet.getCell('A13').value = 'Date d\'export';
      infoSheet.getCell('B13').value = new Date().toLocaleString('fr-FR');

      infoSheet.getCell('A15').value = 'RÉSUMÉ DU RAPPORT';
      infoSheet.getCell('A15').font = { bold: true, size: 12, color: { argb: 'FF2563EB' } };

      const reconciled = reportItems.filter(item => item.reconciled_at).length;
      const pending = reportItems.filter(item => !item.reconciled_at).length;
      const rate = reportItems.length > 0 ? Math.round((reconciled / reportItems.length) * 100) : 0;

      infoSheet.getCell('A16').value = 'Total Bagages';
      infoSheet.getCell('B16').value = reportItems.length;
      infoSheet.getCell('B16').font = { bold: true };

      infoSheet.getCell('A17').value = 'Bagages Réconciliés';
      infoSheet.getCell('B17').value = reconciled;
      infoSheet.getCell('B17').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };

      infoSheet.getCell('A18').value = 'Bagages En Attente';
      infoSheet.getCell('B18').value = pending;
      infoSheet.getCell('B18').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };

      infoSheet.getCell('A19').value = 'Taux de Réconciliation';
      infoSheet.getCell('B19').value = `${rate}%`;
      infoSheet.getCell('B19').font = { bold: true };

      infoSheet.getColumn('A').width = 30;
      infoSheet.getColumn('B').width = 25;

      // ===== FEUILLE 2: DÉTAILS DES BAGAGES =====
      const detailsSheet = workbook.addWorksheet('Détails', {
        properties: { tabColor: { argb: 'FF22C55E' } }
      });

      const headers = [
        'Tag Bagage',
        'Passager',
        'PNR',
        'Siège',
        'Poids (kg)',
        'Route',
        'Statut',
        'Date Réconciliation'
      ];

      detailsSheet.addRow(headers);

      const headerRow = detailsSheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0066CC' }
      };
      headerRow.height = 25;
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Ajouter les données
      reportItems.forEach((item: ReportItem) => {
        const row = detailsSheet.addRow([
          item.bag_id,
          item.passenger_name,
          item.pnr,
          item.seat_number || '-',
          item.weight || 0,
          item.route || '-',
          item.reconciled_at ? 'Réconcilié' : 'En Attente',
          item.reconciled_at ? new Date(item.reconciled_at).toLocaleString('fr-FR') : '-'
        ]);

        // Colorer la ligne selon le statut
        const statusCell = row.getCell(7);
        if (item.reconciled_at) {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF90EE90' }
          };
        } else {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFCCCC' }
          };
        }
      });

      // Bordures et largeurs
      detailsSheet.getColumn(1).width = 15;
      detailsSheet.getColumn(2).width = 25;
      detailsSheet.getColumn(3).width = 12;
      detailsSheet.getColumn(4).width = 8;
      detailsSheet.getColumn(5).width = 12;
      detailsSheet.getColumn(6).width = 15;
      detailsSheet.getColumn(7).width = 14;
      detailsSheet.getColumn(8).width = 20;

      detailsSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          });
        }
      });

      // Générer et sauvegarder
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `BRS_International_${flightNumber}_${dateStr}.xlsx`;
      saveAs(blob, fileName);

      setSuccess(`Rapport ${flightNumber} exporté avec succès`);
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
