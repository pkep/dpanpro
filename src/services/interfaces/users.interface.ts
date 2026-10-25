import type { User, UserRole } from '@/types/auth.types';
import type { IncompleteTechnicianProfile } from '@/lib/technicianProfileCompleteness';

export interface IUsersService {
  getUsers(filters?: { role?: UserRole; isActive?: boolean }): Promise<User[]>;
  getUser(id: string): Promise<User | null>;
  /** Batch fetch: single query instead of N×getUser */
  getUsersByIds(ids: string[]): Promise<User[]>;
  getTechnicians(): Promise<User[]>;
  updateRole(id: string, role: UserRole): Promise<void>;
  toggleActive(id: string, isActive: boolean): Promise<void>;
  updateUser(id: string, updates:
  { firstName?: string; lastName?: string; email?: string; phone?: string, avatarUrl?: string; companyLogoUrl?: string | null; }): Promise<void>;

  // New methods for technician search and enrichment
  searchTechniciansEnriched(
    query?: string,
    pagination?: { page: number; limit: number },
    filters?: {
      skill?: string;
      sortBy?: 'firstNameAsc' | 'firstNameDesc';
      isActive?: boolean;
      /** partner_applications.status filter (e.g. 'approved' for the "Actifs" tab). */
      applicationStatus?: string;
    }
  ): Promise<{
    technicians: Array<User & {
      skills?: string[];
      rating?: number;
      completed?: number;
      companyName?: string | null;
      yearsExperience?: number | null;
      zones?: string[] | null;
      validatedAt?: string | null;
      /** Champs de profil manquants (clés de technicianProfileCompleteness). Vide = complet. */
      missingProfileFields?: string[] | null;
    }>;
    total: number;
  }>;
  /** Techniciens actifs dont le profil est incomplet (nom, prénom, photo, mot de passe, infos bancaires). */
  getIncompleteTechnicianProfiles(): Promise<IncompleteTechnicianProfile[]>;
  getTechnicianPosition(technicianId: string): Promise<{ latitude: number; longitude: number; address: string; city: string } | null>;
  getTechnicianAvatar(technicianId: string): Promise<string | null>;

  /**
   * ✨ UPDATE USER WITH FULL SYNC
   *
   * This method handles:
   * 1. Database update
   * 2. Context update (via event dispatch)
   * 3. localStorage sync
   * 4. Multi-tab broadcast
   *
   * Use this INSTEAD of direct Supabase calls!
   */
  updateUserAndSync(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatarUrl?: string;
      companyLogoUrl?: string | null;
    }
  ): Promise<User>;

  /**
   * ✨ NOTIFY ALL LISTENERS OF UPDATE
   *
   * Dispatches CustomEvent that triggers:
   * - Context update
   * - localStorage sync
   * - Multi-tab broadcast
   */
  notifyUserUpdate(user: User): void;

  /**
   * ✨ CREATE ADMIN OR MANAGER
   *
   * Creates a new admin/manager user via edge function
   * Returns userId, tempPassword, and email
   */
  createAdminOrManager(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: 'admin' | 'manager';
    createdBy: string;
    /** @deprecated ignoré : l'URL de connexion est construite côté serveur. */
    loginUrl?: string;
  }): Promise<{ userId: string; tempPassword: string; email: string }>;

  /** Updates the photo quality check result after client-side face-api analysis. */
  updatePhotoQuality(userId: string, ok: boolean, issues: string[]): Promise<void>;
}
