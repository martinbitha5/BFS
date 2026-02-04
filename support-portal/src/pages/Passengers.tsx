import {
    AlertCircle,
    Briefcase,
    Check,
    Loader2,
    Plane,
    Plus,
    RefreshCw,
    Search,
    Tag,
    User,
    Users as UsersIcon,
    X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import api from '../config/api';

interface Baggage {
  id: string;
  tag_number: string;
  status: string;
  weight?: number;
  created_at?: string;
}

interface Passenger {
  id: string;
  full_name: string;
  pnr: string;
  flight_number: string;
  seat_number?: string;
  class?: string;
  departure: string;
  arrival: string;
  airport_code: string;
  baggage_count: number;
  checked_in: boolean;
  baggages?: Baggage[];
  created_at?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

const BAGGAGE_STATUS_COLORS: Record<string, string> = {
  checked: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  loaded: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  in_transit: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  arrived: 'bg-green-500/20 text-green-300 border-green-500/30',
  delivered: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  rush: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  lost: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const BAGGAGE_STATUS_LABELS: Record<string, string> = {
  checked: 'Enregistré',
  loaded: 'Chargé',
  in_transit: 'En transit',
  arrived: 'Arrivé',
  delivered: 'Livré',
  rush: 'Rush',
  lost: 'Perdu',
};

export default function Passengers() {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal pour voir/ajouter les bagages
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [showBaggageModal, setShowBaggageModal] = useState(false);
  const [addingBaggage, setAddingBaggage] = useState(false);
  const [newBaggageTag, setNewBaggageTag] = useState('');
  const [newBaggageWeight, setNewBaggageWeight] = useState('');

  const fetchPassengers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('bfs_support_token');
      const response = await api.get('/api/v1/passengers/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = response.data as ApiResponse<Passenger[]>;
      if (data.success && Array.isArray(data.data)) {
        setPassengers(data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des passagers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPassengers();
  }, [fetchPassengers]);

  const handleOpenBaggageModal = (passenger: Passenger) => {
    setSelectedPassenger(passenger);
    setShowBaggageModal(true);
    setNewBaggageTag('');
    setNewBaggageWeight('');
  };

  const handleCloseBaggageModal = () => {
    setShowBaggageModal(false);
    setSelectedPassenger(null);
    setNewBaggageTag('');
    setNewBaggageWeight('');
  };

  const handleAddBaggage = async () => {
    if (!selectedPassenger || !newBaggageTag.trim()) {
      setError('Veuillez entrer un numéro de tag');
      return;
    }

    try {
      setAddingBaggage(true);
      setError(null);

      const token = localStorage.getItem('bfs_support_token');
      // Utiliser la route support spécifique qui ne vérifie pas les limites
      const response = await api.post('/api/v1/support/baggages/create', {
        passengerId: selectedPassenger.id,
        tag_number: newBaggageTag.trim(),
        weight: newBaggageWeight ? parseFloat(newBaggageWeight) : null,
        status: 'checked'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = response.data as ApiResponse<Baggage>;
      if (data.success) {
        const addedTag = newBaggageTag;
        setSuccessMessage(`Bagage ${addedTag} ajouté à ${selectedPassenger.full_name}`);
        setNewBaggageTag('');
        setNewBaggageWeight('');
        
        // Ajouter le nouveau bagage localement au passager sélectionné
        const newBaggage: Baggage = {
          id: data.data?.id || Date.now().toString(),
          tag_number: addedTag,
          status: 'checked',
          weight: newBaggageWeight ? parseFloat(newBaggageWeight) : undefined
        };
        
        setSelectedPassenger(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            baggages: [...(prev.baggages || []), newBaggage]
          };
        });
        
        // Rafraîchir la liste complète en arrière-plan
        fetchPassengers();
        
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erreur lors de l\'ajout du bagage';
      setError(errorMessage);
    } finally {
      setAddingBaggage(false);
    }
  };

  // Filtrer les passagers par recherche
  const filteredPassengers = passengers.filter(p =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.pnr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.flight_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.airport_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Trier par date de création (plus récent en premier)
  const sortedPassengers = [...filteredPassengers].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  if (loading && passengers.length === 0) {
    return <LoadingPlane text="Chargement des passagers..." size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <Check className="w-5 h-5" />
          {successMessage}
          <button onClick={() => setSuccessMessage(null)} className="ml-2 hover:bg-green-600 rounded p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-2 hover:bg-red-600 rounded p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UsersIcon className="w-7 h-7 text-indigo-400" />
            Gestion des Passagers
          </h1>
          <p className="text-sm text-white/60">
            {filteredPassengers.length} passager(s) • Ajouter des bagages supplémentaires
          </p>
        </div>
      </div>

      {/* Search and Refresh */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher par nom, PNR, vol ou aéroport..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <button
          onClick={fetchPassengers}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Passengers List */}
      <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
        {sortedPassengers.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Aucun passager trouvé</p>
            <p className="text-sm">Essayez une autre recherche</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {sortedPassengers.slice(0, 100).map(passenger => (
              <div
                key={passenger.id}
                className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => handleOpenBaggageModal(passenger)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{passenger.full_name}</h3>
                      <div className="flex items-center gap-3 text-white/60 text-sm">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" /> {passenger.pnr || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Plane className="w-3 h-3" /> {passenger.flight_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-white/50 text-xs">
                          {passenger.departure} → {passenger.arrival}
                        </span>
                        <span className="text-white/50 text-xs">
                          {passenger.airport_code}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-white">
                        <Briefcase className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-lg">
                          {passenger.baggages?.length || 0}
                        </span>
                        <span className="text-white/50 text-sm">
                          / {passenger.baggage_count} déclaré(s)
                        </span>
                      </div>
                      <p className="text-xs text-white/40">
                        {passenger.checked_in ? 'Enregistré' : 'Non enregistré'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenBaggageModal(passenger);
                      }}
                      className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                      title="Ajouter un bagage"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {sortedPassengers.length > 100 && (
          <div className="p-4 text-center text-white/50 text-sm border-t border-white/10">
            Affichage des 100 premiers résultats. Utilisez la recherche pour affiner.
          </div>
        )}
      </div>

      {/* Baggage Modal */}
      {showBaggageModal && selectedPassenger && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-white/20 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-amber-400" />
                  Bagages de {selectedPassenger.full_name}
                </h2>
                <p className="text-sm text-white/60">
                  {selectedPassenger.pnr} • Vol {selectedPassenger.flight_number}
                </p>
              </div>
              <button onClick={handleCloseBaggageModal} className="text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Info passager */}
              <div className="bg-white/5 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/50">Trajet</span>
                    <p className="text-white font-medium">
                      {selectedPassenger.departure} → {selectedPassenger.arrival}
                    </p>
                  </div>
                  <div>
                    <span className="text-white/50">Aéroport</span>
                    <p className="text-white font-medium">{selectedPassenger.airport_code}</p>
                  </div>
                  <div>
                    <span className="text-white/50">Siège</span>
                    <p className="text-white font-medium">{selectedPassenger.seat_number || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-white/50">Classe</span>
                    <p className="text-white font-medium">{selectedPassenger.class || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Liste des bagages existants */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Bagages actuels ({selectedPassenger.baggages?.length || 0} / {selectedPassenger.baggage_count} déclaré)
                </h3>
                {selectedPassenger.baggages && selectedPassenger.baggages.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPassenger.baggages.map((bag, index) => (
                      <div
                        key={bag.id}
                        className="bg-white/5 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-white font-mono">{bag.tag_number}</p>
                            {bag.weight && (
                              <p className="text-white/50 text-xs">{bag.weight} kg</p>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs border ${BAGGAGE_STATUS_COLORS[bag.status] || 'bg-gray-500/20 text-gray-300'}`}>
                          {BAGGAGE_STATUS_LABELS[bag.status] || bag.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/5 rounded-lg p-6 text-center text-white/50">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun bagage enregistré</p>
                  </div>
                )}
              </div>

              {/* Formulaire d'ajout de bagage */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-400" />
                  Ajouter un bagage supplémentaire
                </h3>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Tag RFID *</label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                        <input
                          type="text"
                          value={newBaggageTag}
                          onChange={(e) => setNewBaggageTag(e.target.value.toUpperCase())}
                          className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 font-mono"
                          placeholder="0012345678"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Poids (kg)</label>
                      <input
                        type="number"
                        value={newBaggageWeight}
                        onChange={(e) => setNewBaggageWeight(e.target.value)}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                        placeholder="23"
                        min="0"
                        max="50"
                        step="0.1"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddBaggage}
                    disabled={addingBaggage || !newBaggageTag.trim()}
                    className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {addingBaggage ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Ajout en cours...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Ajouter le bagage
                      </>
                    )}
                  </button>
                  <p className="text-white/50 text-xs mt-2 text-center">
                    Le bagage sera lié automatiquement à ce passager
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex justify-end shrink-0">
              <button
                onClick={handleCloseBaggageModal}
                className="px-5 py-2 text-white/60 hover:text-white transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
