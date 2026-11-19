import type { IUsersService, StaffUser, StaffUserFilters } from '@/services/interfaces/users.interface';
import type { User, UserRole } from '@/types/auth.types';
import type { IncompleteTechnicianProfile } from '@/lib/technicianProfileCompleteness';
import { normalizeZones } from '@/lib/zones';
import { springHttp } from './http-client';

/** True when `userId` is the user currently logged in (persisted by useAuth in localStorage). */
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


export class SpringUsersService implements IUsersService {
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
      companyCity?: string | null;
      companyPostalCode?: string | null;
      lastLoginAt?: string | null;
      zones?: string[] | null;
      validatedAt?: string | null;
      missingProfileFields?: string[] | null;
    }>;
    total: number;
  }> {
    const limit = pagination?.limit || 15;
    const page = (pagination?.page || 1) - 1; // Spring uses 0-based pages

    const params: Record<string, string> = {
      role: 'technician',
      isActive: filters?.isActive !== undefined ? String(filters.isActive) : 'true',
      page: String(page),
      size: String(limit),
    };

    if (query) {
      params.search = query;
    }
    if (filters?.skill?.trim()) {
      params.skill = filters.skill.trim();
    }
    if (filters?.sortBy) {
      params.sortBy = filters.sortBy;
    }
    if (filters?.applicationStatus?.trim()) {
      params.applicationStatus = filters.applicationStatus.trim();
    }

    const response = await springHttp.get<{
      content: Array<User & {
        skills?: string[];
        rating?: number;
        completed?: number;
        companyName?: string | null;
        yearsExperience?: number | null;
        companyCity?: string | null;
        companyPostalCode?: string | null;
        lastLoginAt?: string | null;
        zone?: string[] | null;
        validatedAt?: string | null;
        missingProfileFields?: string[] | null;
      }>;
      totalElements: number;
    }>('/users', params);

    return {
      technicians: response.content.map((t) => ({ ...t, zones: normalizeZones(t.zone) })),
      total: response.totalElements,
    };
  }

  // GET /users/technicians/incomplete-profiles
  async getIncompleteTechnicianProfiles(): Promise<IncompleteTechnicianProfile[]> {
    return springHttp.get<IncompleteTechnicianProfile[]>('/users/technicians/incomplete-profiles');
  }

  // GET /technicians/{technicianId}/position
  async getTechnicianPosition(technicianId: string): Promise<{ latitude: number; longitude: number; address: string; city: string } | null> {
    try {
      return await springHttp.get<{ latitude: number; longitude: number; address: string; city: string }>(`/technicians/${technicianId}/position`);
    } catch {
      return null;
    }
  }

  // GET /technicians/{technicianId}/avatar
  async getTechnicianAvatar(technicianId: string): Promise<string | null> {
    try {
      const response = await springHttp.get<{ avatarUrl: string }>(`/technicians/${technicianId}/avatar`);
      return response?.avatarUrl || null;
    } catch {
      return null;
    }
  }
  // GET /users/staff?search=&role=&from=&to=
  getStaffUsers(filters?: StaffUserFilters): Promise<StaffUser[]> {
    const params: Record<string, string> = {};
    if (filters?.search) params.search = filters.search;
    if (filters?.role) params.role = filters.role;
    if (filters?.from) params.from = filters.from.slice(0, 10);
    if (filters?.to) params.to = filters.to.slice(0, 10);
    return springHttp.get<StaffUser[]>('/users/staff', Object.keys(params).length ? params : undefined);
  }

  deleteUser(id: string): Promise<void> {
    return springHttp.delete(`/users/${id}`);
  }

  sendFirstConnectionEmail(id: string): Promise<{ email: string }> {
    return springHttp.post<{ email: string }>(`/users/${id}/first-connection`);
  }

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
  async getUsersByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return springHttp.post<User[]>('/users/batch', { userIds: ids });
  }

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
  async updateUser(id: string, updates: { firstName?: string; lastName?: string; email?: string; phone?: string, avatarUrl?: string; companyLogoUrl?: string | null; }): Promise<void> {
    await springHttp.patch(`/users/${id}`, updates);
  }

  /**
   * ✨ UPDATE USER WITH AUTOMATIC SYNC
   *
   * Combines database update + context notification in one call
   * Returns the updated user for immediate UI use
   *
   * SAFETY: the 'user:updated' broadcast replaces the logged-in session
   * (useAuth + localStorage + other tabs). It is therefore only emitted when
   * `userId` is the CURRENT user. Editing someone else (e.g. admin editing a
   * technician) updates the DB but never touches the caller's session.
   */
  async updateUserAndSync(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatarUrl?: string;
      companyLogoUrl?: string | null;
    }
  ): Promise<User> {
    // 1. Update in database
    await this.updateUser(userId, updates);

    // 2. Fetch updated user to get all fields
    const freshUser = await this.getUser(userId);
    if (!freshUser) {
      throw new Error('Failed to fetch updated user');
    }

    // 3. Notify all listeners (context, localStorage, other tabs)
    if (isCurrentSessionUser(userId)) {
      this.notifyUserUpdate(freshUser);
    }

    // Signal any session for this user (e.g. the technician's own tab on the
    // same browser) to re-fetch their session — without replacing the caller's.
    window.dispatchEvent(new CustomEvent('user:invalidate', { detail: { id: userId } }));

    // 4. Return for immediate component use
    return freshUser;
  }

  /**
   * ✨ BROADCAST USER UPDATE
   *
   * Dispatches event that triggers:
   * - useAuth() context update
   * - localStorage sync
   * - BroadcastChannel to other tabs
   */
  notifyUserUpdate(user: User): void {
    window.dispatchEvent(
      new CustomEvent('user:updated', {
        detail: user,
      })
    );
  }

  /**
   * ✨ CREATE ADMIN OR MANAGER
   *
   * Creates a new admin/manager user via REST API
   * Returns userId, tempPassword, and email
   */
  async createAdminOrManager(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: 'admin' | 'manager';
    createdBy: string;
    loginUrl?: string;
  }): Promise<{ userId: string; tempPassword: string; email: string }> {
    // POST /users/admin-manager
    const result = await springHttp.post<{ userId: string; tempPassword: string; email: string }>(
      '/users/admin-manager',
      {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        createdBy: data.createdBy,
      }
    );

    return result;
  }
  async updatePhotoQuality(userId: string, ok: boolean, issues: string[]): Promise<void> {
    await springHttp.patch(`/users/${userId}/photo-quality`, { ok, issues });
  }

}
