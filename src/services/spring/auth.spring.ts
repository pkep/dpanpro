import type { IAuthService } from '@/services/interfaces/auth.interface';
import type { User, LoginCredentials, RegisterCredentials, AuthResponse } from '@/types/auth.types';
import { springHttp } from './http-client';

export class SpringAuthService implements IAuthService {
  private currentUser: User | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await springHttp.post<{ user: User; token: string }>('/auth/login', credentials);
      this.currentUser = response.user;
      localStorage.setItem('depanpro_user', JSON.stringify(response.user));
      localStorage.setItem('depanpro_token', response.token);
      this.notifyListeners();
      return { success: true, user: response.user };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erreur de connexion' };
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await springHttp.post<{ user: User; requiresEmailVerification?: boolean }>('/auth/register', credentials);
      return { success: true, user: response.user, requiresEmailVerification: response.requiresEmailVerification };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erreur lors de l\'inscription' };
    }
  }

  async logout(): Promise<void> {
    try { await springHttp.post('/auth/logout'); } catch { /* ignore */ }
    this.currentUser = null;
    localStorage.removeItem('depanpro_user');
    localStorage.removeItem('depanpro_token');
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
