import type { IAuthService } from '@/services/interfaces/auth.interface';
import type { User, LoginCredentials, RegisterCredentials, AuthResponse, OAuthProvider } from '@/types/auth.types';
import type { OAuthFlow } from '@/services/interfaces/auth.interface';
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

  resendVerificationEmail(email: string): Promise<void> {
    // POST /auth/resend-verification-email
    return springHttp.post('/auth/resend-verification-email', { email });
  }

  resetPassword(token: string, newPassword: string): Promise<{ success: boolean; }> {
    // POST /auth/password-reset/confirm
    return springHttp.post('/auth/password-reset/confirm', {
      token,
      newPassword
    }).then(() => ({ success: true }));
  }

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

  // ── OAuth (CUSTOMER only) — token flow: the gateway verifies the provider credential ──
  getOAuthFlow(): OAuthFlow { return 'token'; }

  private oauthProvidersCache: Promise<Record<OAuthProvider, boolean>> | null = null;

  /** GET /auth/oauth/providers → { google, facebook } (server config) ∧ browser ids present (SDKs need them). */
  getOAuthProviders(): Promise<Record<OAuthProvider, boolean>> {
    if (this.oauthProvidersCache) return this.oauthProvidersCache;
    this.oauthProvidersCache = (async () => {
      const none: Record<OAuthProvider, boolean> = { google: false, facebook: false };
      try {
        const r = await springHttp.get<Record<string, boolean>>('/auth/oauth/providers');
        const googleId = !!(import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined);
        const fbId = !!(import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined);
        return { google: r?.google === true && googleId, facebook: r?.facebook === true && fbId };
      } catch {
        return none;
      }
    })();
    return this.oauthProvidersCache;
  }

  async startOAuth(): Promise<void> {
    throw new Error('Mode Spring : utilisez loginWithOAuthToken() avec un credential Google/Facebook.');
  }

  async completeOAuthCallback(): Promise<AuthResponse> {
    return { success: false, error: 'Callback OAuth non utilisé en mode Spring' };
  }

  async loginWithOAuthToken(provider: OAuthProvider, credential: { idToken?: string; accessToken?: string }): Promise<AuthResponse> {
    try {
      // POST /auth/oauth/{provider} → same shape as /auth/login
      const response = await springHttp.post<SpringAuthResponse>(`/auth/oauth/${provider}`, {
        idToken: credential.idToken ?? null,
        accessToken: credential.accessToken ?? null,
      });
      this.currentUser = response.user;
      localStorage.setItem('depanpro_user', JSON.stringify(response.user));
      localStorage.setItem('depanpro_token', response.accessToken);
      localStorage.setItem('depanpro_refresh_token', response.refreshToken);
      this.notifyListeners();
      return { success: true, user: response.user };
    } catch (error: any) {
      return { success: false, error: error.message || 'Connexion OAuth impossible' };
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

  /**
   * Re-fetch the current user from the API (source of truth) and refresh the
   * in-memory + localStorage session. Fixes stale cached data (avatar, name…)
   * after an admin/manager edited the account.
   */
  async refreshCurrentUser(): Promise<User | null> {
    const current = this.getCurrentUser();
    if (!current?.id) return current;
    try {
      const fresh = await springHttp.get<User>('/users/me');
      this.currentUser = fresh;
      localStorage.setItem('depanpro_user', JSON.stringify(fresh));
      this.notifyListeners();
      return fresh;
    } catch (error) {
      console.warn('[auth] refreshCurrentUser failed:', error);
      return current;
    }
  }

  async recordActivity(): Promise<void> {
    if (!this.getCurrentUser()) return;
    try {
      await springHttp.post('/users/me/activity', {});
    } catch (activityError) {
      console.warn('[auth] recordActivity failed:', activityError);
    }
  }

  subscribe(callback: (user: User | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Change the current user's password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    // POST /auth/change-password
    await springHttp.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.currentUser));
  }
}
