import { useState, useEffect } from 'react';
import { Calendar, AlertCircle, CheckCircle, Plane, FileSpreadsheet, MapPin } from 'lucide-react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { exportToExcel } from '../utils/exportExcel';
import { getDestinationsFrom } from '../data/airports';

export default function Export() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFlight, setSelectedFlight] = useState('all');
  const [selectedDestination, setSelectedDestination] = useState('all');
  const [flights, setFlights] = useState<string[]>([]);
  const [exportType, setExportType] = useState<'all' | 'passengers' | 'baggages'>('all');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Charger les vols de l'aéroport
  useEffect(() => {
    if (user?.airport_code) {
      fetchFlights();
    }
  }, [user]);

  const fetchFlights = async () => {
    if (!user?.airport_code) return;
    try {
      const response = await api.get(`/api/v1/passengers?airport=${user.airport_code}`);
      const uniqueFlights = [...new Set(response.data.data.map((p: any) => p.flight_number))]
        .filter((flight: any) => flight) // Filtrer les valeurs null/undefined
        .sort() as string[]; // Trier alphabétiquement
      setFlights(uniqueFlights);
      console.log(`${uniqueFlights.length} vols trouvés pour ${user.airport_code}:`, uniqueFlights);
    } catch (err) {
      console.error('Error fetching flights:', err);
      setFlights([]);
    }
  };

  const handleExportFile = async () => {
    if (!user?.airport_code) {
      setMessage({ type: 'error', text: 'Aucun aéroport assigné' });
      return;
    }

    setExporting(true);
    setMessage(null);

    try {
      const exportData: any = {
        airport: user.airport_code,
        exportDate: new Date().toISOString(),
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          flight: selectedFlight !== 'all' ? selectedFlight : null
        }
      };

      // Charger les données selon le type d'export
      if (exportType === 'all' || exportType === 'passengers') {
        let url = `/api/v1/passengers?airport=${user.airportCode}`;
        if (selectedFlight !== 'all') url += `&flight=${selectedFlight}`;
        const passengersRes = await api.get(url);
        exportData.passengers = passengersRes.data.data;
      }

      if (exportType === 'all' || exportType === 'baggages') {
        let url = `/api/v1/baggage?airport=${user.airportCode}`;
        if (selectedFlight !== 'all') url += `&flight=${selectedFlight}`;
        const baggagesRes = await api.get(url);
        exportData.baggages = baggagesRes.data.data;
      }

      // Statistiques
      const statsRes = await api.get(`/api/v1/stats/airport/${user.airportCode}`);
      exportData.statistics = statsRes.data.data;

      // Filtrer par dates et destination si spécifiées
      if (exportData.passengers) {
        exportData.passengers = exportData.passengers.filter((p: any) => {
          // Filtre par date
          if (startDate || endDate) {
            const checkedDate = p.checked_in_at?.split('T')[0];
            if (startDate && checkedDate < startDate) return false;
            if (endDate && checkedDate > endDate) return false;
          }
          // Filtre par destination
          if (selectedDestination !== 'all' && p.arrival !== selectedDestination) {
            return false;
          }
          return true;
        });
      }
      
      if (exportData.baggages) {
        // Filtrer les bagages liés aux passagers filtrés
        const passengerIds = new Set(exportData.passengers?.map((p: any) => p.id));
        exportData.baggages = exportData.baggages.filter((b: any) => {
          // Vérifier que le bagage appartient à un passager filtré
          if (!passengerIds.has(b.passenger_id)) return false;
          
          // Filtre par date
          if (startDate || endDate) {
            const checkedDate = b.checked_at?.split('T')[0];
            if (startDate && checkedDate < startDate) return false;
            if (endDate && checkedDate > endDate) return false;
          }
          return true;
        });
      }

      // Générer le fichier Excel
      await exportToExcel(
        exportData,
        user.airportCode,
        startDate,
        endDate,
        selectedFlight !== 'all' ? selectedFlight : undefined,
        selectedDestination !== 'all' ? selectedDestination : undefined
      );

      setMessage({ 
        type: 'success', 
        text: `Export Excel réussi! ${exportData.passengers?.length || 0} passagers et ${exportData.baggages?.length || 0} bagages exportés.` 
      });
    } catch (err: any) {
      console.error('Error exporting:', err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Erreur lors de l\'export'
      });
    } finally {
      setExporting(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Exporter les données</h2>
        <p className="mt-1 text-sm text-gray-500">
          Exporter les données filtrées par aéroport, dates et vols
        </p>
      </div>

      {/* Filtres */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Filtres d'export</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Vol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Plane className="w-4 h-4 inline mr-1" />
              Vol {flights.length > 0 && <span className="text-xs text-gray-500">({flights.length} disponibles)</span>}
            </label>
            <select
              value={selectedFlight}
              onChange={(e) => setSelectedFlight(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">Tous les vols {flights.length > 0 && `(${flights.length})`}</option>
              {flights.map((flight) => (
                <option key={flight} value={flight}>
                  {flight}
                </option>
              ))}
            </select>
            {flights.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                Aucun vol enregistré pour le moment
              </p>
            )}
          </div>

          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Destination
            </label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">Toutes les destinations</option>
              {user?.airport_code && getDestinationsFrom(user.airport_code).map((airport) => (
                <option key={airport.code} value={airport.code}>
                  {airport.city} ({airport.code})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Filtrer par aéroport d'arrivée
            </p>
          </div>

          {/* Date début */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date de début
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          {/* Date fin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date de fin
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Type d'export */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type de données à exporter
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="all"
                checked={exportType === 'all'}
                onChange={(e) => setExportType(e.target.value as any)}
                className="mr-2"
              />
              Tout
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="passengers"
                checked={exportType === 'passengers'}
                onChange={(e) => setExportType(e.target.value as any)}
                className="mr-2"
              />
              Passagers uniquement
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="baggages"
                checked={exportType === 'baggages'}
                onChange={(e) => setExportType(e.target.value as any)}
                className="mr-2"
              />
              Bagages uniquement
            </label>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-4 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            )}
            <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {/* Bouton Export */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Générer l'export - {user?.airport_code}</h3>
            <p className="mt-1 text-sm text-gray-500">
              Télécharger les données filtrées au format Excel (.xlsx)
            </p>
          </div>
          <button
            onClick={handleExportFile}
            disabled={exporting || !user?.airport_code}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            {exporting ? 'Export Excel en cours...' : 'Télécharger Excel'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              À propos de l'export
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Les exports incluent passagers, bagages et statistiques</li>
                <li>Filtrez par vol, destination et période de dates</li>
                <li>Format Excel (.xlsx) avec 4 feuilles : Informations, Passagers, Bagages, Embarquements</li>
                <li>Les dates vides = exporter toutes les données</li>
                <li>"Toutes les destinations" = exporter tous les vols de votre aéroport</li>
                <li>Filtrez par destination pour exporter uniquement les vols vers un aéroport spécifique</li>
                <li>Fichier professionnel avec styles, couleurs et bordures</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
