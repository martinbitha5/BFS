import { Calendar, Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface RawScan {
  id: string;
  rawData: string;
  scanType: string;
  statusCheckin: boolean;
  statusBaggage: boolean;
  statusBoarding: boolean;
  statusArrival: boolean;
  airportCode: string;
  firstScannedAt: string;
  lastScannedAt: string;
  scanCount: number;
  parsed: {
    pnr?: string;
    fullName?: string;
    flightNumber?: string;
    departure?: string;
    arrival?: string;
    seatNumber?: string;
  } | null;
}

interface ExportStats {
  total: number;
  parsed_successfully: number;
  parsing_failed: number;
}

export default function Export() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState<ExportStats | null>(null);

  const exportRawScans = async () => {
    if (!user?.airport_code) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setStats(null);

    try {
      const response = await api.get('/api/v1/export/raw-scans', {
        params: {
          airport: user.airport_code,
          start_date: startDate,
          end_date: endDate
        }
      });

      const data = response.data as { data: RawScan[]; stats: ExportStats };
      const scans = data.data;
      setStats(data.stats);

      if (scans.length === 0) {
        setError('Aucune donnée à exporter pour cette période');
        return;
      }

      const excelData = scans.map((scan: RawScan) => ({
        'ID': scan.id,
        'Type': scan.scanType,
        'Données brutes': scan.rawData,
        'PNR': scan.parsed?.pnr || '',
        'Nom': scan.parsed?.fullName || '',
        'Vol': scan.parsed?.flightNumber || '',
        'Départ': scan.parsed?.departure || '',
        'Arrivée': scan.parsed?.arrival || '',
        'Siège': scan.parsed?.seatNumber || '',
        'Check-in': scan.statusCheckin ? 'Oui' : 'Non',
        'Bagage': scan.statusBaggage ? 'Oui' : 'Non',
        'Embarquement': scan.statusBoarding ? 'Oui' : 'Non',
        'Arrivée passager': scan.statusArrival ? 'Oui' : 'Non',
        'Aéroport': scan.airportCode,
        'Premier scan': new Date(scan.firstScannedAt).toLocaleString('fr-FR'),
        'Dernier scan': new Date(scan.lastScannedAt).toLocaleString('fr-FR'),
        'Nombre scans': scan.scanCount
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Raw Scans');

      const fileName = `Export_${user.airport_code}_${startDate}_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setSuccess(`${scans.length} enregistrements exportés`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erreur export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-7 h-7 text-primary-400" />
          Export des données
        </h1>
        <p className="text-sm text-white/60">
          Exporter les données brutes scannées par l'application mobile
        </p>
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

      {/* Formulaire */}
      <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Paramètres d'export</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date de début
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date de fin
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={exportRawScans}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            {loading ? 'Export en cours...' : 'Exporter en Excel'}
          </button>

          <p className="text-sm text-white/50">
            Aéroport: <span className="text-white font-medium">{user?.airport_code}</span>
          </p>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Statistiques de l'export</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-black/20 rounded-lg p-4">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-white/60">Total enregistrements</p>
            </div>
            <div className="bg-black/20 rounded-lg p-4">
              <p className="text-2xl font-bold text-green-400">{stats.parsed_successfully}</p>
              <p className="text-sm text-white/60">Parsés avec succès</p>
            </div>
            <div className="bg-black/20 rounded-lg p-4">
              <p className="text-2xl font-bold text-orange-400">{stats.parsing_failed}</p>
              <p className="text-sm text-white/60">Échecs de parsing</p>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
        <h3 className="text-white font-medium mb-2">Données exportées</h3>
        <ul className="text-sm text-white/70 space-y-1">
          <li>• Scans bruts de l'application mobile</li>
          <li>• Données parsées (PNR, nom, vol, siège)</li>
          <li>• Statuts de traitement (check-in, bagage, embarquement, arrivée)</li>
          <li>• Métadonnées (dates de scan, compteurs)</li>
        </ul>
      </div>
    </div>
  );
}
