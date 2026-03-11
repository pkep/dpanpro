import { API_CONFIG } from '@/config/api.config';

// Service de base pour tous les appels API
export class BaseApiService {
  protected baseUrl: string;
  protected headers: Record<string, string>;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'apikey': API_CONFIG.anonKey,
    };
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
      throw new Error(error.message || `HTTP Error: ${response.status}`);
    }

    return response.json();
  }

  protected setAuthToken(token: string) {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  protected clearAuthToken() {
    delete this.headers['Authorization'];
  }
}
