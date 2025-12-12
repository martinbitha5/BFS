import axios from 'axios';
import { AlertCircle, CheckCircle, Clock, Loader, MapPin, Package, Plane, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import FooterComponent from '../components/FooterComponent';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { t } = useLanguage();
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Loader className="w-12 h-12 text-black animate-spin mx-auto mb-4" />
              <p className="text-gray-600">{t('track.loading')}</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8">
              <div className="flex items-start space-x-4">
                <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black mb-2">{t('track.error.title')}</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <Link 
                    to="/" 
                    className="inline-block bg-black hover:bg-gray-800 text-white font-medium py-2 px-6 rounded transition-colors"
                  >
                    {t('track.error.button')}
                  </Link>
                </div>
              </div>
            </div>
          ) : baggage ? (
            <div className="space-y-8">
              {/* Header Info */}
              <div>
                <h1 className="text-4xl font-bold text-black mb-2">{t('track.title')}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{t('track.pnr')}: <span className="font-semibold text-black">{baggage.pnr}</span></span>
                  <span>•</span>
                  <span>{t('track.flight')}: <span className="font-semibold text-black">{baggage.flight_number}</span></span>
                  <span>•</span>
                  <span>{t('track.passenger')}: <span className="font-semibold text-black">{baggage.passenger_name}</span></span>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Timeline */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Current Status */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-black">{t('track.status.title')}</h2>
                      <button
                        onClick={fetchBaggageInfo}
                        className="flex items-center space-x-2 text-sm text-gray-600 hover:text-black transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>{t('track.status.refresh')}</span>
                      </button>
                    </div>

                    {(() => {
                      const statusInfo = getStatusInfo(baggage.status);
                      const StatusIcon = statusInfo.icon;
                      return (
                        <div className="flex items-center space-x-4">
                          <div className={`${statusInfo.bgColor} p-4 rounded-lg`}>
                            <StatusIcon className={`w-8 h-8 ${statusInfo.color}`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-black mb-1">{statusInfo.label}</h3>
                            {baggage.current_location && (
                              <p className="text-gray-600 flex items-center space-x-2">
                                <MapPin className="w-4 h-4" />
                                <span>{baggage.current_location}</span>
                              </p>
                            )}
                            {baggage.last_scanned_at && (
                              <p className="text-sm text-gray-500 mt-1">
                                {t('track.updated')}: {new Date(baggage.last_scanned_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Journey Timeline */}
                  {(baggage.origin || baggage.destination) && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h2 className="text-xl font-bold text-black mb-6">{t('track.journey.title')}</h2>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-3">
                            <Plane className="w-8 h-8 text-white" />
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{t('track.journey.origin')}</p>
                          <p className="text-2xl font-bold text-black">{baggage.origin || '-'}</p>
                        </div>

                        <div className="flex-1 mx-8">
                          <div className="relative">
                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300"></div>
                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-black" style={{ width: '50%' }}></div>
                            <Plane className="absolute top-1/2 -translate-y-1/2 w-6 h-6 text-black" style={{ left: '50%', transform: 'translate(-50%, -50%) rotate(90deg)' }} />
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                            <MapPin className="w-8 h-8 text-gray-600" />
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{t('track.journey.destination')}</p>
                          <p className="text-2xl font-bold text-black">{baggage.destination || '-'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Details */}
                <div className="space-y-6">
                  {/* Baggage Details */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="font-bold text-black mb-4">{t('track.details.title')}</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{t('track.details.tag')}</p>
                        <p className="font-semibold text-black">{baggage.bag_id}</p>
                      </div>
                      {baggage.weight && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{t('track.details.weight')}</p>
                          <p className="font-semibold text-black">{baggage.weight} kg</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{t('track.details.flight')}</p>
                        <p className="font-semibold text-black">{baggage.flight_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{t('track.details.passenger')}</p>
                        <p className="font-semibold text-black">{baggage.passenger_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Help Card */}
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                    <h3 className="font-bold text-black mb-3">{t('track.help.title')}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('track.help.text')}
                    </p>
                    <a
                      href="mailto:support@bfs-system.com"
                      className="block w-full text-center bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors text-sm"
                    >
                      {t('track.help.button')}
                    </a>
                  </div>

                  {/* New Search */}
                  <Link
                    to="/"
                    className="block w-full text-center border border-gray-300 hover:bg-gray-50 text-black font-medium py-2 px-4 rounded transition-colors text-sm"
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
