import axios from 'axios';

// Configuration API - Approche simplifiée et cohérente
const API_BASE_URL = import.meta.env.MODE === 'development' || import.meta.env.DEV 
  ? 'http://localhost:3000' 
  : (import.meta.env.VITE_API_URL || 'https://api.brsats.com');

// Log pour debug en développement
if (import.meta.env.MODE === 'development') {
  console.log('🔧 [Passenger Portal] API Base URL:', API_BASE_URL);
}

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
}

// Intercepteur de réponse pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      console.error('Accès refusé:', error.response.data);
    }
    return Promise.reject(error);
  }
);

export default api;
