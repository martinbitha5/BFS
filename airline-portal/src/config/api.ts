import axios from 'axios';

// Configuration API - Approche simplifiée et cohérente
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE_URL = isProduction
  ? (import.meta.env.VITE_API_URL || 'https://api.brsats.com')
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

// Log pour debug en développement
if (import.meta.env.MODE === 'development') {
  console.log('🔧 [Airline Portal] API Base URL:', API_BASE_URL);
}

// Créer une instance axios configurée avec l'API key
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ajouter l'API key si configurée
const API_KEY = import.meta.env.VITE_API_KEY;
if (API_KEY) {
  api.defaults.headers.common['x-api-key'] = API_KEY;
  console.log('[API Config] API Key configured');
} else {
  console.warn('[API Config] ⚠️ VITE_API_KEY not found in environment variables');
}

// Intercepteur pour ajouter automatiquement le token d'authentification
api.interceptors.request.use((config) => {
  // Récupérer le token depuis le localStorage
  const token = localStorage.getItem('airline_token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

