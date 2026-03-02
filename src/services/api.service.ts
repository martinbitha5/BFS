import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';

const STORAGE_KEYS = {
  API_URL: '@bfs:api_url',
  API_KEY: '@bfs:api_key',
};

/** Cache 12 s pour api.get() - réponses très rapides sur tous les écrans */
const GET_CACHE_TTL_MS = 12000;
const getCache = new Map<string, { data: any; timestamp: number }>();

class ApiService {
  private api: AxiosInstance;
  private cachedApiUrl: string | null = null;

  constructor() {
    // ⚠️ NOTE: L'URL est déterminée au startup de App.tsx
    // et sauvegardée dans AsyncStorage
    // En production, TOUJOURS utiliser l'URL de production comme fallback
    this.api = axios.create({
      baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.brsats.com',
      timeout: 15000, // Timeout 15s pour éviter les blocages
    });

    // Intercepteur pour ajouter l'API key et le token
    this.api.interceptors.request.use(async (config) => {
      // ✅ À chaque requête, s'assurer qu'on a la bonne URL et key depuis AsyncStorage
      const apiUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_URL);
      const apiKey = await AsyncStorage.getItem(STORAGE_KEYS.API_KEY);
      
      if (apiUrl && apiUrl !== this.cachedApiUrl) {
        console.log('[ApiService] 📡 Mise à jour baseURL:', apiUrl);
        this.api.defaults.baseURL = apiUrl;
        this.cachedApiUrl = apiUrl;
      }
      
      const session = await AsyncStorage.getItem('@bfs:session');
      const parsedSession = session ? JSON.parse(session) : null;

      if (apiKey) {
        config.headers['x-api-key'] = apiKey;
      }

      if (parsedSession?.accessToken) {
        config.headers['Authorization'] = `Bearer ${parsedSession.accessToken}`;
      }

      return config;
    });
  }

  async get(url: string, params?: any) {
    const cacheKey = url + (params ? JSON.stringify(params) : '');
    const cached = getCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < GET_CACHE_TTL_MS) {
      return { data: cached.data, status: 200, statusText: 'OK', headers: {}, config: {} as any };
    }
    const res = await this.api.get(url, { params });
    getCache.set(cacheKey, { data: res.data, timestamp: Date.now() });
    return res;
  }

  async post(url: string, data?: any) {
    return this.api.post(url, data);
  }

  async put(url: string, data?: any) {
    return this.api.put(url, data);
  }

  async delete(url: string) {
    return this.api.delete(url);
  }

  /** Invalide le cache GET (appeler après offload, confirm-load, etc.) */
  invalidateGetCache(pattern?: string): void {
    if (!pattern) {
      getCache.clear();
      return;
    }
    for (const key of getCache.keys()) {
      if (key.includes(pattern)) getCache.delete(key);
    }
  }
}

export const apiService = new ApiService();
