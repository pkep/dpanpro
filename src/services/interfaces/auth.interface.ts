import type { User, LoginCredentials, RegisterCredentials, AuthResponse } from '@/types/auth.types';

export interface IAuthService {
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  register(credentials: RegisterCredentials): Promise<AuthResponse>;
  logout(): Promise<void>;
  getCurrentUser(): User | null;
  isAuthenticated(): boolean;
  subscribe(callback: (user: User | null) => void): () => void;
}
