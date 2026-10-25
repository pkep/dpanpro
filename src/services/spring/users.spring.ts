import type { IUsersService } from '@/services/interfaces/users.interface';
import type { User, UserRole } from '@/types/auth.types';
import type { IncompleteTechnicianProfile } from '@/lib/technicianProfileCompleteness';
import { springHttp } from './http-client';

/** Ligne du schéma `Technician` (GET /technicians, GET /technicians/{id}/profile). */
interface SpringTechnicianRow {
  id: string;
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: UserRole | null;
  companyName?: string | null;
  currentCity?: string | null;
  department?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  skills?: string[] | null;
  averageRating?: number | null;
  totalRatings?: number | null;
  completedInterventions?: number | null;
  active?: boolean | null;
  avatarUrl?: string | null;
}

/** GET /technicians n'accepte que page/size : on récupère une grande page puis on
 *  filtre, trie et page côté client pour que `total` corresponde à la liste affichée. */
const TECHNICIAN_FETCH_SIZE = 500;

/** True when `userId` is the user currently logged in (persisted by useAuth). */
function isCurrentSessionUser(userId: string): boolean {
  try {
    const raw = localStorage.getItem('depanpro_user');
    if (!raw) return false;
    const current = JSON.parse(raw) as { id?: string } | null;
    return !!current?.id && current.id === userId;
  } catch {
    return false;
  }
}

function toEnrichedTechnician(row: SpringTechnicianRow) {
  return {
    id: row.id,
    email: row.email ?? '',
    firstName: row.firstName ?? '',
    lastName: row.lastName ?? '',
    phone: row.phone ?? null,
    role: (row.role ?? 'technician') as UserRole,
    isActive: row.active ?? true,
    isCompany: false,
    companyName: row.companyName ?? null,
    avatarUrl: row.avatarUrl ?? null,
    createdAt: '',
    updatedAt: '',
    skills: row.skills ?? [],
    rating: row.averageRating ?? undefined,
    completed: row.completedInterventions ?? 0,
    yearsExperience: null,
    zones: null,
    validatedAt: null,
  };
}

export class SpringUsersService implements IUsersService {
  // GET /users?role=&isActive=&search=&page=&size=
  async getUsers(filters?: { role?: UserRole; isActive?: boolean }): Promise<User[]> {
    const params: Record<string, string> = {};
    if (filters?.role) params.role = filters.role;
    if (filters?.isActive !== undefined) params.isActive = String(filters.isActive);
    // PageResponse unwrapped to { content, page, ... } by http-client
    const page = await springHttp.get<{ content: User[] }>('/users', params);
    return page.content;
  }

  // GET /users/me
  async getMe(): Promise<User> {
    return springHttp.get<User>('/users/me');
  }

  // PATCH /users/me
  async updateMe(updates: { firstName?: string; lastName?: string; phone?: string }): Promise<User> {
    return springHttp.patch<User>('/users/me', updates);
  }

  // PATCH /users/me/password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await springHttp.patch('/users/me/password', { currentPassword, newPassword });
  }

  // GET /users/{id}
  async getUser(id: string): Promise<User | null> {
    return springHttp.get<User | null>(`/users/${id}`);
  }

  // GET /users?role=technician&isActive=true
  async getTechnicians(): Promise<User[]> {
    return this.getUsers({ role: 'technician', isActive: true });
  }

  // PATCH /users/{id}/role
  async updateRole(id: string, role: UserRole): Promise<void> {
    await springHttp.patch(`/users/${id}/role`, { role });
  }

  // PATCH /users/{id}/active  (field name changed: active instead of isActive)
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await springHttp.patch(`/users/${id}/active`, { active: isActive });
  }

  // PATCH /users/{id}
  async updateUser(id: string, updates: { firstName?: string; lastName?: string; phone?: string }): Promise<void> {
    await springHttp.patch(`/users/${id}`, updates);
  }

  // GET /users/{id} × N — le contrat n'expose pas de recherche par liste d'ids
  async getUsersByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const users = await Promise.all(ids.map((id) => this.getUser(id)));
    return users.filter((u): u is User => Boolean(u));
  }

  /**
   * GET /technicians (schéma `Technician` : skills, note moyenne, interventions
   * terminées). La route ne gère ni recherche, ni compétence, ni tri : ces
   * filtres sont appliqués côté client sur la page récupérée.
   */
  async searchTechniciansEnriched(
    query?: string,
    pagination?: { page: number; limit: number },
    filters?: {
      skill?: string;
      sortBy?: 'firstNameAsc' | 'firstNameDesc';
      isActive?: boolean;
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
      missingProfileFields?: string[] | null;
    }>;
    total: number;
  }> {
    if (filters?.applicationStatus) {
      throw new Error(
        'searchTechniciansEnriched: le filtre « applicationStatus » n\'est pas supporté en mode Spring',
      );
    }

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 15;

    const rows = await springHttp.get<
      SpringTechnicianRow[] | { content?: SpringTechnicianRow[] }
    >('/technicians', { page: '1', size: String(TECHNICIAN_FETCH_SIZE) });
    const all = Array.isArray(rows) ? rows : rows.content ?? [];

    let technicians = all.map(toEnrichedTechnician);

    const q = query?.trim().toLowerCase();
    if (q) {
      technicians = technicians.filter((t) =>
        [t.firstName, t.lastName, t.email, t.companyName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }

    const skill = filters?.skill?.trim();
    if (skill) technicians = technicians.filter((t) => (t.skills ?? []).includes(skill));

    if (filters?.isActive !== undefined) {
      technicians = technicians.filter((t) => t.isActive === filters.isActive);
    }

    if (filters?.sortBy) {
      const dir = filters.sortBy === 'firstNameDesc' ? -1 : 1;
      technicians.sort((a, b) =>
        dir * (a.firstName ?? '').localeCompare(b.firstName ?? '', 'fr', { sensitivity: 'base' }),
      );
    }

    const total = technicians.length;
    const from = (page - 1) * limit;
    return { technicians: technicians.slice(from, from + limit), total };
  }

  /**
   * Non réalisable côté Spring : la complétude du profil dépend du hash de mot de
   * passe et de l'IBAN/BIC, qu'aucune route du contrat ne renvoie.
   */
  async getIncompleteTechnicianProfiles(): Promise<IncompleteTechnicianProfile[]> {
    throw new Error(
      'getIncompleteTechnicianProfiles: non supporté en mode Spring (mot de passe et coordonnées bancaires non exposés)',
    );
  }

  // GET /technicians/{id}/profile — le schéma n'a pas de rue : la ville courante fait office d'adresse
  async getTechnicianPosition(
    technicianId: string,
  ): Promise<{ latitude: number; longitude: number; address: string; city: string } | null> {
    const profile = await springHttp.get<SpringTechnicianRow | null>(
      `/technicians/${encodeURIComponent(technicianId)}/profile`,
    );
    if (!profile || profile.latitude == null || profile.longitude == null) return null;
    return {
      latitude: profile.latitude,
      longitude: profile.longitude,
      address: profile.currentCity ?? '',
      city: profile.currentCity ?? '',
    };
  }

  // GET /users/{id} → avatarUrl
  async getTechnicianAvatar(technicianId: string): Promise<string | null> {
    const user = await this.getUser(technicianId);
    return user?.avatarUrl ?? null;
  }

  /**
   * Mise à jour + synchronisation de la session.
   *
   * SAFETY: comme la version Lovable Cloud, l'événement « user:updated » n'est émis
   * que lorsque `userId` est l'utilisateur courant — éditer un autre compte ne doit
   * jamais remplacer la session de l'appelant.
   */
  async updateUserAndSync(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatarUrl?: string;
      companyLogoUrl?: string | null;
    },
  ): Promise<User> {
    await this.updateUser(userId, updates);

    const freshUser = await this.getUser(userId);
    if (!freshUser) throw new Error('Failed to fetch updated user');

    if (isCurrentSessionUser(userId)) {
      this.notifyUserUpdate(freshUser);
    }

    window.dispatchEvent(new CustomEvent('user:invalidate', { detail: { id: userId } }));

    return freshUser;
  }

  notifyUserUpdate(user: User): void {
    window.dispatchEvent(new CustomEvent('user:updated', { detail: user }));
  }

  /** Aucune route du contrat ne crée de compte admin/manager (généré côté Lovable Cloud). */
  async createAdminOrManager(_data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: 'admin' | 'manager';
    createdBy: string;
    loginUrl?: string;
  }): Promise<{ userId: string; tempPassword: string; email: string }> {
    throw new Error('createAdminOrManager: non supporté en mode Spring');
  }

  /** Le contrôle qualité de photo s'appuie sur des colonnes non exposées par le contrat. */
  async updatePhotoQuality(_userId: string, _ok: boolean, _issues: string[]): Promise<void> {
    throw new Error('updatePhotoQuality: non supporté en mode Spring');
  }
}
