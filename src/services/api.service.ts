import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
    });

    // Intercepteur pour ajouter l'API key et le token
    this.api.interceptors.request.use(async (config) => {
      const apiKey = await AsyncStorage.getItem('@bfs:api_key');
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
    return this.api.get(url, { params });
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
}

export const apiService = new ApiService();
