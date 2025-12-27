/**
 * Composant de Recherche Globale
 * Permet de rechercher des bagages, passagers et vols dans tout le système
 */

import {
  Clock,
  Package,
  Plane,
  Search,
  User,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface SearchResult {
  id: string;
  type: 'passenger' | 'baggage' | 'flight';
  title: string;
  subtitle: string;
  status?: string;
  flightNumber?: string;
}

interface GlobalSearchProps {
  className?: string;
}

export default function GlobalSearch({ className = '' }: GlobalSearchProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Raccourci clavier pour ouvrir la recherche (Ctrl+K ou Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus sur l'input quand la modal s'ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Recherche avec debounce
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (!user?.airport_code) return;

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Rechercher dans les passagers
      try {
        const passengersRes = await api.get(`/api/v1/passengers?airport=${user.airport_code}&search=${searchQuery}&limit=5`);
        const passengers = passengersRes.data.data || [];
        passengers.forEach((p: any) => {
          searchResults.push({
            id: p.id,
            type: 'passenger',
            title: p.full_name || 'Passager inconnu',
            subtitle: `PNR: ${p.pnr || 'N/A'} • ${p.email || 'Sans email'}`,
            status: p.status,
            flightNumber: p.flight_number
          });
        });
      } catch (e) { }

      // Rechercher dans les bagages
      try {
        const baggagesRes = await api.get(`/api/v1/baggages?airport=${user.airport_code}&search=${searchQuery}&limit=5`);
        const baggages = baggagesRes.data.data || [];
        baggages.forEach((b: any) => {
          searchResults.push({
            id: b.id,
            type: 'baggage',
            title: `Bagage ${b.tag_number || b.id.slice(0, 8)}`,
            subtitle: `Vol: ${b.flight_number || 'N/A'} • Statut: ${b.status || 'inconnu'}`,
            status: b.status,
            flightNumber: b.flight_number
          });
        });
      } catch (e) { }

      // Rechercher dans les vols (via passengers)
      try {
        const flightQuery = searchQuery.toUpperCase();
        const flightsRes = await api.get(`/api/v1/passengers?airport=${user.airport_code}&flight=${flightQuery}&limit=1`);
        const flightData = flightsRes.data.data || [];
        if (flightData.length > 0) {
          const flightNumbers = [...new Set(flightData.map((p: any) => p.flight_number))];
          flightNumbers.forEach((fn: any) => {
            if (fn && fn.includes(searchQuery.toUpperCase())) {
              searchResults.push({
                id: `flight-${fn}`,
                type: 'flight',
                title: `Vol ${fn}`,
                subtitle: `Cliquez pour voir les détails`,
                flightNumber: fn
              });
            }
          });
        }
      } catch (e) { }

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);

    switch (result.type) {
      case 'passenger':
        navigate(`/passengers?search=${encodeURIComponent(result.title)}`);
        break;
      case 'baggage':
        navigate(`/baggages?search=${encodeURIComponent(result.title)}`);
        break;
      case 'flight':
        navigate(`/flights?search=${encodeURIComponent(result.flightNumber || '')}`);
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'passenger': return User;
      case 'baggage': return Package;
      case 'flight': return Plane;
      default: return Search;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'passenger': return 'Passager';
      case 'baggage': return 'Bagage';
      case 'flight': return 'Vol';
      default: return '';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'passenger': return 'bg-blue-900/40 text-blue-300 border-blue-500/30';
      case 'baggage': return 'bg-green-900/40 text-green-300 border-green-500/30';
      case 'flight': return 'bg-purple-900/40 text-purple-300 border-purple-500/30';
      default: return 'bg-gray-900/40 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <>
      {/* Bouton de recherche - compact sur mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 p-2 md:px-4 md:py-2 bg-black/30 backdrop-blur-md border border-white/20 rounded-lg text-white/70 hover:text-white hover:bg-black/50 transition-colors ${className}`}
      >
        <Search className="w-4 h-4 md:w-4 md:h-4" />
        <span className="hidden md:inline">Rechercher...</span>
        <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-white/10 rounded">
          <span>Ctrl+</span>K
        </kbd>
      </button>

      {/* Modal de recherche - plein écran sur mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 md:pt-20">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Contenu - full width sur mobile */}
          <div className="relative w-full max-w-2xl mx-2 md:mx-4 bg-black/90 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] md:max-h-none">
            {/* Input de recherche */}
            <div className="flex items-center px-4 border-b border-white/10">
              <Search className="w-5 h-5 text-white/50" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher un passager, bagage ou vol..."
                className="flex-1 px-4 py-4 bg-transparent text-white placeholder-white/50 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="ml-2 px-2 py-1 text-xs text-white/50 hover:text-white bg-white/10 rounded transition-colors"
              >
                ESC
              </button>
            </div>

            {/* Résultats */}
            <div ref={resultsRef} className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-white/20 border-t-primary-500 rounded-full animate-spin" />
                  <p className="mt-2 text-white/60 text-sm">Recherche en cours...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="py-2">
                  {results.map((result, index) => {
                    const Icon = getIcon(result.type);
                    const isSelected = index === selectedIndex;

                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                          isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${getTypeColor(result.type)}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium truncate">{result.title}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${getTypeColor(result.type)}`}>
                              {getTypeLabel(result.type)}
                            </span>
                          </div>
                          <p className="text-sm text-white/60 truncate">{result.subtitle}</p>
                        </div>
                        {result.flightNumber && (
                          <span className="px-2 py-1 text-xs bg-white/10 text-white/70 rounded">
                            {result.flightNumber}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : query.length >= 2 ? (
                <div className="p-8 text-center">
                  <Search className="w-8 h-8 mx-auto text-white/30 mb-2" />
                  <p className="text-white/60">Aucun résultat pour "{query}"</p>
                  <p className="text-sm text-white/40 mt-1">Essayez avec un PNR, nom ou numéro de bagage</p>
                </div>
              ) : (
                <div className="p-4 md:p-6">
                  <p className="text-white/60 text-sm mb-3 md:mb-4">Raccourcis :</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setIsOpen(false); navigate('/passengers'); }}
                      className="flex items-center gap-2 p-2.5 md:p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-left"
                    >
                      <User className="w-4 h-4 text-blue-400" />
                      <span className="text-white/80 text-xs md:text-sm">Passagers</span>
                    </button>
                    <button
                      onClick={() => { setIsOpen(false); navigate('/baggages'); }}
                      className="flex items-center gap-2 p-2.5 md:p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-left"
                    >
                      <Package className="w-4 h-4 text-green-400" />
                      <span className="text-white/80 text-xs md:text-sm">Bagages</span>
                    </button>
                    <button
                      onClick={() => { setIsOpen(false); navigate('/flights'); }}
                      className="flex items-center gap-2 p-2.5 md:p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-left"
                    >
                      <Plane className="w-4 h-4 text-purple-400" />
                      <span className="text-white/80 text-xs md:text-sm">Vols</span>
                    </button>
                    <button
                      onClick={() => { setIsOpen(false); navigate('/birs'); }}
                      className="flex items-center gap-2 p-2.5 md:p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-left"
                    >
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <span className="text-white/80 text-xs md:text-sm">Rapports</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer - simplifié sur mobile */}
            <div className="px-3 md:px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
              <div className="hidden md:flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↓</kbd>
                  naviguer
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↵</kbd>
                  sélectionner
                </span>
              </div>
              <span className="md:hidden">Tapez pour rechercher</span>
              <span className="hidden md:inline">Min. 2 caractères</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

