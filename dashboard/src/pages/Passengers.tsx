import { useEffect, useState } from 'react';
import { Users, Search, Plane, Package, CheckCircle, XCircle, Calendar } from 'lucide-react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface Passenger {
  id: string;
  fullName: string;
  pnr: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  seatNumber: string | null;
  baggageCount: number;
  checkedInAt: string;
  airportCode: string;
  baggages?: any[];
  boarding_status?: any[];
}

export default function Passengers() {
  const { user } = useAuth();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [filteredPassengers, setFilteredPassengers] = useState<Passenger[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [flightFilter, setFlightFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPassengers = async () => {
    if (!user?.airport_code) return;
    
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/api/v1/passengers?airport=${user.airport_code}`);
      setPassengers(response.data.data);
      setFilteredPassengers(response.data.data);
    } catch (err: any) {
      console.error('Error fetching passengers:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des passagers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.airport_code) {
      fetchPassengers();
    }
  }, [user]);

  useEffect(() => {
    let filtered = [...passengers];

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.pnr.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (flightFilter) {
      filtered = filtered.filter(p =>
        p.flightNumber.toLowerCase().includes(flightFilter.toLowerCase())
      );
    }

    setFilteredPassengers(filtered);
  }, [searchTerm, flightFilter, passengers]);

  const isBoarded = (passenger: Passenger) => {
    return passenger.boarding_status?.[0]?.boarded || false;
  };

  const getBaggageStatus = (passenger: Passenger) => {
    if (!passenger.baggages || passenger.baggages.length === 0) {
      return { arrivedCount: 0, totalCount: passenger.baggageCount };
    }

    const arrivedCount = passenger.baggages.filter(b => b.status === 'arrived').length;
    return { arrivedCount, totalCount: passenger.baggages.length };
  };

  const uniqueFlights = [...new Set(passengers.map(p => p.flightNumber))].sort();

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Liste des passagers - {user?.airport_code}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vol
            </label>
            <select
              value={flightFilter}
              onChange={(e) => setFlightFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Tous les vols</option>
              {uniqueFlights.map((flight) => (
                <option key={flight} value={flight}>
                  {flight}
                </option>
              ))}
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
                placeholder="Nom, PNR..."
                className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {filteredPassengers.length} passager(s) trouvé(s)
          </p>
          <button
            onClick={fetchPassengers}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Passengers List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      ) : filteredPassengers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun passager</h3>
          <p className="mt-1 text-sm text-gray-500">
            Aucun passager trouvé pour les critères sélectionnés
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Passager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bagages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enregistré
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPassengers.map((passenger) => {
                const boarded = isBoarded(passenger);
                const { arrivedCount, totalCount } = getBaggageStatus(passenger);

                return (
                  <tr key={passenger.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{passenger.fullName}</div>
                        <div className="text-sm text-gray-500 font-mono">PNR: {passenger.pnr}</div>
                        {passenger.seatNumber && (
                          <div className="text-sm text-gray-500">Siège: {passenger.seatNumber}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Plane className="w-4 h-4 mr-2 text-gray-400" />
                        {passenger.flightNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {passenger.departure} → {passenger.arrival}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm">
                        <Package className="w-4 h-4 mr-2 text-gray-400" />
                        <span className={arrivedCount === totalCount && totalCount > 0 ? 'text-green-600' : 'text-gray-900'}>
                          {arrivedCount}/{totalCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {boarded ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Embarqué
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          Non embarqué
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {passenger.checkedInAt && !isNaN(new Date(passenger.checkedInAt).getTime())
                          ? new Date(passenger.checkedInAt).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Non disponible'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
