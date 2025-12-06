import { useState } from 'react';
import { Search, Package, MapPin, CheckCircle, Clock, Plane } from 'lucide-react';
import api from '../config/api';

interface BaggageInfo {
  tagNumber: string;
  status: string;
  weight: number;
  flightNumber: string;
  checkedAt: string;
  arrivedAt: string | null;
  currentLocation: string;
  passenger: {
    name: string;
    pnr: string;
    route: string;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  checked: { label: 'Enregistré', color: 'bg-blue-100 text-blue-800', icon: Package },
  loaded: { label: 'Chargé', color: 'bg-yellow-100 text-yellow-800', icon: Plane },
  in_transit: { label: 'En transit', color: 'bg-purple-100 text-purple-800', icon: Plane },
  arrived: { label: 'Arrivé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
};

export default function BaggageTracker() {
  const [tagNumber, setTagNumber] = useState('');
  const [baggage, setBaggage] = useState<BaggageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagNumber.trim()) return;

    try {
      setLoading(true);
      setError('');
      setBaggage(null);
      
      const response = await api.get(`/api/v1/baggage/track/${tagNumber.trim()}`);
      setBaggage(response.data.data);
    } catch (err: any) {
      console.error('Error tracking baggage:', err);
      setError(err.response?.data?.error || 'Bagage introuvable. Vérifiez le numéro de tag.');
      setBaggage(null);
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = baggage ? statusConfig[baggage.status] || statusConfig.checked : null;
  const StatusIcon = statusInfo?.icon;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Suivre votre bagage</h2>
        
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="tagNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de tag du bagage
              </label>
              <input
                id="tagNumber"
                type="text"
                value={tagNumber}
                onChange={(e) => setTagNumber(e.target.value)}
                placeholder="Ex: BAG123456"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                disabled={loading}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading || !tagNumber.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4 mr-2" />
                {loading ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {baggage && statusInfo && (
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-center">
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-medium ${statusInfo.color}`}>
                {StatusIcon && <StatusIcon className="w-5 h-5 mr-2" />}
                {statusInfo.label}
              </span>
            </div>

            {/* Baggage Details */}
            <div className="border-t border-gray-200 pt-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Package className="w-4 h-4 mr-2" />
                    Numéro de tag
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{baggage.tagNumber}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Plane className="w-4 h-4 mr-2" />
                    Vol
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">{baggage.flightNumber}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Enregistré le
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(baggage.checkedAt).toLocaleString('fr-FR')}
                  </dd>
                </div>

                {baggage.arrivedAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Arrivé le
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(baggage.arrivedAt).toLocaleString('fr-FR')}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Localisation actuelle
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">{baggage.currentLocation}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Poids</dt>
                  <dd className="mt-1 text-sm text-gray-900">{baggage.weight} kg</dd>
                </div>
              </dl>
            </div>

            {/* Passenger Info */}
            {baggage.passenger && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations passager</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Nom</dt>
                    <dd className="mt-1 text-sm text-gray-900">{baggage.passenger.name}</dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">PNR</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{baggage.passenger.pnr}</dd>
                  </div>

                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Itinéraire</dt>
                    <dd className="mt-1 text-sm text-gray-900">{baggage.passenger.route}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
