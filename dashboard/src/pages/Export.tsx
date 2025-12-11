import { AlertCircle, Calendar, CheckCircle, FileSpreadsheet, MapPin, Plane } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { parserService } from '../services/parser.service';
import { exportRawScansToExcel, exportToExcel } from '../utils/exportExcel';

// Helper function pour parser les raw scans avec le parser sophistiqué
const parseRawScans = (rawScans: any[]) => {
  return rawScans
    .filter((scan: any) => scan.scan_type === 'boarding_pass')
    .map((scan: any) => {
      try {
        const parsed = parserService.parse(scan.raw_data);
        return {
          pnr: parsed.pnr || 'UNKNOWN',
          fullName: parsed.fullName || 'UNKNOWN',
          firstName: parsed.firstName || '',
          lastName: parsed.lastName || '',
          flightNumber: parsed.flightNumber || 'UNKNOWN',
          departure: parsed.departure || 'UNK',
          arrival: parsed.arrival || 'UNK',
          seatNumber: parsed.seatNumber || 'N/A',
          flightTime: parsed.flightTime,
          flightDate: parsed.flightDate,
          airline: parsed.airline || 'Unknown',
          baggageCount: parsed.baggageInfo?.count || 0,
          scanCount: scan.scan_count || 1,
          checkinAt: scan.first_scanned_at || new Date().toISOString(),
        };
      } catch (error) {
        console.error('❌ Erreur parsing raw scan:', error);
        return null;
      }
    })
    .filter((p: any) => p !== null);
};

export default function Export() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [specificDate, setSpecificDate] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'range' | 'specific'>('range');
  const [selectedFlight, setSelectedFlight] = useState('all');
  const [selectedDestination, setSelectedDestination] = useState('all');
  const [flights, setFlights] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [exportType, setExportType] = useState<'all' | 'passengers' | 'baggages' | 'raw_scans'>('raw_scans');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Charger les vols et destinations de l'aéroport
  useEffect(() => {
    if (user?.airport_code) {
      fetchFlights();
      fetchDestinations();
    }
  }, [user]);

  const fetchFlights = async () => {
    if (!user?.airport_code) return;
    try {
      // Récupérer les raw scans et les parser
      const response = await api.get(`/api/v1/raw-scans?airport=${user.airport_code}&limit=1000`);
      const rawScans = response.data.data || [];
      
      if (rawScans.length === 0) {
        console.warn('⚠️  Aucun raw scan trouvé pour cet aéroport.');
        setFlights([]);
        return;
      }
      
      // Parser pour extraire les vols
      const parsedPassengers = parseRawScans(rawScans).filter(p => p !== null);
      const uniqueFlights = [...new Set(parsedPassengers.map(p => p.flightNumber))]
        .filter((flight: any) => flight && flight !== 'UNKNOWN')
        .sort() as string[];
      
      setFlights(uniqueFlights);
      console.log(`✅ ${uniqueFlights.length} vols trouvés depuis ${rawScans.length} raw scans:`, uniqueFlights);
    } catch (err) {
      console.error('Error fetching flights:', err);
      setFlights([]);
    }
  };

  const fetchDestinations = async () => {
    if (!user?.airport_code) return;
    try {
      // Récupérer les raw scans et les parser
      const response = await api.get(`/api/v1/raw-scans?airport=${user.airport_code}&limit=1000`);
      const rawScans = response.data.data || [];
      
      if (rawScans.length === 0) {
        setDestinations([]);
        return;
      }
      
      // Parser pour extraire les destinations
      const parsedPassengers = parseRawScans(rawScans).filter(p => p !== null);
      const uniqueDestinations = [...new Set(parsedPassengers.map(p => p.arrival))]
        .filter((dest: any) => dest && dest !== 'UNKNOWN')
        .sort() as string[];
      
      setDestinations(uniqueDestinations);
      console.log(`✅ ${uniqueDestinations.length} destinations trouvées`);
    } catch (err) {
      console.error('Error fetching destinations:', err);
      setDestinations([]);
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

      // ✅ Export des raw scans SANS parsing (données brutes pures)
      if (exportType === 'raw_scans') {
        let url = `/api/v1/raw-scans?airport=${user.airport_code}`;
        
        // Appliquer les filtres de dates
        if (dateFilterType === 'specific' && specificDate) {
          url += `&start_date=${specificDate}&end_date=${specificDate}`;
        } else {
          if (startDate) url += `&start_date=${startDate}`;
          if (endDate) url += `&end_date=${endDate}`;
        }
        
        // Filtre par statut si nécessaire
        // if (statusFilter) url += `&status=${statusFilter}`;

        const rawScansRes = await api.get(url);
        let rawScans = rawScansRes.data.data;
        
        // Note: Pas de filtrage par destination/vol car pas de parsing
        // Les données brutes n'ont pas ces champs extraits
        
        exportData.rawScans = rawScans;
        exportData.rawScansStats = {
          total: rawScans.length,
          by_type: {
            boarding_pass: rawScans.filter((s: any) => s.scan_type === 'boarding_pass').length,
            baggage_tag: rawScans.filter((s: any) => s.scan_type === 'baggage_tag').length,
          },
          by_status: {
            checkin: rawScans.filter((s: any) => s.status_checkin).length,
            baggage: rawScans.filter((s: any) => s.status_baggage).length,
            boarding: rawScans.filter((s: any) => s.status_boarding).length,
            arrival: rawScans.filter((s: any) => s.status_arrival).length,
          },
        };

        // Générer l'export Excel spécialisé pour raw scans
        await exportRawScansToExcel(
          exportData,
          user.airport_code,
          dateFilterType === 'specific' ? specificDate : startDate,
          dateFilterType === 'specific' ? specificDate : endDate,
          selectedFlight !== 'all' ? selectedFlight : undefined,
          selectedDestination !== 'all' ? selectedDestination : undefined
        );

        setMessage({
          type: 'success',
          text: `Export raw scans réussi ! ${exportData.rawScansStats.total} scans bruts exportés (${exportData.rawScansStats.by_type.boarding_pass} BP, ${exportData.rawScansStats.by_type.baggage_tag} BT).`
        });

        setExporting(false);
        return;
      }

      // Récupérer les raw scans et les PARSER localement dans le dashboard web (intelligent!)
      if (exportType === 'all' || exportType === 'passengers') {
        let url = `/api/v1/raw-scans?airport=${user.airport_code}`;
        
        // Appliquer les filtres de dates
        if (dateFilterType === 'specific' && specificDate) {
          url += `&start_date=${specificDate}&end_date=${specificDate}`;
        } else {
          if (startDate) url += `&start_date=${startDate}`;
          if (endDate) url += `&end_date=${endDate}`;
        }
        
        const rawScansRes = await api.get(url);
        const rawScans = rawScansRes.data.data || [];
        
        console.log(`📥 ${rawScans.length} raw scans récupérés`);
        
        // Vérifier qu'il y a des données
        if (rawScans.length === 0) {
          setMessage({
            type: 'error',
            text: 'Aucun raw scan trouvé pour cet aéroport et cette période.'
          });
          setExporting(false);
          return;
        }
        
        // PARSING SOPHISTIQUÉ DANS LE WEB ! 🚀
        console.log('🧠 Parsing sophistiqué dans le dashboard web...');
        const parsedPassengers = rawScans
          .filter((scan: any) => scan.scan_type === 'boarding_pass')
          .map((scan: any) => {
            try {
              const parsed = parserService.parse(scan.raw_data);
              
              // Logs détaillés pour chaque passager
              const passengerLog = {
                nom: parsed.fullName,
                pnr: parsed.pnr,
                vol: parsed.flightNumber,
                route: `${parsed.departure}→${parsed.arrival}`,
                format: parsed.format,
              };
              console.log('👤 Passager:', passengerLog);
              
              return {
                pnr: parsed.pnr || 'UNKNOWN',
                full_name: parsed.fullName || 'UNKNOWN',
                first_name: parsed.firstName || '',
                last_name: parsed.lastName || '',
                flight_number: parsed.flightNumber || 'UNKNOWN',
                departure: parsed.departure || 'UNK',
                arrival: parsed.arrival || 'UNK',
                seat_number: parsed.seatNumber || 'N/A',
                flight_time: parsed.flightTime,
                flight_date: parsed.flightDate,
                airline: parsed.airline || 'Unknown',
                company_code: parsed.companyCode,
                baggage_count: parsed.baggageInfo?.count || 0,
                baggage_tags: parsed.baggageInfo?.expectedTags || [],
                scan_count: scan.scan_count || 1,
                checked_in_at: scan.first_scanned_at || new Date().toISOString(),
                boarding_status: [{ boarded: scan.status_boarding || false }],
                // Raw data pour debug si nécessaire
                raw_data: scan.raw_data,
              };
            } catch (error) {
              console.error('❌ Erreur parsing raw scan:', error);
              console.error('   Raw data:', scan.raw_data?.substring(0, 100));
              return null;
            }
          })
          .filter((p: any) => p !== null);
        
        console.log(`✅ ${parsedPassengers.length} passagers parsés avec succès dans le web!`);
        console.log('📊 Répartition par route:', 
          parsedPassengers.reduce((acc: any, p: any) => {
            const route = `${p.departure}→${p.arrival}`;
            acc[route] = (acc[route] || 0) + 1;
            return acc;
          }, {})
        );
        
        if (parsedPassengers.length === 0) {
          setMessage({
            type: 'error',
            text: 'Erreur lors du parsing des raw scans.'
          });
          setExporting(false);
          return;
        }
        
        // Transformer en format exportData
        let passengers = parsedPassengers;
        
        // Filtrer par vol si nécessaire
        if (selectedFlight !== 'all') {
          passengers = passengers.filter((p: any) => p.flight_number === selectedFlight);
        }
        
        // Filtrer par destination si nécessaire
        if (selectedDestination !== 'all') {
          passengers = passengers.filter((p: any) => p.arrival === selectedDestination);
        }
        
        exportData.passengers = passengers;
        console.log(`✅ ${parsedPassengers.length} raw scans parsés → ${passengers.length} passagers après filtres`);
      }

      if (exportType === 'all' || exportType === 'baggages') {
        let url = `/api/v1/baggage?airport=${user.airport_code}`;
        if (selectedFlight !== 'all') url += `&flight=${selectedFlight}`;
        const baggagesRes = await api.get(url);
        exportData.baggages = baggagesRes.data.data;
      }

      // Statistiques
      const statsRes = await api.get(`/api/v1/stats/airport/${user.airport_code}`);
      exportData.statistics = statsRes.data.data;

      // Récupérer les rapports BIRS réconciliés
      try {
        const birsRes = await api.get(`/api/v1/birs/reports?airport=${user.airport_code}`);
        const birsReports = birsRes.data.data || [];
        
        console.log(`[Export] ${birsReports.length} rapports BIRS trouvés`);
        
        // Pour chaque rapport, récupérer ses items
        const birsItems: any[] = [];
        for (const report of birsReports) {
          try {
            // La route /reports/:id renvoie le rapport avec ses items
            const reportRes = await api.get(`/api/v1/birs/reports/${report.id}`);
            const reportData = reportRes.data.data;
            const items = reportData.items || [];
            
            console.log(`[Export] Rapport ${report.id}: ${items.length} items`);
            
            // Ajouter le numéro de vol et la date à chaque item
            items.forEach((item: any) => {
              birsItems.push({
                ...item,
                flight_number: report.flight_number,
                flight_date: report.flight_date,
                airline: report.airline,
                report_type: report.report_type,
              });
            });
          } catch (err) {
            console.error(`Erreur récupération items BIRS pour rapport ${report.id}:`, err);
          }
        }
        
        exportData.birsItems = birsItems;
        console.log(`✅ ${birsItems.length} bagages BIRS récupérés depuis ${birsReports.length} rapports`);
      } catch (err) {
        console.error('Erreur récupération rapports BIRS:', err);
        exportData.birsItems = [];
      }

      // Filtrer par dates et destination si spécifiées
      if (exportData.passengers) {
        exportData.passengers = exportData.passengers.filter((p: any) => {
          // Filtre par date
          if (dateFilterType === 'specific' && specificDate) {
            const checkedDate = p.checked_in_at?.split('T')[0];
            if (checkedDate !== specificDate) return false;
          } else if (startDate || endDate) {
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
          if (dateFilterType === 'specific' && specificDate) {
            const checkedDate = b.checked_at?.split('T')[0];
            if (checkedDate !== specificDate) return false;
          } else if (startDate || endDate) {
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
        user.airport_code,
        dateFilterType === 'specific' ? specificDate : startDate,
        dateFilterType === 'specific' ? specificDate : endDate,
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
        <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" />
          Exporter les données
        </h2>
        <p className="mt-1 text-sm text-white/70">
          Exporter les données brutes (raw scans) ou traitées avec filtres avancés
        </p>
      </div>

      {/* Filtres */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 shadow-sm rounded-lg p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Filtres d'export</h3>
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setSpecificDate('');
              setSelectedFlight('all');
              setSelectedDestination('all');
              setDateFilterType('range');
            }}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Réinitialiser
          </button>
        </div>

        {/* Type de filtre de date */}
        <div className="bg-black/25 backdrop-blur-md border border-white/20 rounded-lg p-4">
          <label className="block text-sm font-medium text-white/85 mb-3">
            <Calendar className="w-4 h-4 inline mr-1" />
            Type de période
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="range"
                checked={dateFilterType === 'range'}
                onChange={(e) => setDateFilterType(e.target.value as any)}
                className="mr-2"
              />
              <span className="text-sm">Période (début → fin)</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="specific"
                checked={dateFilterType === 'specific'}
                onChange={(e) => setDateFilterType(e.target.value as any)}
                className="mr-2"
              />
              <span className="text-sm">Jour précis</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Vol */}
          <div>
            <label className="block text-sm font-medium text-white/85 mb-2">
              <Plane className="w-4 h-4 inline mr-1" />
              Vol {flights.length > 0 && <span className="text-xs text-white/70">({flights.length} disponibles)</span>}
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
              <p className="mt-1 text-xs text-white/70">
                Aucun vol enregistré pour le moment
              </p>
            )}
          </div>

          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-white/85 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Route de destination {destinations.length > 0 && <span className="text-xs text-white/70">({destinations.length})</span>}
            </label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">Toutes les destinations</option>
              {destinations.map((dest) => (
                <option key={dest} value={dest}>
                  {dest}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-white/70">
              {exportType === 'raw_scans' ? 'Départ ou arrivée' : 'Aéroport d\'arrivée'}
            </p>
          </div>

          {/* Dates selon le type choisi */}
          {dateFilterType === 'specific' ? (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white/85 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Jour précis
              </label>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Sélectionner un jour"
              />
              <p className="mt-1 text-xs text-white/70">
                Export des données pour cette date uniquement
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-white/85 mb-2">
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
              <div>
                <label className="block text-sm font-medium text-white/85 mb-2">
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
            </>
          )}
        </div>

      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-4 ${message.type === 'success'
          ? 'bg-green-50 border border-green-200'
          : 'bg-red-900/30 backdrop-blur-md border border-red-200'
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

      {/* Section Export Données Brutes */}
      <div className="bg-black/25 backdrop-blur-md border border-purple-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white">Données Brutes (Raw Scans)</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Recommandé 🎯
              </span>
            </div>
            <p className="text-sm text-white/85 mb-2">
              Export des données brutes PURES (sans parsing)
            </p>
            <ul className="text-xs text-white/80 space-y-1">
              <li>✓ Données brutes exactes telles que scannées</li>
              <li>✓ Aucune transformation ni parsing</li>
              <li>✓ Tracking complet : Check-in → Bagage → Embarquement → Arrivée</li>
              <li>✓ Système anti-doublons intégré</li>
              <li>✓ Parfait pour audit et vérification</li>
            </ul>
          </div>
          <button
            onClick={() => {
              setExportType('raw_scans');
              handleExportFile();
            }}
            disabled={exporting || !user?.airport_code}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            {exporting && exportType === 'raw_scans' ? 'Export en cours...' : 'Export Raw Scans'}
          </button>
        </div>
      </div>

      {/* Section Export Standard */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Export Standard (Passagers & Bagages)</h3>
            <p className="text-sm text-white/80 mb-3">
              Export des données structurées avec parsing automatique
            </p>
            <div className="space-y-2">
              <label className="flex items-center text-sm">
                <input
                  type="radio"
                  value="all"
                  checked={exportType === 'all'}
                  onChange={(e) => setExportType(e.target.value as any)}
                  className="mr-2 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-white/85">Tout (passagers + bagages + embarquements)</span>
              </label>
              <label className="flex items-center text-sm">
                <input
                  type="radio"
                  value="passengers"
                  checked={exportType === 'passengers'}
                  onChange={(e) => setExportType(e.target.value as any)}
                  className="mr-2 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-white/85">Passagers uniquement</span>
              </label>
              <label className="flex items-center text-sm">
                <input
                  type="radio"
                  value="baggages"
                  checked={exportType === 'baggages'}
                  onChange={(e) => setExportType(e.target.value as any)}
                  className="mr-2 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-white/85">Bagages uniquement</span>
              </label>
            </div>
          </div>
          <button
            onClick={() => {
              if (exportType === 'raw_scans') setExportType('all');
              handleExportFile();
            }}
            disabled={exporting || !user?.airport_code || exportType === 'raw_scans'}
            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-white/85 bg-black/30 backdrop-blur-md border border-white/20 hover:bg-black/25 backdrop-blur-md border border-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            {exporting && exportType !== 'raw_scans' ? 'Export en cours...' : 'Export Standard'}
          </button>
        </div>
      </div>

      {/* Info - Différences entre les deux systèmes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Différence entre les deux types d'export
            </h3>
            <div className="mt-2 text-sm text-blue-700 space-y-3">
              <div>
                <p className="font-semibold mb-1">📊 Données Brutes (Raw Scans)</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Données brutes sans modification</li>
                  <li>Exactement ce qui est scanné par l'app mobile</li>
                  <li>Un scan = une ligne (pas de doublons)</li>
                  <li>Suivi complet : Check-in → Bagage → Embarquement → Arrivée</li>
                  <li>Pour audits et vérifications</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">📁 Export Standard (Passagers & Bagages)</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Données extraites et organisées automatiquement</li>
                  <li>Séparé en 3 tables : passagers / bagages / embarquements</li>
                  <li>Format structuré pour Excel</li>
                  <li>Pour rapports et statistiques</li>
                </ul>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <p className="text-xs">
                  <strong>Note :</strong> Les filtres de dates fonctionnent pour les deux. 
                  Les filtres vol/destination fonctionnent uniquement pour l'export Standard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
