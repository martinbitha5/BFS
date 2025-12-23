/**
 * Page de Visualisation du Workflow BRS
 * Timeline visuelle du workflow de réconciliation
 */

import {
  CheckCircle,
  Clock,
  FileText,
  Package,
  RefreshCw,
  XCircle,
  AlertCircle,
  PlayCircle,
  Search,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface WorkflowStep {
  id: string;
  step: 'upload' | 'validation' | 'reconciliation' | 'verification' | 'closure';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  performed_by?: string;
  notes?: string;
  step_order?: number;
  items_processed?: number;
  items_success?: number;
  items_failed?: number;
}

interface WorkflowData {
  reportId: string;
  workflow: WorkflowStep[];
  currentStep: string;
  progress: number;
}

interface Report {
  id: string;
  flight_number: string;
  flight_date: string;
  airline: string;
  total_baggages: number;
  reconciled_count: number;
  unmatched_count: number;
}

const stepLabels: Record<string, string> = {
  upload: 'Upload du Rapport',
  validation: 'Validation',
  reconciliation: 'Réconciliation',
  verification: 'Vérification',
  closure: 'Fermeture'
};

const stepIcons: Record<string, any> = {
  upload: FileText,
  validation: Package,
  reconciliation: RefreshCw,
  verification: CheckCircle,
  closure: XCircle
};

export default function BRSWorkflow() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [reportDetails, setReportDetails] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.airport_code) {
      fetchReports();
    }
  }, [user]);

  useEffect(() => {
    if (selectedReport) {
      fetchWorkflow(selectedReport);
      fetchReportDetails(selectedReport);
    }
  }, [selectedReport]);

  const fetchReports = async () => {
    if (!user?.airport_code) return;
    
    try {
      const response = await api.get(`/api/v1/birs/reports?airport=${user.airport_code}`);
      setReports(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching reports:', err);
    }
  };

  const fetchWorkflow = async (reportId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/brs/workflow/${reportId}`);
      setWorkflow(response.data.data);
    } catch (err: any) {
      console.error('Error fetching workflow:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetails = async (reportId: string) => {
    try {
      const response = await api.get(`/api/v1/birs/reports/${reportId}`);
      setReportDetails(response.data.data);
    } catch (err: any) {
      console.error('Error fetching report details:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500 animate-pulse';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return PlayCircle;
      case 'failed': return XCircle;
      default: return Clock;
    }
  };

  const filteredReports = reports.filter(r =>
    r.flight_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.airline.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center">
          <RefreshCw className="w-8 h-8 inline mr-2" />
          Workflow BRS - Timeline
        </h1>
        <p className="text-white/80 mt-1">
          Visualisation du workflow de réconciliation des rapports BRS
        </p>
      </div>

      {/* Sélection du rapport */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un rapport..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            className="px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Sélectionner un rapport</option>
            {filteredReports.map(report => (
              <option key={report.id} value={report.id}>
                {report.flight_number} - {report.airline} - {new Date(report.flight_date).toLocaleDateString('fr-FR')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Workflow Timeline */}
      {workflow && reportDetails && (
        <div className="space-y-6">
          {/* Informations du rapport */}
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {reportDetails.flight_number} - {reportDetails.airline}
                </h2>
                <p className="text-white/70 text-sm">
                  {new Date(reportDetails.flight_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary-400">
                  {workflow.progress.toFixed(0)}%
                </div>
                <div className="text-white/60 text-sm">Progression</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-white/60 text-sm">Total Bagages</p>
                <p className="text-xl font-bold text-white">{reportDetails.total_baggages}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Réconciliés</p>
                <p className="text-xl font-bold text-green-400">{reportDetails.reconciled_count}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Non Matchés</p>
                <p className="text-xl font-bold text-orange-400">{reportDetails.unmatched_count}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Étapes du Workflow</h3>
            <div className="space-y-6">
              {workflow.workflow.map((step, index) => {
                const StepIcon = stepIcons[step.step] || FileText;
                const StatusIcon = getStatusIcon(step.status);
                const isLast = index === workflow.workflow.length - 1;

                return (
                  <div key={step.id} className="flex items-start space-x-4">
                    {/* Ligne verticale */}
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                        step.status === 'completed' ? 'bg-green-500/20 border-green-500' :
                        step.status === 'in_progress' ? 'bg-blue-500/20 border-blue-500 animate-pulse' :
                        step.status === 'failed' ? 'bg-red-500/20 border-red-500' :
                        'bg-gray-500/20 border-gray-500'
                      }`}>
                        <StatusIcon className={`w-6 h-6 ${
                          step.status === 'completed' ? 'text-green-400' :
                          step.status === 'in_progress' ? 'text-blue-400' :
                          step.status === 'failed' ? 'text-red-400' :
                          'text-gray-400'
                        }`} />
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 h-16 ${
                          workflow.workflow[index + 1]?.status === 'completed' ? 'bg-green-500' :
                          workflow.workflow[index + 1]?.status === 'in_progress' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`} />
                      )}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 pb-6">
                      <div className="bg-black/20 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <StepIcon className="w-5 h-5 text-primary-400" />
                              <h4 className="text-lg font-semibold text-white">
                                {stepLabels[step.step]}
                              </h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                step.status === 'completed' ? 'bg-green-900/40 text-green-300' :
                                step.status === 'in_progress' ? 'bg-blue-900/40 text-blue-300' :
                                step.status === 'failed' ? 'bg-red-900/40 text-red-300' :
                                'bg-gray-900/40 text-gray-300'
                              }`}>
                                {step.status === 'completed' ? 'Terminé' :
                                 step.status === 'in_progress' ? 'En cours' :
                                 step.status === 'failed' ? 'Échoué' :
                                 'En attente'}
                              </span>
                            </div>
                            
                            {step.notes && (
                              <p className="text-white/70 text-sm mb-2">{step.notes}</p>
                            )}

                            {step.items_processed !== undefined && (
                              <div className="flex items-center space-x-4 text-sm text-white/60 mt-2">
                                <span>Traîtés: {step.items_processed}</span>
                                {step.items_success !== undefined && (
                                  <span className="text-green-400">✓ {step.items_success}</span>
                                )}
                                {step.items_failed !== undefined && step.items_failed > 0 && (
                                  <span className="text-red-400">✗ {step.items_failed}</span>
                                )}
                              </div>
                            )}

                            <div className="flex items-center space-x-4 mt-3 text-xs text-white/50">
                              {step.started_at && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Début: {new Date(step.started_at).toLocaleString('fr-FR')}</span>
                                </div>
                              )}
                              {step.completed_at && (
                                <div className="flex items-center space-x-1">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Fin: {new Date(step.completed_at).toLocaleString('fr-FR')}</span>
                                </div>
                              )}
                              {step.started_at && step.completed_at && (
                                <span>
                                  Durée: {Math.round((new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()) / 1000)}s
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Étape actuelle */}
          <div className="bg-blue-900/20 backdrop-blur-md border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-400" />
              <p className="text-white">
                <strong>Étape actuelle:</strong> {stepLabels[workflow.currentStep] || workflow.currentStep}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message si aucun rapport sélectionné */}
      {!selectedReport && (
        <div className="bg-black/25 backdrop-blur-md border border-white/20 rounded-lg p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-white/70">Sélectionnez un rapport pour voir son workflow</p>
        </div>
      )}
    </div>
  );
}

