/**
 * Page de gestion des vols (Dashboard Web)
 * Permet au superviseur d'ajouter, modifier et supprimer des vols
 */

import { AlertTriangle, Edit, Plane, PlaneLanding, PlaneTakeoff, Plus, Search, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
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
  scheduledTime?: string;
  status: 'scheduled' | 'boarding' | 'departed' | 'arrived' | 'cancelled';
  flightType: 'departure' | 'arrival';
  baggageRestriction: 'block' | 'allow_with_payment' | 'allow';
  restrictionNote?: string;
  airportCode: string;
  createdAt: string;
}

// Utiliser la date locale au lieu de UTC pour éviter les décalages de timezone
const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function FlightManagement() {
  const { user } = useAuth();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const today = getLocalDate();
  const isToday = selectedDate === today;

  useEffect(() => {
    loadFlights();
  }, [selectedDate]);

  const loadFlights = async () => {
    try {
      setLoading(true);
      
      if (!user?.airport_code) {
        console.warn('Pas de code aéroport');
        setFlights([]);
        return;
      }

      // Charger TOUS les vols sans filtre de date pour éviter les problèmes de timezone
      // puis filtrer côté client
      const response = await api.get(`/api/v1/flights?airport=${user.airport_code}`);
      const allFlights = response.data.data || [];
      
      // Filtrer côté client pour la date sélectionnée
      const filteredFlights = allFlights.filter((f: Flight) => f.scheduledDate === selectedDate);
      setFlights(filteredFlights);
      
      console.log(`${filteredFlights.length} vols pour ${selectedDate} (sur ${allFlights.length} total)`);
    } catch (error: any) {
      console.error('Erreur chargement vols:', error);
      if (error.response?.status === 404) {
        setFlights([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (flight: Flight) => {
    setSelectedFlight(flight);
    setShowEditModal(true);
  };

  const handleDelete = async (flight: Flight) => {
    if (!confirm(`Supprimer le vol ${flight.flightNumber} ?`)) return;

    try {
      await api.delete(`/api/v1/flights/${flight.id}`);
      setFlights(flights.filter(f => f.id !== flight.id));
      alert(`Vol ${flight.flightNumber} supprimé`);
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression du vol');
    }
  };

  const handleAddSuccess = async (newFlight: Flight) => {
    try {
      const response = await api.post('/api/v1/flights', newFlight);
      setFlights([...flights, response.data.data]);
      setShowAddModal(false);
      alert(`Vol ${newFlight.flightNumber} ajouté avec succès`);
    } catch (error) {
      console.error('Erreur ajout vol:', error);
      alert('Erreur lors de l\'ajout du vol');
    }
  };

  const handleEditSuccess = async (updatedFlight: Flight) => {
    try {
      const response = await api.put(`/api/v1/flights/${updatedFlight.id}`, updatedFlight);
      setFlights(flights.map(f => f.id === updatedFlight.id ? response.data.data : f));
      setShowEditModal(false);
      setSelectedFlight(null);
      alert(`Vol ${updatedFlight.flightNumber} modifié avec succès`);
    } catch (error) {
      console.error('Erreur modification vol:', error);
      alert('Erreur lors de la modification du vol');
    }
  };

  const filteredFlights = flights.filter(flight =>
    flight.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flight.airline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Gestion des Vols</h1>
        <p className="text-white/80">Ajoutez et gérez les vols disponibles pour votre aéroport</p>
        
        {/* Info: Vols du jour */}
        <div className="mt-4 bg-blue-900/30 backdrop-blur-md border border-blue-400/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
              <span className="text-blue-300 text-lg">i</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-200 mb-1">Programmation par jour</h3>
              <p className="text-xs text-blue-100/80">
                Les vols sont programmés pour une date précise. L'application mobile ne chargera que les vols du jour en cours.
                {!isToday && " Vous consultez actuellement les vols d'une autre date."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Sélection date */}
          <div className="flex items-center gap-2">
            <label htmlFor="date" className="text-sm font-medium text-white/85">
              Date :
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {!isToday && (
              <button
                onClick={() => setSelectedDate(today)}
                className="text-xs bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Aujourd'hui
              </button>
            )}
            {isToday && (
              <span className="text-xs bg-green-900/30 text-green-300 px-3 py-1.5 rounded-lg border border-green-400/30">
                📅 Jour actuel
              </span>
            )}
          </div>

          {/* Recherche */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un vol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Bouton ajouter */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-5 h-5" />
            <span>Ajouter un vol</span>
          </button>
        </div>
      </div>

      {/* Liste des vols */}
      {loading ? (
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-white/80">Chargement des vols...</p>
        </div>
      ) : filteredFlights.length === 0 ? (
        <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-sm p-8 text-center">
          <Plane className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {searchQuery ? 'Aucun vol trouvé' : 'Aucun vol programmé'}
          </h3>
          <p className="text-white/80 mb-4">
            {searchQuery
              ? 'Essayez avec un autre terme de recherche'
              : 'Commencez par ajouter un vol pour cette date'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-5 h-5" />
              <span>Ajouter un vol</span>
            </button>
          )}
        </div>
      ) : (
        <>
        {/* Vue Desktop - Table */}
        <div className="hidden md:block bg-black/30 backdrop-blur-md border border-white/20 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-black/25 backdrop-blur-md border border-white/20">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Vol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Heure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Restriction Bagage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-black/30 backdrop-blur-md border border-white/20 divide-y divide-gray-200">
              {filteredFlights.map((flight) => (
                <tr key={flight.id} className="hover:bg-black/25 backdrop-blur-md border border-white/20 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                        flight.flightType === 'departure' ? 'bg-blue-900/40' : 'bg-green-900/40'
                      }`}>
                        {flight.flightType === 'departure' 
                          ? <PlaneTakeoff className="h-5 w-5 text-blue-300" />
                          : <PlaneLanding className="h-5 w-5 text-green-300" />
                        }
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{flight.flightNumber}</div>
                        <div className="text-sm text-white/70">{flight.airline}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      flight.flightType === 'departure' 
                        ? 'bg-blue-900/40 text-blue-200' 
                        : 'bg-green-900/40 text-green-200'
                    }`}>
                      {flight.flightType === 'departure' ? 'Départ' : 'Arrivée'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <span>{flight.departure}</span>
                      <span className="text-white/60">→</span>
                      <span>{flight.arrival}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {flight.scheduledTime || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        flight.baggageRestriction === 'block' 
                          ? 'bg-red-900/40 text-red-200' 
                          : flight.baggageRestriction === 'allow_with_payment'
                          ? 'bg-yellow-900/40 text-yellow-200'
                          : 'bg-green-900/40 text-green-200'
                      }`}>
                        {flight.baggageRestriction === 'block' ? 'Bloquer' :
                         flight.baggageRestriction === 'allow_with_payment' ? 'Paiement' :
                         'Autoriser'}
                      </span>
                      {flight.baggageRestriction !== 'allow' && (
                        <span title="Restriction active">
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      flight.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      flight.status === 'boarding' ? 'bg-yellow-900/40 backdrop-blur-sm text-yellow-200' :
                      flight.status === 'departed' ? 'bg-green-900/40 backdrop-blur-sm text-green-200' :
                      flight.status === 'arrived' ? 'bg-white/85 backdrop-blur-lg text-gray-900' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {flight.status === 'scheduled' ? 'Programmé' :
                       flight.status === 'boarding' ? 'Embarquement' :
                       flight.status === 'departed' ? 'Parti' :
                       flight.status === 'arrived' ? 'Arrivé' :
                       'Annulé'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(flight)}
                        className="text-blue-300 hover:text-blue-900 transition-colors p-1 hover:bg-black/25 backdrop-blur-md rounded"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(flight)}
                        className="text-red-600 hover:text-red-900 transition-colors p-1 hover:bg-red-900/30 backdrop-blur-md rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Vue Mobile - Cartes */}
        <div className="md:hidden space-y-4">
          {filteredFlights.map((flight) => (
            <div key={flight.id} className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg p-4">
              {/* En-tête */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Plane className="h-6 w-6 text-blue-300" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{flight.flightNumber}</div>
                    <div className="text-xs text-white/70">{flight.airlineCode}</div>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  flight.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  flight.status === 'boarding' ? 'bg-yellow-900/40 text-yellow-200' :
                  flight.status === 'departed' ? 'bg-green-900/40 text-green-200' :
                  flight.status === 'arrived' ? 'bg-white/85 text-gray-900' :
                  'bg-red-100 text-red-800'
                }`}>
                  {flight.status === 'scheduled' ? 'Programmé' :
                   flight.status === 'boarding' ? 'Embarquement' :
                   flight.status === 'departed' ? 'Parti' :
                   flight.status === 'arrived' ? 'Arrivé' :
                   'Annulé'}
                </span>
              </div>

              {/* Infos vol */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Compagnie</span>
                  <span className="text-sm font-medium text-white">{flight.airline}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Route</span>
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <span>{flight.departure}</span>
                    <span className="text-white/60">→</span>
                    <span>{flight.arrival}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Heure</span>
                  <span className="text-sm font-medium text-white">{flight.scheduledTime || '-'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/20">
                <button 
                  onClick={() => handleEdit(flight)}
                  className="flex items-center space-x-1 text-blue-300 hover:text-blue-200 transition-colors px-3 py-2 hover:bg-black/25 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                  <span className="text-sm">Modifier</span>
                </button>
                <button 
                  onClick={() => handleDelete(flight)}
                  className="flex items-center space-x-1 text-red-400 hover:text-red-300 transition-colors px-3 py-2 hover:bg-red-900/30 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">Supprimer</span>
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* Modal Ajout Vol */}
      {showAddModal && (
        <FlightModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* Modal Modifier Vol */}
      {showEditModal && selectedFlight && (
        <FlightModal
          mode="edit"
          flight={selectedFlight}
          onClose={() => {
            setShowEditModal(false);
            setSelectedFlight(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}

// Modal d'ajout/modification de vol
function FlightModal({ mode, flight, onClose, onSuccess }: { 
  mode: 'add' | 'edit';
  flight?: Flight;
  onClose: () => void; 
  onSuccess: (flight: any) => void;
}) {
  const [formData, setFormData] = useState({
    flightNumber: flight?.flightNumber || '',
    airline: flight?.airline || '',
    airlineCode: flight?.airlineCode || '',
    departure: flight?.departure || '',
    arrival: flight?.arrival || '',
    scheduledDate: flight?.scheduledDate || getLocalDate(),
    scheduledTime: flight?.scheduledTime || '',
    status: (flight?.status || 'scheduled') as 'scheduled' | 'boarding' | 'departed' | 'arrived' | 'cancelled',
    flightType: (flight?.flightType || 'departure') as 'departure' | 'arrival',
    baggageRestriction: (flight?.baggageRestriction || 'block') as 'block' | 'allow_with_payment' | 'allow',
    restrictionNote: flight?.restrictionNote || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'add') {
      // L'API g\u00e9n\u00e9rera l'ID et les timestamps
      onSuccess(formData);
    } else {
      // Mode \u00e9dition : envoyer tout le vol avec les modifications
      onSuccess({
        ...flight!,
        ...formData,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            {mode === 'add' ? 'Ajouter un vol' : 'Modifier le vol'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/85 mb-1">
                  Numéro de vol *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ET80"
                  value={formData.flightNumber}
                  onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/85 mb-1">
                  Code compagnie *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ET"
                  value={formData.airlineCode}
                  onChange={(e) => setFormData({ ...formData, airlineCode: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/85 mb-1">
                Compagnie aérienne *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Ethiopian Airlines"
                value={formData.airline}
                onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/85 mb-1">
                  Départ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: FIH"
                  value={formData.departure}
                  onChange={(e) => setFormData({ ...formData, departure: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/85 mb-1">
                  Arrivée *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ADD"
                  value={formData.arrival}
                  onChange={(e) => setFormData({ ...formData, arrival: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/85 mb-1">
                  Date * (Vol visible uniquement ce jour)
                </label>
                <input
                  type="date"
                  required
                  min={getLocalDate()}
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-white/60 mt-1">
                  Le vol sera visible uniquement le jour sélectionné dans l'app mobile.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/85 mb-1">
                  Heure (optionnel)
                </label>
                <input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Type de vol et Restriction Bagage */}
            <div className="border-t border-white/20 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Plane className="w-4 h-4" />
                Type de vol & Restrictions
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/85 mb-1">
                    Type de vol *
                  </label>
                  <select
                    required
                    value={formData.flightType}
                    onChange={(e) => setFormData({ ...formData, flightType: e.target.value as 'departure' | 'arrival' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="departure">Vol Départ</option>
                    <option value="arrival">Vol Arrivée</option>
                  </select>
                  <p className="text-xs text-white/60 mt-1">
                    {formData.flightType === 'departure' 
                      ? 'Scan bagages au départ (check-in, embarquement)'
                      : 'Scan bagages à l\'arrivée (récupération)'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/85 mb-1">
                    Restriction Bagage Non Enregistré *
                  </label>
                  <select
                    required
                    value={formData.baggageRestriction}
                    onChange={(e) => setFormData({ ...formData, baggageRestriction: e.target.value as 'block' | 'allow_with_payment' | 'allow' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="block">Bloquer (investigation)</option>
                    <option value="allow_with_payment">Autoriser avec paiement</option>
                    <option value="allow">Autoriser sans restriction</option>
                  </select>
                </div>
              </div>

              {/* Explication de la restriction */}
              <div className={`mt-3 p-3 rounded-lg ${
                formData.baggageRestriction === 'block' 
                  ? 'bg-red-900/30 border border-red-400/30' 
                  : formData.baggageRestriction === 'allow_with_payment'
                  ? 'bg-yellow-900/30 border border-yellow-400/30'
                  : 'bg-green-900/30 border border-green-400/30'
              }`}>
                <p className="text-xs text-white/80">
                  {formData.baggageRestriction === 'block' && (
                    <>
                      <strong className="text-red-300">Mode Strict:</strong> Les bagages non enregistrés seront bloqués pour investigation. 
                      L'agent sera alerté de la suspicion de fraude.
                    </>
                  )}
                  {formData.baggageRestriction === 'allow_with_payment' && (
                    <>
                      <strong className="text-yellow-300">Mode Paiement:</strong> Les bagages non enregistrés pourront passer après paiement. 
                      L'agent devra enregistrer le paiement.
                    </>
                  )}
                  {formData.baggageRestriction === 'allow' && (
                    <>
                      <strong className="text-green-300">Mode Libre:</strong> Tous les bagages sont acceptés sans restriction.
                      <span className="text-yellow-200"> Non recommandé pour les vols commerciaux.</span>
                    </>
                  )}
                </p>
              </div>

              {/* Note de restriction (optionnel) */}
              {formData.baggageRestriction !== 'allow' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-white/85 mb-1">
                    Note de restriction (optionnel)
                  </label>
                  <textarea
                    placeholder="Ex: Vérifier les documents d'identité, contacter le superviseur..."
                    value={formData.restrictionNote}
                    onChange={(e) => setFormData({ ...formData, restrictionNote: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-white/85 bg-white/85 backdrop-blur-lg rounded-lg hover:bg-gray-200 transition-colors">
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                {mode === 'add' ? 'Ajouter le vol' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
