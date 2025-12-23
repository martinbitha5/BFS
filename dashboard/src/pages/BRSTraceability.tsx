/**
 * Page de Traçabilité BRS Complète
 * Conforme IATA Resolution 753 - Traçabilité complète des bagages
 */

import {
  Calendar,
  Clock,
  FileText,
  MapPin,
  Package,
  Plane,
  Search,
  User,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface TraceabilityEvent {
  event: string;
  timestamp: string;
  location?: string;
  performed_by?: string;
  report_id?: string;
  flight_number?: string;
  details?: string;
}

interface BaggageTraceability {
  baggage: {
    id: string;
    rfid_tag: string;
    status: string;
    passenger_name?: string;
    pnr?: string;
    flight_number?: string;
    origin?: string;
    weight?: number;
  };
  timeline: TraceabilityEvent[];
  report: {
    id: string;
    flight_number: string;
    flight_date: string;
    airline: string;
    origin: string;
    destination: string;
  } | null;
}

export default function BRSTraceability() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [traceability, setTraceability] = useState<BaggageTraceability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchTerm.trim() || !user?.airport_code) return;

    try {
      setLoading(true);
      setError('');
      
      // Rechercher par RFID tag
      const response = await api.get(`/api/v1/brs/traceability/${searchTerm}`);
      setTraceability(response.data.data);
    } catch (err: any) {
      console.error('Error fetching traceability:', err);
      setError('Bagage non trouvé ou erreur lors de la recherche');
      setTraceability(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reconciled': return 'text-green-400';
      case 'unmatched': return 'text-orange-400';
      case 'rush': return 'text-red-400';
      case 'scanned': return 'text-blue-400';
      default: return 'text-white/60';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'reconciled': return 'Réconcilié';
      case 'unmatched': return 'Non Matché';
      case 'rush': return 'RUSH';
      case 'scanned': return 'Scanné';
      default: return status;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Package className="w-8 h-8 inline mr-2" />
          Traçabilité BRS Complète
        </h1>
        <p className="text-white/80 mt-1">
          Conforme IATA Resolution 753 - Historique complet de chaque bagage
        </p>
      </div>

      {/* Recherche */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par RFID Tag ou ID de bagage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !searchTerm.trim()}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>Recherche...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Rechercher</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-900/30 backdrop-blur-md border border-red-500/30 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Résultats */}
      {traceability && (
        <div className="space-y-6">
          {/* Informations du bagage */}
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Informations du Bagage</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-white/60 text-sm mb-1">RFID Tag</p>
                <p className="text-white font-mono font-semibold">{traceability.baggage.rfid_tag}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm mb-1">Statut</p>
                <p className={`font-semibold ${getStatusColor(traceability.baggage.status)}`}>
                  {getStatusLabel(traceability.baggage.status)}
                </p>
              </div>
              {traceability.baggage.passenger_name && (
                <div>
                  <p className="text-white/60 text-sm mb-1">Passager</p>
                  <p className="text-white">{traceability.baggage.passenger_name}</p>
                </div>
              )}
              {traceability.baggage.pnr && (
                <div>
                  <p className="text-white/60 text-sm mb-1">PNR</p>
                  <p className="text-white font-mono">{traceability.baggage.pnr}</p>
                </div>
              )}
              {traceability.baggage.flight_number && (
                <div>
                  <p className="text-white/60 text-sm mb-1">Vol</p>
                  <p className="text-white">{traceability.baggage.flight_number}</p>
                </div>
              )}
              {traceability.baggage.origin && (
                <div>
                  <p className="text-white/60 text-sm mb-1">Origine</p>
                  <p className="text-white">{traceability.baggage.origin}</p>
                </div>
              )}
              {traceability.baggage.weight && (
                <div>
                  <p className="text-white/60 text-sm mb-1">Poids</p>
                  <p className="text-white">{traceability.baggage.weight} kg</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Historique de Traçabilité
            </h2>
            <div className="space-y-4">
              {traceability.timeline.map((event, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-primary-500' : 'bg-white/30'
                    }`} />
                    {index < traceability.timeline.length - 1 && (
                      <div className="w-0.5 h-12 bg-white/20 ml-1.5" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-semibold">{event.event}</p>
                        {event.details && (
                          <p className="text-white/70 text-sm mt-1">{event.details}</p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-white/60">
                          {event.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.performed_by && (
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{event.performed_by}</span>
                            </div>
                          )}
                          {event.flight_number && (
                            <div className="flex items-center space-x-1">
                              <Plane className="w-4 h-4" />
                              <span>{event.flight_number}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1 text-white/60 text-sm">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(event.timestamp).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="text-white/50 text-xs mt-1">
                          {new Date(event.timestamp).toLocaleTimeString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rapport associé */}
          {traceability.report && (
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Rapport BRS Associé
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-white/60 text-sm mb-1">Vol</p>
                  <p className="text-white font-semibold">{traceability.report.flight_number}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-1">Date</p>
                  <p className="text-white">
                    {new Date(traceability.report.flight_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-1">Compagnie</p>
                  <p className="text-white">{traceability.report.airline}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-1">Route</p>
                  <p className="text-white">
                    {traceability.report.origin} → {traceability.report.destination}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!traceability && !loading && (
        <div className="bg-black/25 backdrop-blur-md border border-white/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Comment utiliser la traçabilité</h3>
          <ul className="text-white/70 space-y-2 text-sm">
            <li>• Entrez le RFID Tag ou l'ID du bagage dans le champ de recherche</li>
            <li>• La traçabilité complète affichera tous les événements liés au bagage</li>
            <li>• Conforme à la résolution IATA 753 pour la traçabilité des bagages</li>
            <li>• Chaque événement est horodaté et tracé avec l'agent responsable</li>
          </ul>
        </div>
      )}
    </div>
  );
}

