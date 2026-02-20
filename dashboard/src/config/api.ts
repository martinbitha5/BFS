import axios from 'axios';

// Configuration API - Hostinger Cloud Pro (brsats.com)
// En développement, utiliser localhost. En production, utiliser HTTPS avec api.brsats.com
const isProduction = false; // Mode développement local - utiliser localhost:3000
const API_BASE_URL = isProduction
  ? (import.meta.env.VITE_API_URL || 'https://api.brsats.com')
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001');

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

// Ajouter l'API key - utiliser la clé par défaut si non configurée
const API_KEY = import.meta.env.VITE_API_KEY || 'bfs-api-key-secure-2025';
api.defaults.headers.common['x-api-key'] = API_KEY;

// Intercepteur pour ajouter automatiquement le code aéroport à toutes les requêtes
api.interceptors.request.use((config) => {
  // Récupérer le token et l'aéroport depuis le localStorage
  const token = localStorage.getItem('bfs_token');
  const userData = localStorage.getItem('bfs_user');
  
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Ne pas ajouter l'aéroport pour les routes d'authentification (login, register, me, logout)
  const isAuthRoute = config.url?.includes('/auth/login') || 
                      config.url?.includes('/auth/register') ||
                      config.url?.includes('/auth/me') ||
                      config.url?.includes('/auth/logout');

  // Extraire l'aéroport de l'utilisateur si disponible et si ce n'est pas une route d'auth
  if (userData && !isAuthRoute) {
    try {
      const user = JSON.parse(userData);
      
      // Pour les utilisateurs support/baggage_dispute, utiliser 'ALL' par défaut
      const effectiveAirportCode = user.airport_code || 
        (user.role === 'support' || user.role === 'baggage_dispute' ? 'ALL' : null);
      
      if (effectiveAirportCode) {
        // Ajouter l'aéroport aux query params si ce n'est pas déjà présent
        const params = config.params as Record<string, unknown> | undefined;
        if (params && !params.airport) {
          params.airport = effectiveAirportCode;
        } else if (!config.params) {
          config.params = { airport: effectiveAirportCode };
        }
        
        // ✅ Ajouter aussi le airline_code si disponible
        if (user.airline_code && user.airline_code !== 'ALL') {
          if (config.params) {
            (config.params as Record<string, unknown>).airline_code = user.airline_code;
          }
        }
        
        // Ajouter aussi dans les headers pour les routes qui l'utilisent
        if (config.headers) {
          config.headers['x-airport-code'] = effectiveAirportCode;
          config.headers['x-user-id'] = user.id;
          config.headers['x-user-role'] = user.role;
          // ✅ Ajouter airline_code dans les headers aussi
          if (user.airline_code && user.airline_code !== 'ALL') {
            config.headers['x-airline-code'] = user.airline_code;
          }
        }
        
        // Ajouter dans le body pour les requêtes POST/PUT si nécessaire
        const data = config.data as Record<string, unknown> | undefined;
        if (data && typeof data === 'object' && !data.airport_code) {
          data.airport_code = effectiveAirportCode;
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
