import { Barcode, CheckCircle, Filter, Package, RefreshCw, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface RawScan {
  id: string;
  raw_data: string;
  scan_type: string;
  status_checkin: boolean;
  status_baggage: boolean;
  status_boarding: boolean;
  status_arrival: boolean;
  airport_code: string;
  first_scanned_at: string;
  last_scanned_at: string;
  scan_count: number;
  baggage_rfid_tag?: string;
  user_id: string;
}

interface Stats {
  total: number;
  by_type: {
    boarding_pass: number;
    baggage_tag: number;
  };
  by_status: {
    checkin: number;
    baggage: number;
    boarding: number;
    arrival: number;
  };
}

export default function RawScans() {
  const { user } = useAuth();
  const [scans, setScans] = useState<RawScan[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchScans = async () => {
    console.log('[RawScans] User:', user);
    console.log('[RawScans] Airport code:', user?.airport_code);
    
    if (!user?.airport_code) {
      console.error('[RawScans] Pas de code aéroport !');
      setError('Code aéroport manquant. Veuillez vous reconnecter.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Pour les utilisateurs support avec airport_code='ALL', ne pas filtrer par aéroport
      const airportParam = user.airport_code === 'ALL' ? '' : `airport=${user.airport_code}`;
      let url = `/api/v1/raw-scans${airportParam ? '?' + airportParam : ''}`;
      console.log('[RawScans] Fetching:', url);
      if (statusFilter !== 'all') {
        url += `${airportParam ? '&' : '?'}status=${statusFilter}`;
      }

      const response = await api.get(url);
      console.log('[RawScans] Response:', response.data);
      const rawScans = response.data.data || [];
      setScans(rawScans);
      
      // Calculer les stats côté client
      setStats({
        total: rawScans.length,
        by_type: {
          boarding_pass: rawScans.filter((s: RawScan) => s.scan_type === 'boarding_pass').length,
          baggage_tag: rawScans.filter((s: RawScan) => s.scan_type === 'baggage_tag').length,
        },
        by_status: {
          checkin: rawScans.filter((s: RawScan) => s.status_checkin).length,
          baggage: rawScans.filter((s: RawScan) => s.status_baggage).length,
          boarding: rawScans.filter((s: RawScan) => s.status_boarding).length,
          arrival: rawScans.filter((s: RawScan) => s.status_arrival).length,
        },
      });
    } catch (err: any) {
      console.error('Error fetching raw scans:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des scans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.airport_code) {
      fetchScans();
    }
  }, [user, statusFilter]);

  const getStatusBadges = (scan: RawScan) => {
    const badges = [];
    if (scan.status_checkin) badges.push({ label: 'Check-in', color: 'bg-green-900/40 backdrop-blur-sm text-green-800' });
    if (scan.status_baggage) badges.push({ label: 'Bagage', color: 'bg-blue-100 text-blue-800' });
    if (scan.status_boarding) badges.push({ label: 'Embarquement', color: 'bg-purple-100 text-purple-800' });
    if (scan.status_arrival) badges.push({ label: 'Arrivée', color: 'bg-orange-100 text-orange-800' });
    return badges;
  };

  if (loading && scans.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
        <p className="ml-3 text-white/80">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Barcode className="w-6 h-6 sm:w-8 sm:h-8" />
            Scans Bruts (Raw Data)
          </h2>
          <p className="mt-1 text-sm text-white/70">
            Données brutes pures sans parsing ni transformation
          </p>
        </div>
        <button
          onClick={fetchScans}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Message d'erreur (affiché en haut mais n'empêche pas l'affichage des données) */}
      {error && (
        <div className="bg-red-900/30 backdrop-blur-md border border-red-400/30 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-sm p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Barcode className="w-6 h-6 sm:w-8 sm:h-8 text-white/60 opacity-20" />
            </div>
          </div>
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-sm p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70">Check-in</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.by_status.checkin}</p>
              </div>
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 opacity-20" />
            </div>
          </div>
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-sm p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70">Embarqu.</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">{stats.by_status.boarding}</p>
              </div>
              <Package className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 opacity-20" />
            </div>
          </div>
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-sm p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70">BP</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-300">{stats.by_type.boarding_pass}</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-300 opacity-20" />
            </div>
          </div>
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-sm p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70">BT</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats.by_type.baggage_tag}</p>
              </div>
              <Package className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 opacity-20" />
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-white/80" />
          <h3 className="text-sm font-medium text-white">Filtrer par checkpoint</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'checkin', 'baggage', 'boarding', 'arrival'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-white/85 backdrop-blur-lg text-white/85 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Tous' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des scans */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-black/25 backdrop-blur-md border border-white/20">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Données Brutes
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Checkpoints
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider hidden sm:table-cell">
                  Scans
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider hidden md:table-cell">
                  Dates
                </th>
              </tr>
            </thead>
            <tbody className="bg-black/30 backdrop-blur-md border border-white/20 divide-y divide-gray-200">
              {scans.map((scan) => (
                <tr key={scan.id} className="hover:bg-black/25 backdrop-blur-md border border-white/20 transition-colors">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      scan.scan_type === 'boarding_pass'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {scan.scan_type === 'boarding_pass' ? 'BP' : 'BT'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    <div className="text-xs font-mono text-white/85 max-w-md overflow-hidden">
                      <div className="truncate" title={scan.raw_data}>
                        {scan.raw_data.substring(0, 80)}{scan.raw_data.length > 80 ? '...' : ''}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {getStatusBadges(scan).map((badge, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white/70 hidden sm:table-cell">
                    {scan.scan_count}x
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs text-white/70 hidden md:table-cell">
                    <div>{new Date(scan.first_scanned_at).toLocaleDateString('fr-FR')}</div>
                    <div className="text-white/60">{new Date(scan.last_scanned_at).toLocaleTimeString('fr-FR')}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {scans.length === 0 && !loading && (
        <div className="text-center py-12">
          <Barcode className="mx-auto h-12 w-12 text-white/60" />
          <h3 className="mt-2 text-sm font-medium text-white">Aucun scan brut trouvé</h3>
          <p className="mt-1 text-sm text-white/70">
            Les données brutes apparaissent ici après le scan depuis l'app mobile
          </p>
        </div>
      )}
    </div>
  );
}
