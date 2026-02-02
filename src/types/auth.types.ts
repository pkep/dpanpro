export type UserRole = 'admin' | 'manager' | 'technician' | 'client' | 'guest';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  isCompany: boolean;
  companyName?: string | null;
  companyAddress?: string | null;
  siren?: string | null;
  vatNumber?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isCompany?: boolean;
  companyName?: string;
  companyAddress?: string;
  siren?: string;
  vatNumber?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
