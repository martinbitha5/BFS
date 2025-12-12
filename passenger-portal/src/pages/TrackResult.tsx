import axios from 'axios';
import { AlertCircle, ArrowLeft, CheckCircle, Clock, Loader, MapPin, Package, Plane } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface BaggageInfo {
  bag_id: string;
  passenger_name: string;
  pnr: string;
  flight_number: string;
  status: string;
  current_location?: string;
  last_scanned_at?: string;
  destination?: string;
  origin?: string;
  weight?: number;
}

export default function TrackResult() {
  const [searchParams] = useSearchParams();
  const pnr = searchParams.get('pnr');
  const tag = searchParams.get('tag');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [baggage, setBaggage] = useState<BaggageInfo | null>(null);

  useEffect(() => {
    fetchBaggageInfo();
  }, [pnr, tag]);

  const fetchBaggageInfo = async () => {
    try {
      setLoading(true);
      setError('');
      
      const searchParam = pnr ? `pnr=${pnr}` : `tag=${tag}`;
      const response = await axios.get(`${API_URL}/api/v1/public/track?${searchParam}`);
      
      setBaggage(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Bagage non trouvé. Vérifiez votre numéro.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case 'checked':
        return {
          label: 'Enregistré',
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/40',
          icon: Package,
        };
      case 'loaded':
        return {
          label: 'Chargé dans l\'avion',
          color: 'text-green-400',
          bgColor: 'bg-green-900/40',
          icon: Plane,
        };
      case 'in_transit':
        return {
          label: 'En transit',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-900/40',
          icon: Clock,
        };
      case 'arrived':
        return {
          label: 'Arrivé',
          color: 'text-green-400',
          bgColor: 'bg-green-900/40',
          icon: CheckCircle,
        };
      case 'delivered':
        return {
          label: 'Livré',
          color: 'text-green-400',
          bgColor: 'bg-green-900/40',
          icon: CheckCircle,
        };
      default:
        return {
          label: status,
          color: 'text-gray-400',
          bgColor: 'bg-gray-900/40',
          icon: Package,
        };
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col relative bg-cover bg-center"
      style={{ backgroundImage: 'url(/images/airport-bg.jpg)' }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Header */}
      <header className="relative z-10 bg-black/30 backdrop-blur-md border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Nouvelle recherche</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Plane className="w-6 h-6 text-primary-400" />
              <h1 className="text-xl font-bold text-white">BFS Tracking</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 relative z-10">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-lg p-12 text-center">
              <Loader className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
              <p className="text-white/80">Recherche en cours...</p>
            </div>
          ) : error ? (
            <div className="bg-black/40 backdrop-blur-md border border-red-400/50 rounded-lg p-8">
              <div className="flex items-start space-x-4">
                <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Bagage non trouvé</h3>
                  <p className="text-white/70 mb-4">{error}</p>
                  <Link 
                    to="/" 
                    className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Réessayer
                  </Link>
                </div>
              </div>
            </div>
          ) : baggage ? (
            <div className="space-y-6">
              {/* Status Card */}
              <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-white/60 text-sm mb-1">Bagage de</p>
                    <h2 className="text-2xl font-bold text-white">{baggage.passenger_name}</h2>
                  </div>
                  {(() => {
                    const statusInfo = getStatusInfo(baggage.status);
                    const StatusIcon = statusInfo.icon;
                    return (
                      <div className={`${statusInfo.bgColor} backdrop-blur-sm px-4 py-2 rounded-lg flex items-center space-x-2`}>
                        <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                        <span className={`font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/60 text-sm mb-1">PNR</p>
                    <p className="text-white font-medium">{baggage.pnr}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">N° Bagage</p>
                    <p className="text-white font-medium">{baggage.bag_id}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">Vol</p>
                    <p className="text-white font-medium">{baggage.flight_number}</p>
                  </div>
                  {baggage.weight && (
                    <div>
                      <p className="text-white/60 text-sm mb-1">Poids</p>
                      <p className="text-white font-medium">{baggage.weight} kg</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Card */}
              {baggage.current_location && (
                <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-lg p-6">
                  <div className="flex items-start space-x-4">
                    <MapPin className="w-6 h-6 text-primary-400 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">Localisation actuelle</h3>
                      <p className="text-white/80 text-lg">{baggage.current_location}</p>
                      {baggage.last_scanned_at && (
                        <p className="text-white/60 text-sm mt-2">
                          Dernière mise à jour : {new Date(baggage.last_scanned_at).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Route Card */}
              {(baggage.origin || baggage.destination) && (
                <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Trajet</h3>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-white/60 text-sm mb-1">Départ</p>
                      <p className="text-white font-bold text-xl">{baggage.origin || '-'}</p>
                    </div>
                    <Plane className="w-6 h-6 text-primary-400" />
                    <div className="text-center">
                      <p className="text-white/60 text-sm mb-1">Arrivée</p>
                      <p className="text-white font-bold text-xl">{baggage.destination || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Refresh Button */}
              <button
                onClick={fetchBaggageInfo}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-4 rounded-lg transition-colors border border-white/20"
              >
                Actualiser les informations
              </button>
            </div>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-black/30 backdrop-blur-md border-t border-white/20 py-4 mt-8">
        <p className="text-center text-white/60 text-xs">
          © 2024 BFS System - African Transport Systems
        </p>
      </footer>
    </div>
  );
}
