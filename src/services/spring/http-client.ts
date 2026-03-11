// Base HTTP client for Spring API calls
// All responses are wrapped in ApiResponse<T> { success, data?, message? }

const getSpringBaseUrl = (): string => {
  return import.meta.env.VITE_SPRING_API_URL || 'http://localhost:8080/api';
};

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PageData<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export class SpringHttpClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getSpringBaseUrl();
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('depanpro_token');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorBody = await response.text();
      let message = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errorBody);
        message = parsed.message || parsed.error || message;
      } catch {
        message = errorBody || message;
      }
      throw new Error(message);
    }
    // 204 No Content
    if (response.status === 204) return undefined as T;
    const json = await response.json();
    // Unwrap ApiResponse envelope if present
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data as T;
    }
    // Some endpoints return ApiResponse_Void { success, message } without data
    if (json && typeof json === 'object' && 'success' in json && !('data' in json)) {
      return json as T;
    }
    return json as T;
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const response = await fetch(url.toString(), { headers: this.getHeaders() });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async patch<T = void>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async delete(endpoint: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<void>(response);
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    const token = this.getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse<T>(response);
  }

  async getBlob(endpoint: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.blob();
  }
}

export const springHttp = new SpringHttpClient();
