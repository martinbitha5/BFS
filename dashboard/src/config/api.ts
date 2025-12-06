import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

export default api;
