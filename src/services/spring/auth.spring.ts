import type { IAuthService } from '@/services/interfaces/auth.interface';
import type { User, LoginCredentials, RegisterCredentials, AuthResponse } from '@/types/auth.types';
import { springHttp } from './http-client';

interface SpringAuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export class SpringAuthService implements IAuthService {
  private currentUser: User | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // POST /auth/login → ApiResponse<AuthResponse>
      const response = await springHttp.post<SpringAuthResponse>('/auth/login', credentials);
      this.currentUser = response.user;
      localStorage.setItem('depanpro_user', JSON.stringify(response.user));
      localStorage.setItem('depanpro_token', response.accessToken);
      localStorage.setItem('depanpro_refresh_token', response.refreshToken);
      this.notifyListeners();
      return { success: true, user: response.user };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erreur de connexion' };
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      // POST /auth/register → ApiResponse<AuthResponse>
      const response = await springHttp.post<SpringAuthResponse>('/auth/register', credentials);
      return { success: true, user: response.user, requiresEmailVerification: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Erreur lors de l'inscription" };
    }
  }

  async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('depanpro_refresh_token');
    if (!refreshToken) throw new Error('No refresh token');
    const response = await springHttp.post<SpringAuthResponse>('/auth/refresh', { refreshToken });
    localStorage.setItem('depanpro_token', response.accessToken);
    localStorage.setItem('depanpro_refresh_token', response.refreshToken);
  }

  async verifyEmail(token: string): Promise<void> {
    // GET /auth/verify-email?token=...
    await springHttp.get('/auth/verify-email', { token });
  }

  async requestPasswordReset(email: string): Promise<void> {
    // POST /auth/password-reset/request
    await springHttp.post('/auth/password-reset/request', { email });
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    // POST /auth/password-reset/confirm
    await springHttp.post('/auth/password-reset/confirm', { token, newPassword });
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    localStorage.removeItem('depanpro_user');
    localStorage.removeItem('depanpro_token');
    localStorage.removeItem('depanpro_refresh_token');
    this.notifyListeners();
  }

  getCurrentUser(): User | null {
    if (this.currentUser) return this.currentUser;
    const stored = localStorage.getItem('depanpro_user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      } catch {
        localStorage.removeItem('depanpro_user');
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  subscribe(callback: (user: User | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.currentUser));
  }
}
