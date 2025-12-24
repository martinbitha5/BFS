import axios from 'axios';

// Configuration API - Hostinger Cloud Pro (brsats.com)
// En développement, utiliser localhost. En production, utiliser l'URL configurée ou api.brsats.com
// Temporairement en HTTP jusqu'à ce que le certificat SSL soit configuré
// FORCER HTTP même si VITE_API_URL est défini en HTTPS
const API_BASE_URL = import.meta.env.MODE === 'development' || import.meta.env.DEV 
  ? 'http://localhost:3000' 
  : (import.meta.env.VITE_API_URL?.replace('https://', 'http://') || 'http://api.brsats.com');

// Log pour debug (à retirer en production)
if (import.meta.env.MODE === 'development') {
  console.log('🔧 API Base URL:', API_BASE_URL);
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

// Intercepteur pour ajouter automatiquement le code aéroport à toutes les requêtes
api.interceptors.request.use((config) => {
  // Récupérer le token et l'aéroport depuis le localStorage
  const token = localStorage.getItem('bfs_token');
  const userData = localStorage.getItem('bfs_user');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Ne pas ajouter l'aéroport pour les routes d'authentification (login, register)
  const isAuthRoute = config.url?.includes('/auth/login') || 
                      config.url?.includes('/auth/register') ||
                      config.url?.includes('/auth/logout');

  // Extraire l'aéroport de l'utilisateur si disponible et si ce n'est pas une route d'auth
  if (userData && !isAuthRoute) {
    try {
      const user = JSON.parse(userData);
      if (user.airport_code) {
        // Ajouter l'aéroport aux query params si ce n'est pas déjà présent
        if (config.params && !config.params.airport) {
          config.params.airport = user.airport_code;
        } else if (!config.params) {
          config.params = { airport: user.airport_code };
        }
        
        // Ajouter aussi dans les headers pour les routes qui l'utilisent
        config.headers['x-airport-code'] = user.airport_code;
        
        // Ajouter dans le body pour les requêtes POST/PUT si nécessaire
        if (config.data && typeof config.data === 'object' && !config.data.airport_code) {
          config.data.airport_code = user.airport_code;
        }
      }
    } catch (e) {
      // Ignorer les erreurs de parsing
    }
  }

  return config;
});

// Intercepteur de réponse pour gérer les erreurs d'accès
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      // Accès refusé - probablement une restriction d'aéroport
      console.error('Accès refusé:', error.response.data);
    }
    return Promise.reject(error);
  }
);

export default api;
