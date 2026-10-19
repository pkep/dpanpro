export type UserRole = 'admin' | 'manager' | 'technician' | 'client' | 'guest' | 'payment' | 'b2b';

/** OAuth providers supported for CUSTOMER accounts. */
export type OAuthProvider = 'google' | 'facebook';

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
  companyLogoUrl?: string | null;
  mustChangePassword?: boolean;
  photoQualityOk?: boolean | null;
  photoQualityCheckedAt?: string | null;
  photoQualityIssues?: string[] | null;
  /** Techniciens : statut de la candidature (pending | qualification | approved | …). */
  applicationStatus?: 'pending' | 'qualification' | 'approved' | 'suspended' | 'rejected' | 'inactive' | null;
  /** Techniciens : champs de profil manquants (voir lib/technicianProfileCompleteness). */
  missingProfileFields?: string[] | null;
  /** OAuth (clients uniquement) : provider lié au compte. */
  oauthProvider?: OAuthProvider | null;
  /** false pour un compte OAuth sans mot de passe. */
  hasPassword?: boolean;
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

export interface RegisterCredentialsTechnician {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'client' | 'technician' | 'admin' | 'guest';
  isCompany?: boolean;
  companyName?: string;
  companyAddress?: string;
  siren?: string;
  vat_number?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  requiresEmailVerification?: boolean;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
