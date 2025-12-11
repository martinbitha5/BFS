import axios from 'axios';
import { AlertCircle, Check, FileText, Plane, Upload } from 'lucide-react';
import { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

// URL de l'API depuis les variables d'environnement
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Dashboard() {
  const { airline } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [flightNumber, setFlightNumber] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [airportCode, setAirportCode] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Veuillez sélectionner un fichier');
      setMessageType('error');
      return;
    }

    // Vérifier les informations du vol
    if (!flightNumber || !flightDate || !origin || !destination || !airportCode) {
      setMessage('Veuillez remplir toutes les informations du vol');
      setMessageType('error');
      return;
    }

    // Vérifier le format du fichier
    const validFormats = ['.txt', '.csv', '.tsv', '.xlsx', '.pdf'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validFormats.includes(fileExtension)) {
      setMessage('Format de fichier non supporté. Formats acceptés : TXT, CSV, TSV, XLSX, PDF');
      setMessageType('error');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      let fileContent: string;
      
      // Pour les PDF, utiliser base64, pour les autres fichiers texte
      if (fileExtension === '.pdf') {
        // Lire le fichier PDF en base64
        const reader = new FileReader();
        fileContent = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        // Lire le contenu texte pour TXT, CSV, TSV, XLSX
        fileContent = await file.text();
      }
      
      const payload = {
        fileName: file.name,
        fileContent: fileContent,
        reportType: 'birs',
        flightNumber: flightNumber.toUpperCase(),
        flightDate: flightDate,
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        airportCode: airportCode.toUpperCase(),
        airline: airline?.name || '',
        airlineCode: airline?.code || '',
      };

      const response = await axios.post(`${API_URL}/api/v1/birs/upload`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setMessage(`✅ Fichier uploadé avec succès ! ${response.data.processedCount || 0} bagages traités.`);
      setMessageType('success');
      setFile(null);
      setFlightNumber('');
      setFlightDate('');
      setOrigin('');
      setDestination('');
      setAirportCode('');
      
      // Réinitialiser l'input file
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Erreur lors de l\'upload du fichier');
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold text-white mb-2">Upload BIRS</h1>
        <p className="text-white/90 mb-6">
          Téléchargez vos fichiers BIRS (Baggage Irregularity Report System)
        </p>

        {/* Informations de la compagnie connectée */}
        <div className="bg-gradient-to-r from-primary-900/30 to-blue-900/30 backdrop-blur-md border border-primary-400/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide mb-1">Compagnie connectée</p>
              <p className="text-lg font-bold text-white">{airline?.name}</p>
              <p className="text-sm text-primary-200">Code IATA: {airline?.code}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-3">
              <Plane className="w-8 h-8 text-primary-300" />
            </div>
          </div>
          <p className="text-xs text-white/60 mt-3 border-t border-white/10 pt-3">
            ℹ️ Ces informations seront automatiquement ajoutées à tous vos uploads BIRS
          </p>
        </div>

        {/* Formulaire des informations du vol */}
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Informations spécifiques du vol</h2>
              <p className="text-xs text-white/60 mt-1">Ces informations sont requises pour chaque upload BIRS</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/85 mb-2">
                Numéro de vol *
              </label>
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                placeholder="Ex: AC123"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/85 mb-2">
                Date du vol *
              </label>
              <input
                type="date"
                value={flightDate}
                onChange={(e) => setFlightDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/85 mb-2">
                Origine (code aéroport) *
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Ex: FIH"
                maxLength={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/85 mb-2">
                Destination (code aéroport) *
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Ex: GOM"
                maxLength={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white/85 mb-2">
                Aéroport destinataire du rapport BIRS *
              </label>
              <input
                type="text"
                value={airportCode}
                onChange={(e) => setAirportCode(e.target.value)}
                placeholder="Ex: GOM (généralement la destination du vol)"
                maxLength={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
                required
              />
              <p className="text-xs text-white/60 mt-1">
                Code de l'aéroport qui recevra et réconciliera ce rapport BIRS (souvent identique à la destination)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow p-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            
            <input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              accept=".txt,.csv,.tsv,.xlsx,.pdf"
              className="hidden"
            />
            
            <label
              htmlFor="file-input"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 cursor-pointer transition-colors"
            >
              Sélectionner un fichier
            </label>
            
            <p className="text-sm text-white/60 mt-4">
              Formats acceptés : TXT, CSV, TSV, XLSX, PDF
            </p>
          </div>

          {file && (
            <div className="mt-6 p-4 bg-black/25 backdrop-blur-md border border-white/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-primary-400" />
                <div>
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-sm text-white/60">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Upload en cours...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Uploader</span>
                  </>
                )}
              </button>
            </div>
          )}

          {message && (
            <div
              className={`mt-6 p-4 rounded-lg flex items-start space-x-3 ${
                messageType === 'success'
                  ? 'bg-green-900/30 backdrop-blur-md border border-green-400/30'
                  : 'bg-red-900/30 backdrop-blur-md border border-red-400/30'
              }`}
            >
              {messageType === 'success' ? (
                <Check className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={`text-sm ${
                  messageType === 'success' ? 'text-green-200' : 'text-red-200'
                }`}
              >
                {message}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 bg-black/25 backdrop-blur-md border border-white/20 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-3">📋 Guide d'utilisation</h3>
          
          <div className="space-y-4">
            {/* Informations automatiques */}
            <div className="bg-green-900/20 border border-green-400/20 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-green-200 mb-2">✅ Informations automatiques (de votre inscription)</h4>
              <ul className="text-xs text-white/70 space-y-1">
                <li>• <strong>Nom de la compagnie :</strong> {airline?.name}</li>
                <li>• <strong>Code IATA :</strong> {airline?.code}</li>
                <li>• Ces infos sont ajoutées automatiquement à chaque upload</li>
              </ul>
            </div>

            {/* Informations à renseigner */}
            <div className="bg-blue-900/20 border border-blue-400/20 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-200 mb-2">📝 Informations à renseigner pour chaque vol</h4>
              <ul className="text-xs text-white/70 space-y-1">
                <li>• <strong>Numéro de vol :</strong> Code unique du vol (Ex: AC123, ET456)</li>
                <li>• <strong>Date du vol :</strong> Date de départ du vol</li>
                <li>• <strong>Origine :</strong> Code aéroport de départ (3 lettres, Ex: FIH)</li>
                <li>• <strong>Destination :</strong> Code aéroport d'arrivée (3 lettres, Ex: GOM)</li>
                <li>• <strong>Aéroport BIRS :</strong> Aéroport qui recevra le rapport (souvent = destination)</li>
              </ul>
            </div>

            {/* Informations sur les fichiers */}
            <div className="bg-purple-900/20 border border-purple-400/20 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-purple-200 mb-2">📄 À propos des fichiers BIRS</h4>
              <ul className="text-xs text-white/70 space-y-1">
                <li>• Les fichiers BIRS contiennent la liste des bagages envoyés</li>
                <li>• La réconciliation compare avec les bagages scannés à l'arrivée</li>
                <li>• Les bagages non réconciliés peuvent être déclarés en RUSH</li>
                <li>• <strong>Formats acceptés :</strong> TXT, CSV, TSV, XLSX, PDF</li>
                <li>• <strong>Recommandé :</strong> Privilégiez les fichiers texte (.txt, .csv, .tsv) pour de meilleurs résultats</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
