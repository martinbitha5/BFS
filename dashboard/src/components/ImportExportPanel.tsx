/**
 * Composant pour gérer l'import et l'export de données
 * Permet aux superviseurs d'importer et d'exporter des passagers, bagages, etc.
 */

import React, { useState, useRef } from 'react';
import { Download, Upload, FileText, Package, Users, AlertCircle, CheckCircle } from 'lucide-react';
import {
  exportPassengers,
  exportBaggages,
  exportBoarding,
  importPassengers,
  importBaggages,
  readFileAsText,
  ImportResult
} from '../utils/import-export';

interface ImportExportPanelProps {
  apiUrl: string;
  token: string;
  airportCode: string;
}

type DataType = 'passengers' | 'baggages' | 'boarding';

export const ImportExportPanel: React.FC<ImportExportPanelProps> = ({
  apiUrl,
  token,
  airportCode
}) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDataType, setSelectedDataType] = useState<DataType>('passengers');

  const handleExport = async (dataType: DataType) => {
    setLoading(true);
    setMessage(null);
    
    try {
      switch (dataType) {
        case 'passengers':
          await exportPassengers(apiUrl, token, airportCode, { format: 'csv', includeHeaders: true });
          setMessage({ type: 'success', text: 'Passagers exportés avec succès' });
          break;
        case 'baggages':
          await exportBaggages(apiUrl, token, airportCode, { format: 'csv', includeHeaders: true });
          setMessage({ type: 'success', text: 'Bagages exportés avec succès' });
          break;
        case 'boarding':
          await exportBoarding(apiUrl, token, airportCode, { format: 'csv', includeHeaders: true });
          setMessage({ type: 'success', text: 'Données d\'embarquement exportées avec succès' });
          break;
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Erreur lors de l'export: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = (dataType: DataType) => {
    setSelectedDataType(dataType);
    setImportResult(null);
    setMessage(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);
    setImportResult(null);

    try {
      const content = await readFileAsText(file);
      let result: ImportResult;

      switch (selectedDataType) {
        case 'passengers':
          result = await importPassengers(apiUrl, token, content, airportCode);
          break;
        case 'baggages':
          result = await importBaggages(apiUrl, token, content);
          break;
        default:
          throw new Error('Type de données non supporté pour l\'import');
      }

      setImportResult(result);
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `${result.imported} élément(s) importé(s) avec succès` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Erreur lors de l\'import' 
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Erreur lors de l'import: ${error}` });
    } finally {
      setLoading(false);
      // Reset le input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const dataTypeIcons = {
    passengers: Users,
    baggages: Package,
    boarding: FileText
  };

  const dataTypeLabels = {
    passengers: 'Passagers',
    baggages: 'Bagages',
    boarding: 'Embarquement'
  };

  return (
    <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-white/90">Import / Export de Données</h2>

      {/* Message de statut */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-900/30 backdrop-blur-md text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Résultat d'import détaillé */}
      {importResult && (
        <div className="mb-6 p-4 bg-black/25 backdrop-blur-md border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Résultat de l'import</h3>
          <div className="space-y-1 text-sm text-blue-800">
            <p>Importés: {importResult.imported}</p>
            <p>Ignorés: {importResult.skipped}</p>
            <p>Erreurs: {importResult.errors.length}</p>
          </div>
          {importResult.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium text-blue-900">
                Voir les erreurs ({importResult.errors.length})
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-red-700">
                {importResult.errors.slice(0, 10).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
                {importResult.errors.length > 10 && (
                  <li>... et {importResult.errors.length - 10} autres erreurs</li>
                )}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-6">
        {(['passengers', 'baggages', 'boarding'] as DataType[]).map((dataType) => {
          const Icon = dataTypeIcons[dataType];
          const label = dataTypeLabels[dataType];
          const canImport = dataType === 'passengers' || dataType === 'baggages';

          return (
            <div key={dataType} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-blue-300" />
                  <h3 className="text-lg font-semibold text-white/90">{label}</h3>
                </div>
              </div>

              <div className="flex gap-3">
                {/* Bouton Export */}
                <button
                  onClick={() => handleExport(dataType)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Exporter CSV</span>
                </button>

                {/* Bouton Import */}
                {canImport && (
                  <button
                    onClick={() => handleImportClick(dataType)}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Importer CSV</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Indicateur de chargement */}
      {loading && (
        <div className="mt-6 flex items-center justify-center gap-2 text-blue-300">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span>Traitement en cours...</span>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-black/25 backdrop-blur-md border border-white/20 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-white/90 mb-2">Instructions</h4>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>• <strong>Export:</strong> Télécharge les données au format CSV</li>
          <li>• <strong>Import:</strong> Importe des données depuis un fichier CSV</li>
          <li>• Les fichiers CSV doivent avoir les colonnes appropriées</li>
          <li>• L'import valide automatiquement les données</li>
          <li>• Les données filtrées par aéroport: <strong>{airportCode}</strong></li>
        </ul>
      </div>

      {/* Format CSV attendu */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-white/85 hover:text-gray-900">
          Voir les formats CSV attendus
        </summary>
        <div className="mt-3 space-y-4 text-xs">
          <div className="bg-black/25 backdrop-blur-md border border-white/20 p-3 rounded border border-gray-200">
            <p className="font-semibold text-white/90 mb-1">Passagers:</p>
            <code className="text-gray-600">
              PNR,Nom Complet,Prénom,Nom,Vol,Compagnie,Départ,Arrivée,Heure,Siège,Bagages
            </code>
          </div>
          <div className="bg-black/25 backdrop-blur-md border border-white/20 p-3 rounded border border-gray-200">
            <p className="font-semibold text-white/90 mb-1">Bagages:</p>
            <code className="text-gray-600">
              RFID Tag,Passager ID,Statut,Type,Poids (kg)
            </code>
          </div>
        </div>
      </details>
    </div>
  );
};

export default ImportExportPanel;
