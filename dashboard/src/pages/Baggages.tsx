import { useEffect, useState } from 'react';
import { Package, AlertCircle, Search, CheckCircle, Clock, Plane } from 'lucide-react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface Baggage {
  id: string;
  tagNumber: string;
  passengerId: string;
  weight: number;
  status: 'checked' | 'arrived' | 'rush';
  flightNumber: string;
  checkedAt: string;
  arrivedAt: string | null;
  currentLocation: string;
  passengers: {
    fullName: string;
    pnr: string;
    departure: string;
    arrival: string;
  };
}

interface InternationalBaggage {
  id: string;
  rfidTag: string;
  status: 'scanned' | 'reconciled' | 'unmatched' | 'rush' | 'pending';
  passengerName: string | null;
  pnr: string | null;
  flightNumber: string | null;
  origin: string | null;
  weight: number | null;
  scannedAt: string;
  airportCode: string;
  remarks: string | null;
  baggageType?: string;
}

type BaggageType = 'all' | 'national' | 'international' | 'rush';

const statusConfig = {
  checked: { label: 'Enregistré', color: 'bg-blue-100 text-blue-800', icon: Package },
  arrived: { label: 'Arrivé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rush: { label: 'RUSH', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  scanned: { label: 'Scanné', color: 'bg-purple-100 text-purple-800', icon: Package },
  reconciled: { label: 'Réconcilié', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  unmatched: { label: 'Non matché', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  pending: { label: 'En attente', color: 'bg-gray-100 text-gray-800', icon: Clock },
};

export default function Baggages() {
  const { user } = useAuth();
  const [baggageType, setBaggageType] = useState<BaggageType>('all');
  const [baggages, setBaggages] = useState<(Baggage | InternationalBaggage)[]>([]);
  const [filteredBaggages, setFilteredBaggages] = useState<(Baggage | InternationalBaggage)[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBaggage, setSelectedBaggage] = useState<Baggage | InternationalBaggage | null>(null);
  const [showRushModal, setShowRushModal] = useState(false);
  const [rushReason, setRushReason] = useState('');
  const [nextFlight, setNextFlight] = useState('');
  const [rushRemarks, setRushRemarks] = useState('');


  const fetchBaggages = async () => {
    try {
      setLoading(true);
      setError('');
      
      const allBaggages: (Baggage | InternationalBaggage)[] = [];

      if (!user?.airport_code) return;

      // Charger les bagages selon le type sélectionné
      if (baggageType === 'all' || baggageType === 'national') {
        const response = await api.get(`/api/v1/baggage?airport=${user.airport_code}`);
        const nationalBags = response.data.data.map((b: any) => ({ ...b, baggageType: 'national' }));
        allBaggages.push(...nationalBags);
      }

      if (baggageType === 'all' || baggageType === 'international') {
        const response = await api.get(`/api/v1/birs/international-baggages?airport=${user.airport_code}`);
        const intlBags = response.data.data.map((b: any) => ({ ...b, baggageType: 'international' }));
        allBaggages.push(...intlBags);
      }

      if (baggageType === 'rush') {
        const response = await api.get(`/api/v1/rush/baggages?airport=${user.airport_code}`);
        allBaggages.push(...response.data.data);
      }

      setBaggages(allBaggages);
      setFilteredBaggages(allBaggages);
    } catch (err: any) {
      console.error('Error fetching baggages:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des bagages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.airport_code) {
      fetchBaggages();
    }
  }, [user, baggageType]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = baggages.filter(b => {
        const isNational = 'tagNumber' in b;
        if (isNational) {
          const bag = b as Baggage;
          return (
            bag.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bag.passengers?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bag.passengers?.pnr.toLowerCase().includes(searchTerm.toLowerCase())
          );
        } else {
          const bag = b as InternationalBaggage;
          return (
            bag.rfidTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bag.passengerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bag.pnr?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
      });
      setFilteredBaggages(filtered);
    } else {
      setFilteredBaggages(baggages);
    }
  }, [searchTerm, baggages]);

  const handleDeclareRush = async () => {
    if (!selectedBaggage || !rushReason) return;

    try {
      const isNational = 'tagNumber' in selectedBaggage;
      await api.post('/api/v1/rush/declare', {
        baggageId: selectedBaggage.id,
        baggageType: isNational ? 'national' : 'international',
        reason: rushReason,
        nextFlightNumber: nextFlight,
        remarks: rushRemarks,
        userId: 'supervisor'
      });

      setShowRushModal(false);
      setSelectedBaggage(null);
      setRushReason('');
      setNextFlight('');
      setRushRemarks('');
      fetchBaggages();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors de la déclaration RUSH');
    }
  };

  const getBaggageIdentifier = (baggage: Baggage | InternationalBaggage) => {
    return 'tagNumber' in baggage ? baggage.tagNumber : baggage.rfidTag;
  };

  const getBaggagePassenger = (baggage: Baggage | InternationalBaggage) => {
    return 'tagNumber' in baggage 
      ? (baggage as Baggage).passengers?.fullName 
      : (baggage as InternationalBaggage).passengerName || 'Inconnu';
  };

  const renderBaggageCard = (baggage: Baggage | InternationalBaggage) => {
    const isNational = 'tagNumber' in baggage;
    const StatusIcon = statusConfig[baggage.status].icon;

    return (
      <div key={baggage.id} className="bg-white/95 backdrop-blur-sm shadow rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-white/80" />
              <span className="font-mono font-bold text-lg">{getBaggageIdentifier(baggage)}</span>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                {isNational ? 'National' : 'International'}
              </span>
            </div>
            <p className="text-white font-medium">{getBaggagePassenger(baggage)}</p>
            {isNational && (baggage as Baggage).passengers?.pnr && (
              <p className="text-sm text-gray-500 font-mono">
                PNR: {(baggage as Baggage).passengers.pnr}
              </p>
            )}
            {!isNational && (baggage as InternationalBaggage).pnr && (
              <p className="text-sm text-gray-500 font-mono">
                PNR: {(baggage as InternationalBaggage).pnr}
              </p>
            )}
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig[baggage.status].color}`}>
            <StatusIcon className="w-4 h-4 mr-1" />
            {statusConfig[baggage.status].label}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          {isNational && (
            <>
              <div className="flex items-center text-white/80">
                <Plane className="w-4 h-4 mr-2" />
                Vol {(baggage as Baggage).flightNumber}: {(baggage as Baggage).passengers?.departure} → {(baggage as Baggage).passengers?.arrival}
              </div>
              <div className="flex items-center text-white/80">
                <Package className="w-4 h-4 mr-2" />
                Poids: {baggage.weight || 'N/A'} kg
              </div>
            </>
          )}
          {!isNational && (
            <>
              {(baggage as InternationalBaggage).flightNumber && (
                <div className="flex items-center text-white/80">
                  <Plane className="w-4 h-4 mr-2" />
                  Vol {(baggage as InternationalBaggage).flightNumber}
                </div>
              )}
              {(baggage as InternationalBaggage).origin && (
                <div className="flex items-center text-white/80">
                  <Plane className="w-4 h-4 mr-2" />
                  Origine: {(baggage as InternationalBaggage).origin}
                </div>
              )}
              {(baggage as InternationalBaggage).weight && (
                <div className="flex items-center text-white/80">
                  <Package className="w-4 h-4 mr-2" />
                  Poids: {(baggage as InternationalBaggage).weight} kg
                </div>
              )}
            </>
          )}
          <div className="flex items-center text-gray-500">
            <Clock className="w-4 h-4 mr-2" />
            {isNational 
              ? ((baggage as Baggage).checkedAt && !isNaN(new Date((baggage as Baggage).checkedAt).getTime())
                  ? new Date((baggage as Baggage).checkedAt).toLocaleString('fr-FR')
                  : 'Non disponible')
              : ((baggage as InternationalBaggage).scannedAt && !isNaN(new Date((baggage as InternationalBaggage).scannedAt).getTime())
                  ? new Date((baggage as InternationalBaggage).scannedAt).toLocaleString('fr-FR')
                  : 'Non disponible')
            }
          </div>
          {!isNational && (baggage as InternationalBaggage).remarks && (
            <p className="text-sm text-white/80 italic mt-2">
              {(baggage as InternationalBaggage).remarks}
            </p>
          )}
        </div>

        {baggage.status !== 'rush' && baggage.status !== 'arrived' && (
          <button
            onClick={() => {
              setSelectedBaggage(baggage);
              setShowRushModal(true);
            }}
            className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Marquer comme RUSH
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Gestion des bagages - {user?.airport_code}</h2>
        <p className="mt-1 text-sm text-gray-500">
          Suivi des bagages nationaux, internationaux et RUSH
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white/95 backdrop-blur-sm shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de bagage
            </label>
            <select
              value={baggageType}
              onChange={(e) => setBaggageType(e.target.value as BaggageType)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">Tous</option>
              <option value="national">Nationaux</option>
              <option value="international">Internationaux</option>
              <option value="rush">RUSH uniquement</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tag, passager, PNR..."
                className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-white/80">
            {filteredBaggages.length} bagage(s) trouvé(s)
          </p>
          <button
            onClick={fetchBaggages}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white/95 backdrop-blur-sm hover:bg-gray-50"
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Baggages List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      ) : filteredBaggages.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-white">Aucun bagage</h3>
          <p className="mt-1 text-sm text-gray-500">
            Aucun bagage trouvé pour les critères sélectionnés
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBaggages.map(renderBaggageCard)}
        </div>
      )}

      {/* Rush Modal */}
      {showRushModal && selectedBaggage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
              Marquer comme RUSH
            </h3>

            <div className="mb-4">
              <p className="text-sm text-white/80 mb-2">Bagage:</p>
              <p className="font-mono font-bold">{getBaggageIdentifier(selectedBaggage)}</p>
              <p className="text-sm text-gray-700">{getBaggagePassenger(selectedBaggage)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={rushReason}
                  onChange={(e) => setRushReason(e.target.value)}
                  placeholder="Soute pleine, bagage en retard..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prochain vol (optionnel)
                </label>
                <input
                  type="text"
                  value={nextFlight}
                  onChange={(e) => setNextFlight(e.target.value)}
                  placeholder="AC100"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarques (optionnel)
                </label>
                <textarea
                  value={rushRemarks}
                  onChange={(e) => setRushRemarks(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowRushModal(false);
                  setSelectedBaggage(null);
                  setRushReason('');
                  setNextFlight('');
                  setRushRemarks('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeclareRush}
                disabled={!rushReason}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmer RUSH
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
