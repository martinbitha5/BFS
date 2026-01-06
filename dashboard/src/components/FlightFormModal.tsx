/**
 * Modal pour ajouter/modifier un vol
 */

import { X } from 'lucide-react';
import { useState } from 'react';

export interface Flight {
  id?: string;
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
}

interface FlightFormModalProps {
  onClose: () => void;
  onSubmit: (flight: Flight) => void | Promise<void>;
  defaultDate: string;
  airportCode: string;
  flight?: Flight;
}

export default function FlightFormModal({ onClose, onSubmit, defaultDate, airportCode, flight }: FlightFormModalProps) {
  const [formData, setFormData] = useState<Flight>(
    flight || {
      flightNumber: '',
      airline: '',
      airlineCode: '',
      departure: '',
      arrival: '',
      scheduledDate: defaultDate,
      scheduledTime: '',
      status: 'scheduled',
      flightType: 'departure',
      baggageRestriction: 'block',
      restrictionNote: '',
      airportCode: airportCode,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <h3 className="text-xl font-bold text-white">
            {flight ? 'Modifier le vol' : 'Ajouter un vol'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Numéro de vol */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Numéro de vol *
              </label>
              <input
                type="text"
                name="flightNumber"
                value={formData.flightNumber}
                onChange={handleChange}
                placeholder="Ex: ET064"
                required
                className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Compagnie */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Compagnie aérienne *
              </label>
              <input
                type="text"
                name="airline"
                value={formData.airline}
                onChange={handleChange}
                placeholder="Ex: Ethiopian Airlines"
                required
                className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Code compagnie */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Code compagnie *
              </label>
              <input
                type="text"
                name="airlineCode"
                value={formData.airlineCode}
                onChange={handleChange}
                placeholder="Ex: ET"
                required
                className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Type de vol */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Type de vol *
              </label>
              <select
                name="flightType"
                value={formData.flightType}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="departure">Départ</option>
                <option value="arrival">Arrivée</option>
              </select>
            </div>

            {/* Départ */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Départ *
              </label>
              <input
                type="text"
                name="departure"
                value={formData.departure}
                onChange={handleChange}
                placeholder="Ex: FIH"
                required
                className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Arrivée */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Arrivée *
              </label>
              <input
                type="text"
                name="arrival"
                value={formData.arrival}
                onChange={handleChange}
                placeholder="Ex: FBM"
                required
                className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Date programmée *
              </label>
              <input
                type="date"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Heure */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Heure programmée
              </label>
              <input
                type="time"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Statut */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Statut *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="scheduled">Programmé</option>
                <option value="boarding">Embarquement</option>
                <option value="departed">Parti</option>
                <option value="arrived">Arrivé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>

            {/* Restriction bagages */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Restriction bagages *
              </label>
              <select
                name="baggageRestriction"
                value={formData.baggageRestriction}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="block">Bloqué</option>
                <option value="allow_with_payment">Autorisé avec paiement</option>
                <option value="allow">Autorisé</option>
              </select>
            </div>
          </div>

          {/* Note de restriction */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Note de restriction
            </label>
            <textarea
              name="restrictionNote"
              value={formData.restrictionNote}
              onChange={handleChange}
              rows={3}
              placeholder="Note optionnelle sur les restrictions..."
              className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/10 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white font-medium transition-all"
            >
              {flight ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
