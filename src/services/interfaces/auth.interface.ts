import type { User, LoginCredentials, RegisterCredentials, AuthResponse } from '@/types/auth.types';

/** Comment le parcours OAuth aboutit à une session : retour redirigé ou jeton direct. */
export type OAuthFlow = 'redirect' | 'token';

export interface IAuthService {
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  register(credentials: RegisterCredentials): Promise<AuthResponse>;
  logout(): Promise<void>;
  getCurrentUser(): User | null;
  refreshUser(): Promise<User | null>;
  isAuthenticated(): boolean;
  subscribe(callback: (user: User | null) => void): () => void;
}
