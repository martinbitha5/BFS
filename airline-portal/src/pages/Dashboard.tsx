import axios from 'axios';
import { AlertCircle, Check, FileText, Upload } from 'lucide-react';
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

    // Vérifier le format du fichier
    const validFormats = ['.txt', '.csv', '.tsv', '.xlsx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validFormats.includes(fileExtension)) {
      setMessage('Format de fichier non supporté. Formats acceptés : TXT, CSV, TSV, XLSX');
      setMessageType('error');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('airline_code', airline?.code || '');
      formData.append('airline_name', airline?.name || '');

      const response = await axios.post(`${API_URL}/api/v1/birs/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage(`✅ Fichier uploadé avec succès ! ${response.data.processedCount || 0} bagages traités.`);
      setMessageType('success');
      setFile(null);
      
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
        <p className="text-white/90 mb-8">
          Téléchargez vos fichiers BIRS (Baggage Irregularity Report System)
        </p>

        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow p-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            
            <input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              accept=".txt,.csv,.tsv,.xlsx"
              className="hidden"
            />
            
            <label
              htmlFor="file-input"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 cursor-pointer transition-colors"
            >
              Sélectionner un fichier
            </label>
            
            <p className="text-sm text-gray-500 mt-4">
              Formats acceptés : TXT, CSV, TSV, XLSX
            </p>
          </div>

          {file && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-primary-600" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
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
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {messageType === 'success' ? (
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={`text-sm ${
                  messageType === 'success' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {message}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">À propos des fichiers BIRS</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Les fichiers BIRS contiennent la liste des bagages envoyés par les compagnies aériennes</li>
            <li>• La réconciliation compare les fichiers avec les bagages scannés à l'arrivée</li>
            <li>• Les bagages non réconciliés peuvent être déclarés en RUSH (soute pleine/problème tonnage)</li>
            <li>• Formats recommandés : TXT (Shipping), CSV, TSV, XLSX (extraction à améliorer)</li>
            <li>• Pour meilleurs résultats, privilégiez les fichiers texte (.txt, .csv, .tsv)</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
