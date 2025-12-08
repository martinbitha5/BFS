import { AlertCircle, CheckCircle, FileText, Package, RefreshCw, Upload, XCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

// Configuration du worker PDF.js - utiliser jsdelivr CDN (plus fiable)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface BirsReport {
  id: string;
  report_type: string;
  flight_number: string;
  flight_date: string;
  origin: string;
  destination: string;
  airline: string;
  file_name: string;
  uploaded_at: string;
  total_baggages: number;
  reconciled_count: number;
  unmatched_count: number;
  processed_at?: string;
}

export default function BIRS() {
  const { user } = useAuth();
  const [reports, setReports] = useState<BirsReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  
  // Formulaire d'upload
  const [reportType, setReportType] = useState<'ethiopian' | 'turkish' | 'generic'>('ethiopian');
  const [flightNumber, setFlightNumber] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [origin, setOrigin] = useState('');
  const [airline, setAirline] = useState('');

  useEffect(() => {
    if (user?.airport_code) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    if (!user?.airport_code) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/birs/reports?airport=${user.airport_code}`);
      setReports(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des rapports' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Déterminer le type de fichier
    const extension = file.name.toLowerCase().split('.').pop();
    
    if (extension === 'pdf') {
      setFilePreview('Fichier PDF détecté. Le contenu sera extrait lors du traitement.');
    } else if (extension === 'xlsx' || extension === 'xls') {
      setFilePreview('Fichier Excel détecté. Les données seront extraites lors du traitement.');
    } else {
      // Pour TXT et CSV, afficher un aperçu
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFilePreview(content.substring(0, 500)); // Aperçu des 500 premiers caractères
      };
      reader.readAsText(file);
    }
  };

  const parseFileContent = async (content: string): Promise<any[]> => {
    const items: any[] = [];
    const lines = content.split('\n');

    console.log('[BIRS Parser] Total lignes:', lines.length);

    if (reportType === 'ethiopian') {
      // Format Ethiopian: Bag_ID  Pax_Surname  PNR  LSeq  Class  PSN  KG  Route  Categories
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Ignorer les lignes vides ou trop courtes
        if (!line || line.length < 20) continue;
        
        // Ignorer les en-têtes
        if (line.includes('Bag ID') || line.includes('DEVICE ID') || line.includes('Route:')) continue;
        
        // Détecter les lignes de bagages (commencent par un tag de 8+ caractères)
        const bagIdMatch = line.match(/^([0-9A-Z]{8,15})/);
        if (!bagIdMatch) continue;
        
        const bagId = bagIdMatch[1];
        
        // Séparer par espaces multiples (2+)
        const parts = line.split(/\s{2,}/).map(p => p.trim());
        
        // Extraire les informations
        let passengerName = 'UNKNOWN';
        let pnr = '';
        let baggageClass = 'Y';
        let weight = 0;
        let route = `${origin}-${user?.airport_code}`;
        let categories = '';
        let psn = '';
        
        // Parser les colonnes Ethiopian
        if (parts.length >= 2) passengerName = parts[1];
        if (parts.length >= 3) pnr = parts[2];
        if (parts.length >= 5) baggageClass = parts[4];
        if (parts.length >= 6) psn = parts[5];
        if (parts.length >= 7) weight = parseFloat(parts[6]) || 0;
        if (parts.length >= 8) route = parts[7];
        if (parts.length >= 9) categories = parts[8];
        
        const loaded = categories.includes('PRIO') || baggageClass === 'Prio';
        const received = false;
        
        console.log('[BIRS Parser] Bagage Ethiopian:', { bagId, passengerName, pnr, baggageClass, weight, categories });
        
        items.push({
          bagId,
          passengerName,
          pnr,
          seatNumber: psn,
          class: baggageClass,
          psn,
          weight,
          route,
          categories,
          loaded,
          received
        });
      }
    } else if (reportType === 'turkish') {
      // Format Turkish: N° TAG | Billet/Expédit | Nom Passager/Destinataire | Poids | Comment | Lié Etat
      // Exemple: 235430756  ZZZZZZ  TSHRIEMBA  0  LOADED  Received
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Ignorer les lignes vides ou trop courtes
        if (!line || line.length < 15) continue;
        
        // Ignorer les en-têtes et pages
        if (line.includes('N° TAG') || line.includes('TURKISH AIRLINES') || 
            line.includes('Page') || line.includes('Manifeste') ||
            line.includes('Escale de réception')) continue;
        
        // Séparer par espaces multiples (2+)
        const parts = line.split(/\s{2,}/).map(p => p.trim());
        
        // Format Turkish: [TAG, BILLET, NOM, POIDS, COMMENT, ETAT]
        if (parts.length < 4) continue; // Besoin d'au moins 4 colonnes
        
        const bagId = parts[0]; // N° TAG (peut être court ou avec caractères spéciaux)
        const billet = parts[1] || 'ZZZZZZ'; // Billet/Expédit (souvent ZZZZZZ)
        const passengerName = parts[2] || 'UNKNOWN'; // Nom Passager
        const weight = parseFloat(parts[3]) || 0; // Poids
        const comment = parts[4] || ''; // Comment (LOADED, NOT, etc.)
        const etat = parts[5] || ''; // Lié Etat (Received)
        
        // Déterminer loaded/received
        const loaded = comment.includes('LOADED') || comment === '0';
        const received = etat.includes('Received');
        
        console.log('[BIRS Parser] Bagage Turkish:', { 
          bagId, 
          billet, 
          passengerName, 
          weight, 
          comment, 
          loaded, 
          received 
        });
        
        items.push({
          bagId,
          passengerName,
          pnr: billet !== 'ZZZZZZ' ? billet : '',
          weight,
          route: `${origin}-${user?.airport_code}`,
          categories: comment,
          loaded,
          received
        });
      }
    } else {
      // Format générique: CSV-like
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(/[,;\t]/);
        if (parts.length >= 3) {
          items.push({
            bagId: parts[0].trim(),
            passengerName: parts[1].trim(),
            pnr: parts[2]?.trim(),
            weight: parseFloat(parts[3]) || 0
          });
        }
      }
    }

    console.log('[BIRS Parser] Total bagages parsés:', items.length);
    return items;
  };

  const handleUpload = async () => {
    if (!selectedFile || !user?.airport_code) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un fichier' });
      return;
    }

    if (!flightNumber || !flightDate || !origin || !airline) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs obligatoires' });
      return;
    }

    setUploading(true);
    setMessage(null);
    console.log('[BIRS] Début du traitement du fichier:', selectedFile.name);

    // Détecter le type de fichier
    const isPdf = selectedFile.name.toLowerCase().endsWith('.pdf');
    
    // Lire le contenu du fichier
    const reader = new FileReader();
    
    reader.onerror = () => {
      console.error('[BIRS] Erreur lecture fichier:', reader.error);
      setMessage({ type: 'error', text: 'Erreur lors de la lecture du fichier' });
      setUploading(false);
    };
    
    reader.onload = async (event) => {
      try {
        let fileContent = '';
        
        if (isPdf) {
          // Pour les PDFs, extraire le texte avec pdfjs-dist
          console.log('[BIRS] Extraction du PDF...');
          const arrayBuffer = event.target?.result as ArrayBuffer;
          
          // Charger le PDF
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          console.log('[BIRS] PDF chargé, pages:', pdf.numPages);
          
          // Extraire le texte de toutes les pages
          const textParts: string[] = [];
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            textParts.push(pageText);
          }
          
          fileContent = textParts.join('\n');
          console.log('[BIRS] PDF extrait, texte:', fileContent.length, 'caractères');
          console.log('[BIRS] Aperçu:', fileContent.substring(0, 500));
        } else {
          // Pour les fichiers texte, utiliser directement le contenu
          fileContent = event.target?.result as string;
          console.log('[BIRS] Fichier texte lu, taille:', fileContent.length, 'caractères');
        }
        
        // Parser le fichier
        console.log('[BIRS] Parsing du fichier...');
        const items = await parseFileContent(fileContent);
        console.log('[BIRS] Bagages détectés:', items.length);

        if (items.length === 0) {
          setMessage({ type: 'error', text: 'Aucun bagage détecté dans le fichier' });
          setUploading(false);
          return;
        }

        // Uploader vers l'API
        console.log('[BIRS] Upload vers API avec', items.length, 'bagages...');
        const response = await api.post('/api/v1/birs/upload', {
          fileName: selectedFile.name,
          fileContent: fileContent, // ✅ Envoyer le fichier complet (pas de limite)
          reportType,
          flightNumber,
          flightDate,
          origin,
          destination: user.airport_code,
          airline,
          airlineCode: airline.substring(0, 2).toUpperCase(),
          uploadedBy: user.id,
          airportCode: user.airport_code,
          items
        });

        console.log('[BIRS] Réponse API:', response.data);

        if (response.data.success) {
          setMessage({ 
            type: 'success', 
            text: `Rapport uploadé avec succès! ${items.length} bagages détectés.` 
          });
          
          // Réinitialiser le formulaire
          setSelectedFile(null);
          setFilePreview('');
          setFlightNumber('');
          setFlightDate('');
          setOrigin('');
          setAirline('');
          
          // Recharger les rapports
          await fetchReports();
        }
        
        setUploading(false);
      } catch (err: any) {
        console.error('[BIRS] Erreur upload:', err);
        setMessage({ 
          type: 'error', 
          text: err.response?.data?.error || err.message || 'Erreur lors de l\'upload' 
        });
        setUploading(false);
      }
    };

    // Lire le fichier selon son type
    if (isPdf) {
      reader.readAsArrayBuffer(selectedFile);
    } else {
      reader.readAsText(selectedFile);
    }
  };

  const handleReconcile = async (reportId: string) => {
    if (!user?.airport_code) return;

    try {
      setMessage(null);
      const response = await api.post(`/api/v1/birs/reconcile/${reportId}`, {
        airportCode: user.airport_code
      });

      if (response.data.success) {
        const { matchedCount, unmatchedCount } = response.data.data;
        setMessage({ 
          type: 'success', 
          text: `Réconciliation terminée: ${matchedCount} bagages matchés, ${unmatchedCount} non matchés` 
        });
        fetchReports();
      }
    } catch (err: any) {
      console.error('Error reconciling:', err);
      setMessage({ 
        type: 'error', 
        text: 'Erreur lors de la réconciliation' 
      });
    }
  };

  const getStatusBadge = (report: BirsReport) => {
    if (!report.processed_at) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">En attente</span>;
    }
    
    const rate = report.total_baggages > 0 
      ? (report.reconciled_count / report.total_baggages) * 100 
      : 0;

    if (rate >= 90) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Excellent ({rate.toFixed(0)}%)</span>;
    } else if (rate >= 70) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Bon ({rate.toFixed(0)}%)</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">À vérifier ({rate.toFixed(0)}%)</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            <Package className="w-8 h-8 inline mr-2" />
            Rapports BIRS - Bagages Internationaux
          </h1>
          <p className="text-gray-600 mt-1">
            Importation et réconciliation des fichiers des compagnies aériennes
          </p>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <XCircle className="w-5 h-5 mr-2" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Formulaire d'upload */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          <Upload className="w-6 h-6 inline mr-2" />
          Uploader un fichier BIRS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Type de rapport */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de rapport <span className="text-red-500">*</span>
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="ethiopian">Ethiopian Airlines</option>
              <option value="turkish">Turkish Airlines</option>
              <option value="generic">Autre compagnie</option>
            </select>
          </div>

          {/* Numéro de vol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de vol <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
              placeholder="ex: ET809"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          {/* Date du vol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date du vol <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={flightDate}
              onChange={(e) => setFlightDate(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          {/* Origine */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aéroport d'origine <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
              placeholder="ex: ADD"
              maxLength={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          {/* Compagnie */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compagnie aérienne <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              placeholder="ex: Ethiopian Airlines"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Sélection de fichier */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".txt,.csv,.xlsx,.xls,.pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label 
            htmlFor="file-upload" 
            className="cursor-pointer"
          >
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            {selectedFile ? (
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600">Cliquez pour sélectionner un fichier</p>
                <p className="text-xs text-gray-500 mt-1">TXT, CSV, Excel, PDF</p>
              </div>
            )}
          </label>
        </div>

        {/* Aperçu du fichier */}
        {filePreview && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-800 mb-2">Aperçu du fichier:</p>
            <div className="text-sm text-blue-700 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
              {filePreview}
            </div>
          </div>
        )}

        {/* Bouton upload */}
        <div className="mt-6">
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Uploader et traiter
              </>
            )}
          </button>
        </div>
      </div>

      {/* Liste des rapports */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Historique des rapports
          </h2>
          <button
            onClick={fetchReports}
            className="text-primary-600 hover:text-primary-700"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Chargement...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p>Aucun rapport uploadé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compagnie</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bagages</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.flight_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.flight_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.airline}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.origin} → {report.destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{report.total_baggages}</span>
                        {report.processed_at && (
                          <>
                            <span className="text-green-600">({report.reconciled_count} OK)</span>
                            {report.unmatched_count > 0 && (
                              <span className="text-orange-600">({report.unmatched_count} !)</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!report.processed_at ? (
                        <button
                          onClick={() => handleReconcile(report.id)}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Lancer réconciliation
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReconcile(report.id)}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          Re-traiter
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aide */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          <AlertCircle className="w-4 h-4 inline mr-1" />
          À propos des fichiers BIRS
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Les fichiers BIRS contiennent la liste des bagages envoyés par les compagnies aériennes</li>
          <li>• La réconciliation compare ces fichiers avec les bagages scannés à l'arrivée</li>
          <li>• <strong>Formats recommandés</strong>: TXT (Ethiopian), CSV, TSV</li>
          <li>• <strong>Formats en développement</strong>: Excel (.xlsx), PDF (extraction à améliorer)</li>
          <li>• Les bagages non réconciliés peuvent être déclarés en RUSH</li>
          <li>• Pour de meilleurs résultats, privilégiez les fichiers texte (TXT/CSV)</li>
        </ul>
      </div>
    </div>
  );
}
