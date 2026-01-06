import axios from 'axios';
import { AlertCircle, CheckCircle, Clock, Loader, MapPin, Package, Plane, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import FooterComponent from '../components/FooterComponent';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface BaggageItem {
  bag_id: string;
  status: string;
  weight?: number;
  current_location?: string;
  last_scanned_at?: string;
  baggage_type?: 'national' | 'international' | 'birs';
  origin?: string;
  destination?: string;
}

interface StatusSummary {
  total: number;
  arrived: number;
  in_transit: number;
  checked: number;
  rush: number;
  lost: number;
}

interface TrackingResult {
  passenger_name: string;
  pnr: string;
  flight_number: string;
  origin?: string;
  destination?: string;
  summary: StatusSummary;
  baggages: BaggageItem[];
}

export default function TrackResult() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const pnr = searchParams.get('pnr');
  const tag = searchParams.get('tag');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trackingData, setTrackingData] = useState<TrackingResult | null>(null);

  useEffect(() => {
    fetchBaggageInfo();
  }, [pnr, tag]);

  const fetchBaggageInfo = async () => {
    try {
      setLoading(true);
      setError('');
      
      const searchParam = pnr ? `pnr=${pnr}` : `tag=${tag}`;
      const response = await axios.get(`${API_URL}/api/v1/public/track?${searchParam}`);
      
      setTrackingData(response.data.data);
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
          label: t('status.checked'),
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/40',
          icon: Package,
        };
      case 'loaded':
        return {
          label: t('status.loaded'),
          color: 'text-green-400',
          bgColor: 'bg-green-900/40',
          icon: Plane,
        };
      case 'in_transit':
        return {
          label: t('status.in_transit'),
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-900/40',
          icon: Clock,
        };
      case 'arrived':
        return {
          label: t('status.arrived'),
          color: 'text-green-400',
          bgColor: 'bg-green-900/40',
          icon: CheckCircle,
        };
      case 'delivered':
        return {
          label: t('status.delivered'),
          color: 'text-green-400',
          bgColor: 'bg-green-900/40',
          icon: CheckCircle,
        };
      case 'rush':
        return {
          label: t('status.rush'),
          color: 'text-orange-400',
          bgColor: 'bg-orange-900/40',
          icon: AlertCircle,
        };
      case 'scanned':
        return {
          label: 'Scanné',
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/40',
          icon: Package,
        };
      case 'reconciled':
        return {
          label: 'Réconcilié',
          color: 'text-green-400',
          bgColor: 'bg-green-900/40',
          icon: CheckCircle,
        };
      case 'unmatched':
        return {
          label: 'Non apparié',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-900/40',
          icon: AlertCircle,
        };
      case 'pending':
        return {
          label: 'En attente',
          color: 'text-gray-400',
          bgColor: 'bg-gray-900/40',
          icon: Clock,
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
      <div className="absolute inset-0 bg-black/50"></div>
      <Header />

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center text-sm text-gray-600">
            <Link to="/" className="hover:text-black">{t('breadcrumb.home')}</Link>
            <span className="mx-2">/</span>
            <Link to="/" className="hover:text-black">{t('breadcrumb.tracking')}</Link>
            <span className="mx-2">/</span>
            <span className="text-black font-medium">{t('breadcrumb.results')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {loading ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-12 text-center">
              <Loader className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
              <p className="text-white/80">{t('track.loading')}</p>
            </div>
          ) : error ? (
            <div className="bg-red-900/20 backdrop-blur-sm rounded-lg shadow-sm border border-red-400/30 p-8">
              <div className="flex items-start space-x-4">
                <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">{t('track.error.title')}</h3>
                  <p className="text-white/80 mb-4">{error}</p>
                  <Link 
                    to="/" 
                    className="inline-block bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 text-white font-medium py-2 px-6 rounded transition-colors"
                  >
                    {t('track.error.button')}
                  </Link>
                </div>
              </div>
            </div>
          ) : trackingData ? (
            <div className="space-y-8">
              {/* Header Info */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-white">{t('track.title')}</h1>
                </div>
                <div className="flex items-center space-x-4 text-sm text-white/70">
                  <span>{t('track.pnr')}: <span className="font-semibold text-white">{trackingData.pnr}</span></span>
                  <span>•</span>
                  <span>{t('track.flight')}: <span className="font-semibold text-white">{trackingData.flight_number}</span></span>
                  <span>•</span>
                  <span>{t('track.passenger')}: <span className="font-semibold text-white">{trackingData.passenger_name}</span></span>
                </div>
              </div>

              {/* Résumé des bagages */}
              {trackingData.summary && trackingData.summary.total > 1 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Package className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-bold text-white">
                      {trackingData.summary.total} bagage{trackingData.summary.total > 1 ? 's' : ''} enregistré{trackingData.summary.total > 1 ? 's' : ''}
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {trackingData.summary?.arrived > 0 && (
                      <div className="bg-green-900/40 border border-green-500/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-green-400">{trackingData.summary.arrived}</p>
                        <p className="text-xs text-green-300">Arrivé{trackingData.summary.arrived > 1 ? 's' : ''}</p>
                      </div>
                    )}
                    {trackingData.summary?.in_transit > 0 && (
                      <div className="bg-yellow-900/40 border border-yellow-500/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-yellow-400">{trackingData.summary.in_transit}</p>
                        <p className="text-xs text-yellow-300">En transit</p>
                      </div>
                    )}
                    {trackingData.summary?.checked > 0 && (
                      <div className="bg-blue-900/40 border border-blue-500/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-400">{trackingData.summary.checked}</p>
                        <p className="text-xs text-blue-300">Enregistré{trackingData.summary.checked > 1 ? 's' : ''}</p>
                      </div>
                    )}
                    {trackingData.summary?.rush > 0 && (
                      <div className="bg-orange-900/40 border border-orange-500/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-orange-400">{trackingData.summary.rush}</p>
                        <p className="text-xs text-orange-300">Rush</p>
                      </div>
                    )}
                    {trackingData.summary?.lost > 0 && (
                      <div className="bg-red-900/40 border border-red-500/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-red-400">{trackingData.summary.lost}</p>
                        <p className="text-xs text-red-300">En recherche</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Baggages List */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Liste de tous les bagages */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white">{t('track.status.title')}</h2>
                      <button
                        onClick={fetchBaggageInfo}
                        className="flex items-center space-x-2 text-sm text-white/70 hover:text-white transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>{t('track.status.refresh')}</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {trackingData.baggages?.map((baggage, index) => {
                        const statusInfo = getStatusInfo(baggage.status);
                        const StatusIcon = statusInfo.icon;
                        return (
                          <div key={baggage.bag_id || index} className="bg-black/20 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center space-x-4">
                              <div className={`${statusInfo.bgColor} p-3 rounded-lg flex-shrink-0`}>
                                <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-lg font-bold text-white">{statusInfo.label}</h3>
                                  {baggage.baggage_type === 'international' && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">International</span>
                                  )}
                                </div>
                                <p className="text-sm text-white/70 font-mono">{t('track.details.tag')}: {baggage.bag_id}</p>
                                {baggage.weight && (
                                  <p className="text-sm text-white/60">{baggage.weight} kg</p>
                                )}
                                {baggage.origin && baggage.destination && (
                                  <p className="text-sm text-white/60 flex items-center gap-1 mt-1">
                                    <Plane className="w-3 h-3" />
                                    {baggage.origin} → {baggage.destination}
                                  </p>
                                )}
                                {baggage.current_location && !baggage.destination && (
                                  <p className="text-sm text-white/60 flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    {baggage.current_location}
                                  </p>
                                )}
                              </div>
                              {baggage.last_scanned_at && (
                                <div className="text-right text-xs text-white/50">
                                  <p>Dernière MAJ</p>
                                  <p>{new Date(baggage.last_scanned_at).toLocaleDateString('fr-FR')}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Journey Timeline */}
                  {(trackingData.origin || trackingData.destination) && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-6">
                      <h2 className="text-xl font-bold text-white mb-6">{t('track.journey.title')}</h2>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center mb-3">
                            <Plane className="w-8 h-8 text-white" />
                          </div>
                          <p className="text-sm text-white/70 mb-1">{t('track.journey.origin')}</p>
                          <p className="text-2xl font-bold text-white">{trackingData.origin || '-'}</p>
                        </div>

                        <div className="flex-1 mx-8">
                          <div className="relative">
                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30"></div>
                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white" style={{ width: '50%' }}></div>
                            <Plane className="absolute top-1/2 -translate-y-1/2 w-6 h-6 text-white" style={{ left: '50%', transform: 'translate(-50%, -50%) rotate(90deg)' }} />
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center mb-3">
                            <MapPin className="w-8 h-8 text-white" />
                          </div>
                          <p className="text-sm text-white/70 mb-1">{t('track.journey.destination')}</p>
                          <p className="text-2xl font-bold text-white">{trackingData.destination || '-'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Details */}
                <div className="space-y-6">
                  {/* Passenger Details */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-6">
                    <h3 className="font-bold text-white mb-4">{t('track.details.title')}</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-white/60 mb-1">{t('track.details.passenger')}</p>
                        <p className="font-semibold text-white">{trackingData.passenger_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60 mb-1">PNR</p>
                        <p className="font-semibold text-white font-mono">{trackingData.pnr}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60 mb-1">{t('track.details.flight')}</p>
                        <p className="font-semibold text-white">{trackingData.flight_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60 mb-1">Nombre de bagages</p>
                        <p className="font-semibold text-white">{trackingData.summary?.total || trackingData.baggages?.length || 1}</p>
                      </div>
                    </div>
                  </div>

                  {/* Help Card */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
                    <h3 className="font-bold text-white mb-3">{t('track.help.title')}</h3>
                    <p className="text-sm text-white/80 mb-4">
                      {t('track.help.text')}
                    </p>
                    <a
                      href="mailto:support@brsats.com"
                      className="block w-full text-center bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 text-white font-medium py-2 px-4 rounded transition-colors text-sm"
                    >
                      {t('track.help.button')}
                    </a>
                  </div>

                  {/* New Search */}
                  <Link
                    to="/"
                    className="block w-full text-center bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white font-medium py-2 px-4 rounded transition-colors text-sm"
                  >
                    {t('track.another')}
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <FooterComponent />
    </div>
  );
}
