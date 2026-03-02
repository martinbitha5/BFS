import axios from 'axios';

const API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  'https://api.brsats.com';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const API_KEY =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_KEY) ||
  'bfs-api-key-secure-2025';
api.defaults.headers.common['x-api-key'] = API_KEY;

export default api;
