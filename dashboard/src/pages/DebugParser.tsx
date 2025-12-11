import { useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { parserService } from '../services/parser.service';

export default function DebugParser() {
  const { user } = useAuth();
  const [rawScans, setRawScans] = useState<any[]>([]);
  const [selectedScan, setSelectedScan] = useState<any>(null);
  const [parsedResult, setParsedResult] = useState<any>(null);

  useEffect(() => {
    fetchRawScans();
  }, [user]);

  const fetchRawScans = async () => {
    if (!user?.airport_code) return;
    try {
      const response = await api.get(`/api/v1/raw-scans?airport=${user.airport_code}&limit=50`);
      const scans = response.data.data || [];
      setRawScans(scans.filter((s: any) => s.scan_type === 'boarding_pass'));
    } catch (error) {
      console.error('Error fetching raw scans:', error);
    }
  };

  const handleSelectScan = (scan: any) => {
    setSelectedScan(scan);
    try {
      const parsed = parserService.parse(scan.raw_data);
      setParsedResult(parsed);
    } catch (error: any) {
      setParsedResult({ error: error.message });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔍 Debug Parser - Raw Data</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Liste des scans */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Raw Scans ({rawScans.length})</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {rawScans.map((scan, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectScan(scan)}
                className={`p-3 border rounded cursor-pointer hover:bg-blue-50 ${
                  selectedScan === scan ? 'bg-blue-100 border-blue-500' : ''
                }`}
              >
                <div className="text-sm font-mono truncate">
                  {scan.raw_data.substring(0, 80)}...
                </div>
                <div className="text-xs text-white/70 mt-1">
                  Scanné: {new Date(scan.first_scanned_at).toLocaleString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Détails du scan sélectionné */}
        <div>
          {selectedScan && (
            <>
              <h2 className="text-xl font-semibold mb-4">Raw Data</h2>
              <div className="bg-white/85 backdrop-blur-lg p-4 rounded mb-4 font-mono text-xs overflow-x-auto">
                {selectedScan.raw_data}
              </div>

              <h2 className="text-xl font-semibold mb-4">Résultat du Parsing</h2>
              {parsedResult && (
                <div className="bg-white/95 backdrop-blur-lg border rounded p-4">
                  {parsedResult.error ? (
                    <div className="text-red-600">
                      <strong>Erreur:</strong> {parsedResult.error}
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div><strong>Format:</strong> {parsedResult.format}</div>
                      <div><strong>PNR:</strong> {parsedResult.pnr}</div>
                      <div><strong>Nom complet:</strong> {parsedResult.fullName}</div>
                      <div><strong>Prénom:</strong> {parsedResult.firstName}</div>
                      <div><strong>Nom:</strong> {parsedResult.lastName}</div>
                      <div><strong>Vol:</strong> {parsedResult.flightNumber}</div>
                      <div><strong>Départ:</strong> <span className={parsedResult.departure === 'UNK' ? 'text-red-600 font-bold' : 'text-green-600'}>{parsedResult.departure}</span></div>
                      <div><strong>Arrivée:</strong> <span className={parsedResult.arrival === 'UNK' ? 'text-red-600 font-bold' : 'text-green-600'}>{parsedResult.arrival}</span></div>
                      <div><strong>Route:</strong> {parsedResult.route}</div>
                      <div><strong>Siège:</strong> {parsedResult.seatNumber}</div>
                      <div><strong>Heure vol:</strong> {parsedResult.flightTime || 'N/A'}</div>
                      <div><strong>Date vol:</strong> {parsedResult.flightDate || 'N/A'}</div>
                      <div><strong>Compagnie:</strong> {parsedResult.airline}</div>
                      <div><strong>Code compagnie:</strong> {parsedResult.companyCode}</div>
                      <div><strong>Bagages:</strong> {parsedResult.baggageInfo?.count || 0} pièce(s)</div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
