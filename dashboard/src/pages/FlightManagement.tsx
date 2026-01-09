import { Edit, Plane, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import LoadingPlane from '../components/LoadingPlane';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  departure: string;
  arrival: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'scheduled' | 'boarding' | 'departed' | 'cancelled';
  flightType: 'departure' | 'arrival';
}

interface FlightForm {
  flightNumber: string;
  airline: string;
  airlineCode: string;
  departure: string;
  arrival: string;
  scheduledDate: string;
  scheduledTime: string;
  flightType: 'departure' | 'arrival';
}

const initialForm: FlightForm = {
  flightNumber: '',
  airline: '',
  airlineCode: '',
  departure: '',
  arrival: '',
  scheduledDate: new Date().toISOString().split('T')[0],
  scheduledTime: '',
  flightType: 'departure',
};

export default function FlightManagement() {
  const { user } = useAuth();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [form, setForm] = useState<FlightForm>(initialForm);
  const [saving, setSaving] = useState(false);

  const fetchFlights = useCallback(async () => {
    if (!user?.airport_code) return;
    
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get('/api/v1/flights', {
        params: {
          airport: user.airport_code,
          date: today
        }
      });
      
      const data = response.data as { data: Flight[] };
      setFlights(data.data || []);
    } catch (err) {
      console.error('Erreur chargement vols:', err);
      setError('Erreur lors du chargement des vols');
    } finally {
      setLoading(false);
    }
  }, [user?.airport_code]);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  const openAddModal = () => {
    setEditingFlight(null);
    setForm({
      ...initialForm,
      departure: user?.airport_code || '',
      scheduledDate: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const openEditModal = (flight: Flight) => {
    setEditingFlight(flight);
    setForm({
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      airlineCode: flight.airlineCode,
      departure: flight.departure,
      arrival: flight.arrival,
      scheduledDate: flight.scheduledDate,
      scheduledTime: flight.scheduledTime || '',
      flightType: flight.flightType,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingFlight(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.airport_code) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...form,
        airportCode: user.airport_code,
        status: 'scheduled',
      };

      if (editingFlight) {
        await api.put(`/api/v1/flights/${editingFlight.id}`, payload);
        setSuccess('Vol modifié avec succès');
      } else {
        await api.post('/api/v1/flights', payload);
        setSuccess('Vol ajouté avec succès');
      }

      closeModal();
      fetchFlights();
    } catch (err) {
      console.error('Erreur sauvegarde vol:', err);
      setError('Erreur lors de la sauvegarde du vol');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (flight: Flight) => {
    if (!confirm(`Supprimer le vol ${flight.flightNumber} ?`)) return;

    try {
      await api.delete(`/api/v1/flights/${flight.id}`);
      setSuccess('Vol supprimé');
      fetchFlights();
    } catch (err) {
      console.error('Erreur suppression vol:', err);
      setError('Erreur lors de la suppression');
    }
  };

  const handleUpdateStatus = async (flight: Flight, status: Flight['status']) => {
    try {
      await api.put(`/api/v1/flights/${flight.id}`, { status });
      fetchFlights();
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
      setError('Erreur lors de la mise à jour du statut');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-500/20 text-blue-400',
      boarding: 'bg-yellow-500/20 text-yellow-400',
      departed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400',
    };
    const labels: Record<string, string> = {
      scheduled: 'Programmé',
      boarding: 'Embarquement',
      departed: 'Parti',
      cancelled: 'Annulé',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Plane className="w-7 h-7 text-primary-400" />
            Gestion des Vols
          </h1>
          <p className="text-sm text-white/60">
            Programmer les vols du jour pour l'application mobile
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchFlights}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter un vol
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-300">{success}</p>
        </div>
      )}

      {/* Liste des vols */}
      <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8">
            <LoadingPlane text="Chargement des vols..." size="md" />
          </div>
        ) : flights.length === 0 ? (
          <div className="p-8 text-center">
            <Plane className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/60">Aucun vol programmé pour aujourd'hui</p>
            <p className="text-white/40 text-sm mt-1">
              Ajoutez des vols pour que l'application mobile puisse scanner
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Vol</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Compagnie</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Route</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Heure</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Statut</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Actions</th>
              </tr>
            </thead>
            <tbody>
              {flights.map((flight) => (
                <tr key={flight.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">{flight.flightNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white/80">{flight.airline}</span>
                    <span className="text-white/40 text-sm ml-1">({flight.airlineCode})</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white/80">{flight.departure}</span>
                    <span className="text-white/40 mx-2">→</span>
                    <span className="text-white/80">{flight.arrival}</span>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {flight.scheduledTime || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(flight.status)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        value={flight.status}
                        onChange={(e) => handleUpdateStatus(flight, e.target.value as Flight['status'])}
                        className="px-2 py-1 bg-black/30 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-primary-500"
                      >
                        <option value="scheduled">Programmé</option>
                        <option value="boarding">Embarquement</option>
                        <option value="departed">Parti</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                      <button
                        onClick={() => openEditModal(flight)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4 text-white/60" />
                      </button>
                      <button
                        onClick={() => handleDelete(flight)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal ajout/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">
                {editingFlight ? 'Modifier le vol' : 'Ajouter un vol'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    Numéro de vol *
                  </label>
                  <input
                    type="text"
                    value={form.flightNumber}
                    onChange={(e) => setForm({ ...form, flightNumber: e.target.value.toUpperCase() })}
                    placeholder="ET64"
                    required
                    className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    Code compagnie *
                  </label>
                  <input
                    type="text"
                    value={form.airlineCode}
                    onChange={(e) => setForm({ ...form, airlineCode: e.target.value.toUpperCase() })}
                    placeholder="ET"
                    required
                    maxLength={3}
                    className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Nom compagnie *
                </label>
                <input
                  type="text"
                  value={form.airline}
                  onChange={(e) => setForm({ ...form, airline: e.target.value })}
                  placeholder="Ethiopian Airlines"
                  required
                  className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    Départ *
                  </label>
                  <input
                    type="text"
                    value={form.departure}
                    onChange={(e) => setForm({ ...form, departure: e.target.value.toUpperCase() })}
                    placeholder="FIH"
                    required
                    maxLength={3}
                    className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    Arrivée *
                  </label>
                  <input
                    type="text"
                    value={form.arrival}
                    onChange={(e) => setForm({ ...form, arrival: e.target.value.toUpperCase() })}
                    placeholder="ADD"
                    required
                    maxLength={3}
                    className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={form.scheduledDate}
                    onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    Heure
                  </label>
                  <input
                    type="time"
                    value={form.scheduledTime}
                    onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                    className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Type de vol
                </label>
                <select
                  value={form.flightType}
                  onChange={(e) => setForm({ ...form, flightType: e.target.value as 'departure' | 'arrival' })}
                  className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="departure">Départ</option>
                  <option value="arrival">Arrivée</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {editingFlight ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
