import { AlertCircle, CheckCircle, Package, Plus, Search, Tag, User, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface Passenger {
  id: string;
  fullName: string;
  pnr: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  baggage_count: number;
}

interface Baggage {
  id: string;
  tag_number: string;
  status: string;
  weight?: number;
  flight_number: string;
  passenger_id?: string;
  manually_authorized: boolean;
  destination?: string;
  notes?: string;
}

export default function BaggageManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'add-to-passenger' | 'manual-tag'>('add-to-passenger');
  const [searchTerm, setSearchTerm] = useState('');
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [existingBaggages, setExistingBaggages] = useState<Baggage[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Formulaire pour ajouter un bagage à un passager
  const [newBaggageForm, setNewBaggageForm] = useState({
    tag_number: '',
    weight: '',
    notes: ''
  });

  // Formulaire pour créer une étiquette manuelle
  const [manualTagForm, setManualTagForm] = useState({
    tag_number: '',
    flight_number: '',
    weight: '',
    origin: '',
    destination: '',
    notes: ''
  });

  // Charger les passagers
  useEffect(() => {
    loadPassengers();
  }, []);

  // Charger les bagages existants quand un passager est sélectionné
  useEffect(() => {
    if (selectedPassenger) {
      loadPassengerBaggages(selectedPassenger.id);
    }
  }, [selectedPassenger]);

  const loadPassengers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/passengers');
      const data = response.data as any;
      if (data.success) {
        setPassengers(data.data);
      }
    } catch (err) {
      console.error('Erreur chargement passagers:', err);
      setError('Erreur lors du chargement des passagers');
    } finally {
      setLoading(false);
    }
  };

  const loadPassengerBaggages = async (passengerId: string) => {
    try {
      const response = await api.get(`/api/v1/baggages?passenger_id=${passengerId}`);
      const data = response.data as any;
      if (data.success) {
        setExistingBaggages(data.data);
      }
    } catch (err) {
      console.error('Erreur chargement bagages:', err);
    }
  };

  const filteredPassengers = passengers.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.pnr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.flightNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddBaggageToPassenger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPassenger || !newBaggageForm.tag_number) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post('/api/v1/baggage', {
        passenger_id: selectedPassenger.id,
        tag_number: newBaggageForm.tag_number,
        weight: newBaggageForm.weight ? parseFloat(newBaggageForm.weight) : null,
        airport_code: user?.airport_code,
        notes: newBaggageForm.notes,
        manually_authorized: true
      });

      if ((response.data as any).success) {
        setSuccess('Bagage ajouté avec succès au passager');
        setNewBaggageForm({ tag_number: '', weight: '', notes: '' });
        loadPassengerBaggages(selectedPassenger.id);
        loadPassengers(); // Recharger pour mettre à jour le compteur
      }
    } catch (err: any) {
      if (err.response?.data?.requiresAuthorization) {
        setError(`Autorisation requise: ${err.response.data.error}. Le passager a déclaré ${err.response.data.declaredCount} bagages et vous essayez d'en ajouter ${err.response.data.requestedCount}.`);
      } else {
        setError(err.response?.data?.error || 'Erreur lors de l\'ajout du bagage');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateManualTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTagForm.tag_number || !manualTagForm.flight_number) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Créer un bagage sans passager (étiquette manuelle)
      const response = await api.post('/api/v1/baggage', {
        tag_number: manualTagForm.tag_number,
        flight_number: manualTagForm.flight_number,
        weight: manualTagForm.weight ? parseFloat(manualTagForm.weight) : null,
        airport_code: user?.airport_code,
        origin: manualTagForm.origin,
        destination: manualTagForm.destination,
        notes: manualTagForm.notes,
        manually_authorized: true,
        status: 'checked'
      });

      if ((response.data as any).success) {
        setSuccess('Étiquette manuelle créée avec succès');
        setManualTagForm({ tag_number: '', flight_number: '', weight: '', origin: '', destination: '', notes: '' });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la création de l\'étiquette');
    } finally {
      setSubmitting(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (!user) return null;

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Gestion des Bagages</h1>
        <p className="text-white/60">Ajouter des bagages supplémentaires et créer des étiquettes manuelles</p>
        <p className="text-white/60 mt-2">
          Aéroport: {user?.airport_code}
          {user?.airline_code && user?.airline_code !== 'ALL' && (
            <span className="ml-4">✈ Compagnie: {user.airline_code}</span>
          )}
        </p>
      </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center text-red-200">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span>{error}</span>
            <button onClick={clearMessages} className="ml-auto text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center text-green-200">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
            <span>{success}</span>
            <button onClick={clearMessages} className="ml-auto text-green-400 hover:text-green-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Onglets */}
        <div className="mb-6">
          <div className="border-b border-white/20">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('add-to-passenger')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'add-to-passenger'
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-white/60 hover:text-white/80 hover:border-white/40'
                }`}
              >
                <User className="w-4 h-4 inline mr-2" />
                Ajouter à un passager
              </button>
              <button
                onClick={() => setActiveTab('manual-tag')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'manual-tag'
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-white/60 hover:text-white/80 hover:border-white/40'
                }`}
              >
                <Tag className="w-4 h-4 inline mr-2" />
                Étiquette manuelle
              </button>
            </nav>
          </div>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'add-to-passenger' && (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-300 mb-4">Ajouter un bagage à un passager</h2>
            
            {/* Recherche de passager */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-blue-300/70 mb-2">Rechercher un passager</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300/50 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nom, PNR ou numéro de vol..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Liste des passagers */}
            {searchTerm && (
              <div className="mb-6 max-h-60 overflow-y-auto bg-white/5 border border-white/10 rounded-lg">
                {filteredPassengers.map((passenger) => (
                  <div
                    key={passenger.id}
                    onClick={() => setSelectedPassenger(passenger)}
                    className={`p-4 cursor-pointer hover:bg-white/10 border-b border-white/10 last:border-b-0 transition-colors ${
                      selectedPassenger?.id === passenger.id ? 'bg-white/15 border-blue-400' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-white">{passenger.fullName}</p>
                        <p className="text-sm text-white/60">PNR: {passenger.pnr}</p>
                        <p className="text-sm text-white/60">Vol: {passenger.flightNumber}</p>
                        <p className="text-sm text-white/60">{passenger.departure} → {passenger.arrival}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
                          {passenger.baggage_count} bagages déclarés
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bagages existants */}
            {selectedPassenger && existingBaggages.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-blue-300 mb-3">Bagages existants</h3>
                <div className="space-y-2">
                  {existingBaggages.map((baggage) => (
                    <div key={baggage.id} className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-blue-400 mr-3" />
                        <div>
                          <p className="font-medium text-blue-200">{baggage.tag_number}</p>
                          <p className="text-sm text-blue-300/70">{baggage.status} - {baggage.weight}kg</p>
                        </div>
                      </div>
                      {baggage.manually_authorized && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Manuel
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulaire d'ajout */}
            {selectedPassenger && (
              <form onSubmit={handleAddBaggageToPassenger} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/85 mb-1">Numéro de tag RFID *</label>
                    <input
                      type="text"
                      value={newBaggageForm.tag_number}
                      onChange={(e) => setNewBaggageForm({...newBaggageForm, tag_number: e.target.value})}
                      placeholder="ex: ET123456789"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/85 mb-1">Poids (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newBaggageForm.weight}
                      onChange={(e) => setNewBaggageForm({...newBaggageForm, weight: e.target.value})}
                      placeholder="23.5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/85 mb-1">Notes</label>
                  <textarea
                    value={newBaggageForm.notes}
                    onChange={(e) => setNewBaggageForm({...newBaggageForm, notes: e.target.value})}
                    placeholder="Notes supplémentaires..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter le bagage
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {activeTab === 'manual-tag' && (
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-purple-300 mb-4">Créer une étiquette manuelle</h2>
            <p className="text-purple-300/70 mb-6">Pour les bagages sans passager (colis compagnie, bagages sans étiquette, etc.)</p>
            
            <form onSubmit={handleCreateManualTag} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/85 mb-1">Numéro de tag RFID *</label>
                  <input
                    type="text"
                    value={manualTagForm.tag_number}
                    onChange={(e) => setManualTagForm({...manualTagForm, tag_number: e.target.value})}
                    placeholder="ex: ET987654321"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/85 mb-1">Numéro de vol *</label>
                  <input
                    type="text"
                    value={manualTagForm.flight_number}
                    onChange={(e) => setManualTagForm({...manualTagForm, flight_number: e.target.value})}
                    placeholder="ex: ET64"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/85 mb-1">Poids (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={manualTagForm.weight}
                    onChange={(e) => setManualTagForm({...manualTagForm, weight: e.target.value})}
                    placeholder="15.3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/85 mb-1">Origine</label>
                  <input
                    type="text"
                    value={manualTagForm.origin}
                    onChange={(e) => setManualTagForm({...manualTagForm, origin: e.target.value})}
                    placeholder="ex: BZV"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/85 mb-1">Destination</label>
                  <input
                    type="text"
                    value={manualTagForm.destination}
                    onChange={(e) => setManualTagForm({...manualTagForm, destination: e.target.value})}
                    placeholder="ex: FIH"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/85 mb-1">Notes</label>
                <textarea
                  value={manualTagForm.notes}
                  onChange={(e) => setManualTagForm({...manualTagForm, notes: e.target.value})}
                  placeholder="Description du bagage, raison de la création manuelle..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Tag className="w-4 h-4 mr-2" />
                    Créer l'étiquette
                  </>
                )}
              </button>
            </form>
          </div>
        )}
    </div>
  );
}