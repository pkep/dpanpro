import type { User, LoginCredentials, RegisterCredentials, AuthResponse, OAuthProvider } from '@/types/auth.types';

/**
 * How the current API mode performs OAuth:
 *  - 'redirect' (Supabase Auth): call startOAuth() → full-page redirect → /auth/callback → completeOAuthCallback()
 *  - 'token'    (Spring gateway): obtain a provider credential client-side (GIS / FB SDK) → loginWithOAuthToken()
 */
export type OAuthFlow = 'redirect' | 'token';

export interface IAuthService {
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  register(credentials: RegisterCredentials): Promise<AuthResponse>;
  logout(): Promise<void>;
  getCurrentUser(): User | null;
  isAuthenticated(): boolean;
  subscribe(callback: (user: User | null) => void): () => void;

  /**
   * Re-fetch the current user straight from the source of truth (DB / API),
   * update the in-memory + localStorage session and notify listeners.
   * Used to force-refresh cached session data (e.g. avatar) after an
   * admin/manager edited the account elsewhere. No-op when logged out.
   */
  refreshCurrentUser(): Promise<User | null>;

  /** Enregistre la dernière activité de l'utilisateur connecté. */
  recordActivity(): Promise<void>;

  // New methods for email verification and password reset
  resendVerificationEmail(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<{ success: boolean }>;
  verifyEmail(token: string): Promise<void>;

  /**
   * Change the current user's password
   * @param currentPassword - The user's current password
   * @param newPassword - The new password to set
   */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;

  // ── OAuth (CUSTOMER only) ──
  /** Which flow this implementation uses. */
  getOAuthFlow(): OAuthFlow;
  /**
   * Providers actually enabled server-side (Supabase Auth settings / gateway config).
   * Used to render only supported buttons — and nothing when none is enabled.
   */
  getOAuthProviders(): Promise<Record<OAuthProvider, boolean>>;
  /** 'redirect' flow: start the provider redirect (returns after navigation). */
  startOAuth(provider: OAuthProvider, redirectTo?: string): Promise<void>;
  /** 'redirect' flow: finish on /auth/callback — reads the provider session, upserts the customer, stores the session. */
  completeOAuthCallback(): Promise<AuthResponse>;
  /** 'token' flow: exchange a provider credential for our session. Google → idToken, Facebook → accessToken. */
  loginWithOAuthToken(provider: OAuthProvider, credential: { idToken?: string; accessToken?: string }): Promise<AuthResponse>;
}
