import axios from 'axios';

// Configuration API - Litige Portal
// Utiliser l'API de production par défaut
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.brsats.com';

console.log('🔧 Litige Portal API:', API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ajouter l'API key
const API_KEY = import.meta.env.VITE_API_KEY || 'bfs-api-key-secure-2025';
api.defaults.headers.common['x-api-key'] = API_KEY;

// Intercepteur pour ajouter le token et les headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bfs_litige_token');
  const userData = localStorage.getItem('bfs_litige_user');
  
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Ne pas modifier les routes d'auth
  const isAuthRoute = config.url?.includes('/auth/login') || 
                      config.url?.includes('/auth/register') ||
                      config.url?.includes('/auth/me') ||
                      config.url?.includes('/auth/logout');

  if (userData && !isAuthRoute) {
    try {
      const user = JSON.parse(userData);
      
      // Litige a accès à tous les aéroports
      const effectiveAirportCode = 'ALL';
      
      const params = config.params as Record<string, unknown> | undefined;
      if (params && !params.airport) {
        params.airport = effectiveAirportCode;
      } else if (!config.params) {
        config.params = { airport: effectiveAirportCode };
      }
      
      if (config.headers) {
        config.headers['x-airport-code'] = effectiveAirportCode;
        config.headers['x-user-id'] = user.id;
        config.headers['x-user-role'] = user.role;
      }
      
      const data = config.data as Record<string, unknown> | undefined;
      if (data && typeof data === 'object' && !data.airport_code) {
        data.airport_code = effectiveAirportCode;
      }
    } catch (e) {
      // Ignorer les erreurs de parsing
    }
  }

  return config;
});

// Intercepteur de réponse
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
