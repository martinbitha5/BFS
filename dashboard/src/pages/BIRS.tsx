import { 
  AlertCircle, 
  CheckCircle, 
  FileText, 
  Package, 
  RefreshCw, 
  XCircle, 
  Search,
  Filter,
  Download,
  Eye,
  TrendingUp,
  Clock,
  AlertTriangle,
  BarChart3,
  Calendar,
  Plane,
  Users,
  FileDown,
  X,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
  airline_code?: string;
  file_name: string;
  uploaded_at: string;
  total_baggages: number;
  reconciled_count: number;
  unmatched_count: number;
  processed_at?: string;
}

interface BirsReportItem {
  id: string;
  bag_id: string;
  passenger_name: string;
  pnr?: string;
  seat_number?: string;
  class?: string;
  weight?: number;
  reconciled_at?: string;
  international_baggage_id?: string;
}

interface ReportDetails extends BirsReport {
  items: BirsReportItem[];
}

interface Statistics {
  totalReports: number;
  totalBaggages: number;
  reconciledBaggages: number;
  unmatchedBaggages: number;
  averageReconciliationRate: number;
  reportsThisWeek: number;
  reportsThisMonth: number;
}

export default function BIRS() {
  const { user } = useAuth();
  const [reports, setReports] = useState<BirsReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<BirsReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAirline, setFilterAirline] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'processed'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user?.airport_code) {
      fetchReports();
      fetchStatistics();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [reports, searchTerm, filterAirline, filterStatus, filterDateFrom, filterDateTo]);

  const fetchReports = async () => {
    if (!user?.airport_code) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/birs/reports?airport=${user.airport_code}`);
      setReports(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des rapports' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    if (!user?.airport_code) return;
    
    try {
      const response = await api.get(`/api/v1/birs/statistics/${user.airport_code}`);
      const data = response.data.data;
      
      const totalBaggages = data.totalInternationalBaggages || 0;
      const reconciled = data.reconciled || 0;
      const unmatched = data.unmatched || 0;
      const avgRate = totalBaggages > 0 ? (reconciled / totalBaggages) * 100 : 0;
      
      setStatistics({
        totalReports: data.totalReports || 0,
        totalBaggages,
        reconciledBaggages: reconciled,
        unmatchedBaggages: unmatched,
        averageReconciliationRate: avgRate,
        reportsThisWeek: data.reportsThisWeek || 0,
        reportsThisMonth: data.reportsThisMonth || 0
      });
    } catch (err: any) {
      console.error('Error fetching statistics:', err);
    }
  };

  const fetchReportDetails = async (reportId: string) => {
    try {
      const response = await api.get(`/api/v1/birs/reports/${reportId}`);
      setSelectedReport(response.data.data);
      setShowDetailsModal(true);
    } catch (err: any) {
      console.error('Error fetching report details:', err);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des détails' });
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    // Recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.flight_number.toLowerCase().includes(term) ||
        r.airline.toLowerCase().includes(term) ||
        r.origin.toLowerCase().includes(term) ||
        r.destination.toLowerCase().includes(term)
      );
    }

    // Filtre compagnie
    if (filterAirline) {
      filtered = filtered.filter(r => r.airline === filterAirline);
    }

    // Filtre statut
    if (filterStatus === 'pending') {
      filtered = filtered.filter(r => !r.processed_at);
    } else if (filterStatus === 'processed') {
      filtered = filtered.filter(r => r.processed_at);
    }

    // Filtre date
    if (filterDateFrom) {
      filtered = filtered.filter(r => new Date(r.flight_date) >= new Date(filterDateFrom));
    }
    if (filterDateTo) {
      filtered = filtered.filter(r => new Date(r.flight_date) <= new Date(filterDateTo));
    }

    setFilteredReports(filtered);
  };

  const handleReconcile = async (reportId: string) => {
    if (!user?.airport_code) return;

    try {
      setMessage(null);
      setLoading(true);
      const response = await api.post(`/api/v1/birs/reconcile/${reportId}`, {
        airportCode: user.airport_code
      });

      if (response.data.success) {
        const { matchedCount, unmatchedCount } = response.data.data;
        setMessage({ 
          type: 'success', 
          text: `Réconciliation terminée: ${matchedCount} bagages matchés, ${unmatchedCount} non matchés` 
        });
        await fetchReports();
        await fetchStatistics();
      }
    } catch (err: any) {
      console.error('Error reconciling:', err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Erreur lors de la réconciliation' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualReconcile = async (itemId: string, baggageId: string) => {
    try {
      const response = await api.post(`/api/v1/birs/manual-reconcile`, {
        itemId,
        baggageId,
        userId: user?.id
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Réconciliation manuelle effectuée avec succès' });
        if (selectedReport) {
          await fetchReportDetails(selectedReport.id);
        }
        await fetchReports();
        await fetchStatistics();
      }
    } catch (err: any) {
      console.error('Error manual reconciling:', err);
      setMessage({ type: 'error', text: 'Erreur lors de la réconciliation manuelle' });
    }
  };

  const handleExportReport = async (reportId: string) => {
    try {
      const response = await api.get(`/api/v1/birs/reports/${reportId}/export`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BRS_Report_${reportId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: 'Rapport exporté avec succès' });
    } catch (err: any) {
      console.error('Error exporting report:', err);
      setMessage({ type: 'error', text: 'Erreur lors de l\'export du rapport' });
    }
  };

  const getStatusBadge = (report: BirsReport) => {
    if (!report.processed_at) {
      return <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-900/40 backdrop-blur-sm text-yellow-300 border border-yellow-500/30">En attente</span>;
    }
    
    const rate = report.total_baggages > 0 
      ? (report.reconciled_count / report.total_baggages) * 100 
      : 0;

    if (rate >= 90) {
      return <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-900/40 backdrop-blur-sm text-green-300 border border-green-500/30">Excellent ({rate.toFixed(0)}%)</span>;
    } else if (rate >= 70) {
      return <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-900/40 backdrop-blur-sm text-blue-300 border border-blue-500/30">Bon ({rate.toFixed(0)}%)</span>;
    } else {
      return <span className="px-3 py-1 text-xs font-medium rounded-full bg-orange-900/40 backdrop-blur-sm text-orange-300 border border-orange-500/30">À vérifier ({rate.toFixed(0)}%)</span>;
    }
  };

  const airlines = [...new Set(reports.map(r => r.airline))].sort();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* En-tête avec statistiques */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Package className="w-8 h-8 inline mr-2" />
            Système BRS Professionnel
          </h1>
          <p className="text-white/80 mt-1">
            Gestion et réconciliation avancée des bagages internationaux
          </p>
        </div>
        <button
          onClick={fetchReports}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Statistiques */}
      {statistics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Total Rapports</p>
                  <p className="text-2xl font-bold text-white">{statistics.totalReports}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Bagages Réconciliés</p>
                  <p className="text-2xl font-bold text-green-400">{statistics.reconciledBaggages}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Non Matchés</p>
                  <p className="text-2xl font-bold text-orange-400">{statistics.unmatchedBaggages}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-400" />
              </div>
            </div>
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Taux Réconciliation</p>
                  <p className="text-2xl font-bold text-blue-400">{statistics.averageReconciliationRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique de répartition des statuts */}
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Répartition des Statuts
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Réconciliés', value: statistics.reconciledBaggages, color: '#10b981' },
                      { name: 'Non Matchés', value: statistics.unmatchedBaggages, color: '#f59e0b' },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Réconciliés', value: statistics.reconciledBaggages, color: '#10b981' },
                      { name: 'Non Matchés', value: statistics.unmatchedBaggages, color: '#f59e0b' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Graphique par compagnie aérienne */}
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Plane className="w-5 h-5 mr-2" />
                Rapports par Compagnie
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={(() => {
                    const airlineCounts: Record<string, number> = {};
                    reports.forEach(r => {
                      airlineCounts[r.airline] = (airlineCounts[r.airline] || 0) + 1;
                    });
                    return Object.entries(airlineCounts)
                      .map(([name, value]) => ({ name, value }))
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 5);
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="name" tick={{ fill: '#ffffff80', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#ffffff80', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Graphique de tendance de réconciliation */}
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Tendance de Réconciliation (7 derniers jours)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={(() => {
                    const last7Days = Array.from({ length: 7 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (6 - i));
                      return date.toISOString().split('T')[0];
                    });

                    return last7Days.map(date => {
                      const dayReports = reports.filter(r => {
                        const reportDate = new Date(r.flight_date).toISOString().split('T')[0];
                        return reportDate === date;
                      });

                      const total = dayReports.reduce((sum, r) => sum + r.total_baggages, 0);
                      const reconciled = dayReports.reduce((sum, r) => sum + r.reconciled_count, 0);
                      const rate = total > 0 ? (reconciled / total) * 100 : 0;

                      return {
                        date: new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                        rate: Math.round(rate),
                        total,
                        reconciled
                      };
                    });
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="date" tick={{ fill: '#ffffff80', fontSize: 12 }} />
                  <YAxis 
                    tick={{ fill: '#ffffff80', fontSize: 12 }} 
                    label={{ value: 'Taux (%)', angle: -90, position: 'insideLeft', fill: '#ffffff80' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value: any) => [`${value}%`, 'Taux de réconciliation']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-md flex items-center justify-between ${
          message.type === 'success' 
            ? 'bg-green-900/30 backdrop-blur-md text-green-300 border border-green-500/30' 
            : 'bg-red-900/30 backdrop-blur-md text-red-300 border border-red-500/30'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <XCircle className="w-5 h-5 mr-2" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par vol, compagnie, origine, destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white hover:bg-black/50 flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filtres</span>
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-white/20">
            <div>
              <label className="block text-sm text-white/70 mb-1">Compagnie</label>
              <select
                value={filterAirline}
                onChange={(e) => setFilterAirline(e.target.value)}
                className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Toutes</option>
                {airlines.map(airline => (
                  <option key={airline} value={airline}>{airline}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Statut</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tous</option>
                <option value="pending">En attente</option>
                <option value="processed">Traité</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Date début</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Date fin</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Liste des rapports */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            Rapports BRS ({filteredReports.length})
          </h2>
        </div>

        {loading && reports.length === 0 ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-white/60" />
            <p className="text-white/70 mt-2">Chargement...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-8 text-white/70">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p>Aucun rapport trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-black/25 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Vol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Compagnie</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Bagages</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-black/20 divide-y divide-white/10">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-black/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Plane className="w-4 h-4 text-primary-400 mr-2" />
                        <span className="text-sm font-medium text-white">{report.flight_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(report.flight_date).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                      {report.airline}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                      {report.origin} → {report.destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-primary-400" />
                        <span className="font-semibold">{report.total_baggages}</span>
                        {report.processed_at && (
                          <>
                            <span className="text-green-400">({report.reconciled_count} ✓)</span>
                            {report.unmatched_count > 0 && (
                              <span className="text-orange-400">({report.unmatched_count} !)</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => fetchReportDetails(report.id)}
                          className="text-primary-400 hover:text-primary-300 p-1"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {report.processed_at && (
                          <button
                            onClick={() => handleExportReport(report.id)}
                            className="text-green-400 hover:text-green-300 p-1"
                            title="Exporter"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {!report.processed_at ? (
                          <button
                            onClick={() => handleReconcile(report.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-medium disabled:opacity-50"
                          >
                            Réconcilier
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReconcile(report.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium disabled:opacity-50"
                          >
                            Re-traiter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de détails */}
      {showDetailsModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/20 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Détails du Rapport BRS
                </h2>
                <p className="text-white/70 mt-1">
                  {selectedReport.flight_number} - {selectedReport.airline} - {new Date(selectedReport.flight_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {/* Informations générales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-black/30 p-3 rounded-lg">
                  <p className="text-white/60 text-xs">Total Bagages</p>
                  <p className="text-xl font-bold text-white">{selectedReport.total_baggages}</p>
                </div>
                <div className="bg-green-900/30 p-3 rounded-lg">
                  <p className="text-green-300/60 text-xs">Réconciliés</p>
                  <p className="text-xl font-bold text-green-300">{selectedReport.reconciled_count}</p>
                </div>
                <div className="bg-orange-900/30 p-3 rounded-lg">
                  <p className="text-orange-300/60 text-xs">Non Matchés</p>
                  <p className="text-xl font-bold text-orange-300">{selectedReport.unmatched_count}</p>
                </div>
                <div className="bg-blue-900/30 p-3 rounded-lg">
                  <p className="text-blue-300/60 text-xs">Taux</p>
                  <p className="text-xl font-bold text-blue-300">
                    {selectedReport.total_baggages > 0 
                      ? ((selectedReport.reconciled_count / selectedReport.total_baggages) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>

              {/* Liste des items */}
              <div className="bg-black/20 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Bagages du Rapport</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Tag</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Passager</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">PNR</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Poids</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Statut</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {selectedReport.items?.map((item) => (
                        <tr key={item.id} className="hover:bg-black/30">
                          <td className="px-4 py-3 text-sm text-white font-mono">{item.bag_id}</td>
                          <td className="px-4 py-3 text-sm text-white/70">{item.passenger_name}</td>
                          <td className="px-4 py-3 text-sm text-white/70">{item.pnr || '-'}</td>
                          <td className="px-4 py-3 text-sm text-white/70">{item.weight ? `${item.weight} kg` : '-'}</td>
                          <td className="px-4 py-3">
                            {item.reconciled_at ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-900/40 text-green-300">Réconcilié</span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-orange-900/40 text-orange-300">Non matché</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {!item.reconciled_at && (
                              <button
                                onClick={() => {
                                  // TODO: Ouvrir modal de réconciliation manuelle
                                  alert('Fonctionnalité de réconciliation manuelle à implémenter');
                                }}
                                className="text-xs px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded"
                              >
                                Réconcilier
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/20 flex justify-end space-x-2">
              <button
                onClick={() => handleExportReport(selectedReport.id)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2"
              >
                <FileDown className="w-4 h-4" />
                <span>Exporter Excel</span>
              </button>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
