import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Clock,
    Link as LinkIcon,
    Package,
    Plane,
    RefreshCw,
    Search,
    Tag,
    User,
    X,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface UnmatchedBaggage {
  id: string;
  tag_number: string;
  passenger_name?: string;
  pnr?: string;
  flight_number?: string;
  origin?: string;
  scanned_at: string;
  status: string;
  airport_code: string;
}

interface UnmatchedReportItem {
  id: string;
  bag_id: string;
  passenger_name: string;
  pnr?: string;
  seat_number?: string;
  class?: string;
  weight?: number;
  route?: string;
  birs_report_id: string;
  flight_number?: string;
  flight_date?: string;
  airline?: string;
}

interface MatchSuggestion {
  baggage: UnmatchedBaggage;
  item: UnmatchedReportItem;
  score: number;
  reasons: string[];
}

export default function BRSUnmatched() {
  const { user } = useAuth();
  const [unmatchedBaggages, setUnmatchedBaggages] = useState<UnmatchedBaggage[]>([]);
  const [unmatchedItems, setUnmatchedItems] = useState<UnmatchedReportItem[]>([]);
  const [filteredBaggages, setFilteredBaggages] = useState<UnmatchedBaggage[]>([]);
  const [filteredItems, setFilteredItems] = useState<UnmatchedReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedBaggage, setSelectedBaggage] = useState<UnmatchedBaggage | null>(null);
  const [selectedItem, setSelectedItem] = useState<UnmatchedReportItem | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFlight, setFilterFlight] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'baggages' | 'items'>('baggages');

  useEffect(() => {
    if (user?.airport_code) {
      fetchUnmatchedData();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [unmatchedBaggages, unmatchedItems, searchTerm, filterFlight, activeTab]);

  const fetchUnmatchedData = async () => {
    if (!user?.airport_code) return;
    
    try {
      setLoading(true);
      
      // Récupérer les bagages non matchés
      const baggagesResponse = await api.get(`/api/v1/birs/international-baggages?airport=${user.airport_code}&status=unmatched`);
      setUnmatchedBaggages(baggagesResponse.data.data || []);

      // Récupérer les rapports pour obtenir les items non matchés
      const reportsResponse = await api.get(`/api/v1/birs/reports?airport=${user.airport_code}`);
      const reports = reportsResponse.data.data || [];
      
      // Pour chaque rapport, récupérer les items non réconciliés
      const allItems: UnmatchedReportItem[] = [];
      for (const report of reports) {
        const reportDetailsResponse = await api.get(`/api/v1/birs/reports/${report.id}`);
        const items = reportDetailsResponse.data.data.items || [];
        const unmatched = items.filter((item: any) => !item.reconciled_at);
        
        unmatched.forEach((item: any) => {
          allItems.push({
            ...item,
            flight_number: report.flight_number,
            flight_date: report.flight_date,
            airline: report.airline
          });
        });
      }
      
      setUnmatchedItems(allItems);
    } catch (err: any) {
      console.error('Error fetching unmatched data:', err);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des données' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (activeTab === 'baggages') {
      let filtered = [...unmatchedBaggages];
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(b => 
          b.tag_number.toLowerCase().includes(term) ||
          (b.passenger_name && b.passenger_name.toLowerCase().includes(term)) ||
          (b.pnr && b.pnr.toLowerCase().includes(term)) ||
          (b.flight_number && b.flight_number.toLowerCase().includes(term))
        );
      }
      
      if (filterFlight) {
        filtered = filtered.filter(b => b.flight_number === filterFlight);
      }
      
      setFilteredBaggages(filtered);
    } else {
      let filtered = [...unmatchedItems];
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(i => 
          i.bag_id.toLowerCase().includes(term) ||
          i.passenger_name.toLowerCase().includes(term) ||
          (i.pnr && i.pnr.toLowerCase().includes(term)) ||
          (i.flight_number && i.flight_number.toLowerCase().includes(term))
        );
      }
      
      if (filterFlight) {
        filtered = filtered.filter(i => i.flight_number === filterFlight);
      }
      
      setFilteredItems(filtered);
    }
  };

  const findSuggestions = (baggage: UnmatchedBaggage) => {
    const matches: MatchSuggestion[] = [];
    
    unmatchedItems.forEach(item => {
      let score = 0;
      const reasons: string[] = [];
      
      // Match sur PNR
      if (baggage.pnr && item.pnr && baggage.pnr === item.pnr) {
        score += 50;
        reasons.push('PNR identique');
      }
      
      // Match sur nom de passager
      if (baggage.passenger_name && item.passenger_name) {
        const bagName = baggage.passenger_name.toLowerCase().trim();
        const itemName = item.passenger_name.toLowerCase().trim();
        
        if (bagName === itemName) {
          score += 40;
          reasons.push('Nom identique');
        } else if (bagName.includes(itemName) || itemName.includes(bagName)) {
          score += 20;
          reasons.push('Nom similaire');
        }
      }
      
      // Match sur vol
      if (baggage.flight_number && item.flight_number && baggage.flight_number === item.flight_number) {
        score += 10;
        reasons.push('Même vol');
      }
      
      // Match partiel sur tag
      if (baggage.tag_number && item.bag_id) {
        const bagTag = baggage.tag_number.toLowerCase();
        const itemTag = item.bag_id.toLowerCase();
        
        if (bagTag.includes(itemTag) || itemTag.includes(bagTag)) {
          score += 30;
          reasons.push('Tag similaire');
        }
      }
      
      if (score > 0) {
        matches.push({ baggage, item, score, reasons });
      }
    });
    
    return matches.sort((a, b) => b.score - a.score).slice(0, 5);
  };

  const handleManualReconcile = async (baggageId: string, itemId: string) => {
    try {
      setLoading(true);
      const response = await api.post('/api/v1/birs/manual-reconcile', {
        baggageId,
        itemId,
        userId: user?.id
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Réconciliation manuelle effectuée avec succès' });
        setShowMatchModal(false);
        await fetchUnmatchedData();
      }
    } catch (err: any) {
      console.error('Error manual reconciling:', err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Erreur lors de la réconciliation manuelle' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShowSuggestions = (baggage: UnmatchedBaggage) => {
    setSelectedBaggage(baggage);
    const suggs = findSuggestions(baggage);
    setSuggestions(suggs);
    setShowMatchModal(true);
  };

  const flights = [...new Set([
    ...unmatchedBaggages.map(b => b.flight_number).filter(Boolean),
    ...unmatchedItems.map(i => i.flight_number).filter(Boolean)
  ])].sort();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <AlertTriangle className="w-8 h-8 inline mr-2 text-orange-400" />
            Bagages Non Matchés
          </h1>
          <p className="text-white/80 mt-1">
            Gestion et réconciliation manuelle des bagages non réconciliés
          </p>
        </div>
        <button
          onClick={fetchUnmatchedData}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Bagages Scannés Non Matchés</p>
              <p className="text-2xl font-bold text-orange-400">{unmatchedBaggages.length}</p>
            </div>
            <Package className="w-8 h-8 text-orange-400" />
          </div>
        </div>
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Items Rapport Non Matchés</p>
              <p className="text-2xl font-bold text-yellow-400">{unmatchedItems.length}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>

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

      {/* Onglets */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg">
        <div className="flex border-b border-white/20">
          <button
            onClick={() => setActiveTab('baggages')}
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              activeTab === 'baggages'
                ? 'text-white border-b-2 border-primary-500'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Bagages Scannés ({unmatchedBaggages.length})
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              activeTab === 'items'
                ? 'text-white border-b-2 border-primary-500'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Items Rapport ({unmatchedItems.length})
          </button>
        </div>

        {/* Filtres */}
        <div className="p-4 border-b border-white/20">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
              <input
                type="text"
                placeholder={`Rechercher ${activeTab === 'baggages' ? 'bagages' : 'items'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={filterFlight}
              onChange={(e) => setFilterFlight(e.target.value)}
              className="px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tous les vols</option>
              {flights.map(flight => (
                <option key={flight} value={flight}>{flight}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Liste */}
        <div className="p-4">
          {loading && unmatchedBaggages.length === 0 && unmatchedItems.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-white/60" />
              <p className="text-white/70 mt-2">Chargement...</p>
            </div>
          ) : activeTab === 'baggages' ? (
            filteredBaggages.length === 0 ? (
              <div className="text-center py-8 text-white/70">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>Aucun bagage non matché</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBaggages.map((baggage) => (
                  <div
                    key={baggage.id}
                    className="bg-black/20 border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Tag className="w-5 h-5 text-primary-400" />
                          <span className="font-mono text-white font-semibold">{baggage.tag_number}</span>
                          {baggage.flight_number && (
                            <>
                              <Plane className="w-4 h-4 text-white/60" />
                              <span className="text-white/70">{baggage.flight_number}</span>
                            </>
                          )}
                        </div>
                        {baggage.passenger_name && (
                          <div className="flex items-center space-x-2 text-white/70 mb-1">
                            <User className="w-4 h-4" />
                            <span>{baggage.passenger_name}</span>
                          </div>
                        )}
                        {baggage.pnr && (
                          <div className="flex items-center space-x-2 text-white/70 mb-1">
                            <span className="text-xs">PNR: {baggage.pnr}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-white/60 text-sm mt-2">
                          <Clock className="w-4 h-4" />
                          <span>Scanné le {new Date(baggage.scanned_at).toLocaleString('fr-FR')}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleShowSuggestions(baggage)}
                        className="ml-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm flex items-center space-x-2"
                      >
                        <LinkIcon className="w-4 h-4" />
                        <span>Suggestions</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            filteredItems.length === 0 ? (
              <div className="text-center py-8 text-white/70">
                <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>Aucun item non matché</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-black/20 border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Tag className="w-5 h-5 text-yellow-400" />
                          <span className="font-mono text-white font-semibold">{item.bag_id}</span>
                          {item.flight_number && (
                            <>
                              <Plane className="w-4 h-4 text-white/60" />
                              <span className="text-white/70">{item.flight_number}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-white/70 mb-1">
                          <User className="w-4 h-4" />
                          <span>{item.passenger_name}</span>
                        </div>
                        {item.pnr && (
                          <div className="text-white/60 text-sm mb-1">
                            PNR: {item.pnr}
                          </div>
                        )}
                        {item.airline && (
                          <div className="text-white/60 text-sm">
                            {item.airline} - {item.flight_date && new Date(item.flight_date).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Modal de suggestions */}
      {showMatchModal && selectedBaggage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/20 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Suggestions de Réconciliation
                </h2>
                <p className="text-white/70 mt-1">
                  Bagage: {selectedBaggage.tag_number}
                </p>
              </div>
              <button
                onClick={() => setShowMatchModal(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {suggestions.length === 0 ? (
                <div className="text-center py-8 text-white/70">
                  <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p>Aucune suggestion trouvée</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="bg-black/30 border border-white/10 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded">
                              Score: {suggestion.score}%
                            </span>
                            <Tag className="w-4 h-4 text-white/60" />
                            <span className="font-mono text-white">{suggestion.item.bag_id}</span>
                          </div>
                          <div className="text-white/70 mb-1">
                            <User className="w-4 h-4 inline mr-1" />
                            {suggestion.item.passenger_name}
                          </div>
                          {suggestion.item.pnr && (
                            <div className="text-white/60 text-sm mb-1">
                              PNR: {suggestion.item.pnr}
                            </div>
                          )}
                          {suggestion.item.flight_number && (
                            <div className="text-white/60 text-sm">
                              Vol: {suggestion.item.flight_number}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleManualReconcile(selectedBaggage.id, suggestion.item.id)}
                          disabled={loading}
                          className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"
                        >
                          Réconcilier
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestion.reasons.map((reason, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-green-900/30 text-green-300 text-xs rounded"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

