import { supabase } from '@/integrations/supabase/client';
import type { User, UserRole } from '@/types/auth.types';
import type { DbUser } from '@/types/database.types';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { IUsersService } from "@/services/interfaces";
import {
  computeMissingProfileFields,
  isProfileComplete,
  type IncompleteTechnicianProfile,
} from '@/lib/technicianProfileCompleteness';

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


interface PartnerApplicationRow {
  user_id: string | null;
  skills: string[] | null;
  company_name: string | null;
  years_experience: number | null;
  zone: unknown;
  validated_at: string | null;
  bank_account_holder: string | null;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
}

function toZones(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('{')) {
      return trimmed.slice(1, -1).split(',').map((v: string) => v.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [];
}

class UsersService implements IUsersService {
  async searchTechniciansEnriched(
    query?: string,
    pagination?: { page: number; limit: number },
    filters?: {
      skill?: string;
      sortBy?: 'firstNameAsc' | 'firstNameDesc';
      isActive?: boolean;
      /** partner_applications.status — 'approved' for the "Actifs" tab (excludes 'qualification' accounts which are is_active=true). */
      applicationStatus?: string;
    }
  ): Promise<{
    technicians: Array<User & { skills?: string[]; rating?: number; completed?: number }>;
    total: number;
  }> {
    const limit = pagination?.limit || 15;
    const page = pagination?.page || 1;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const isActive = filters?.isActive !== undefined ? filters.isActive : true;

    // Pre-filter on partner_applications (skill and/or application status) → user ids
    let skillUserIdFilter: string[] | null = null;
    const hasSkill = !!(filters?.skill && filters.skill.trim());
    const hasStatus = !!(filters?.applicationStatus && filters.applicationStatus.trim());
    if (hasSkill || hasStatus) {
      let appQuery = (supabase as any).from('partner_applications').select('user_id');
      if (hasSkill) appQuery = appQuery.contains('skills', [filters!.skill!.trim()]);
      if (hasStatus) appQuery = appQuery.eq('status', filters!.applicationStatus!.trim());
      const { data: skillApps, error: skillError } = await appQuery;

      if (skillError) throw skillError;
      skillUserIdFilter = ((skillApps ?? []) as Array<{ user_id: string }>).map(a => a.user_id).filter(Boolean);

      // No technician matches -> return empty result
      if (skillUserIdFilter.length === 0) {
        return { technicians: [], total: 0 };
      }
    }

    // Get technicians with count
    let userQuery = supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, is_active, created_at, role, avatar_url, password_hash', { count: 'exact' })
      .eq('role', 'technician')
      .eq('is_active', isActive);

    if (filters?.sortBy === 'firstNameDesc') {
      userQuery = userQuery.order('first_name', { ascending: false });
    } else {
      userQuery = userQuery.order('first_name', { ascending: true });
    }

    if (query) {
      userQuery = userQuery.or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%`
      );
    }

    if (skillUserIdFilter && skillUserIdFilter.length > 0) {
      userQuery = userQuery.in('id', skillUserIdFilter);
    }

    const { data: users, count, error: usersError } = await userQuery.range(from, to);
    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      return { technicians: [], total: count || 0 };
    }

    const userIds = users.map(u => u.id);

    // Get skills, company and experience from partner_applications
    const { data: apps, error: appsError } = await supabase
      .from('partner_applications')
      .select('user_id, skills, company_name, years_experience, zone, validated_at, bank_account_holder, bank_name, iban, bic')
      .in('user_id', userIds);
    if (appsError) throw appsError;

    // Get stats from partner_statistics
    const { data: stats, error: statsError } = await supabase
      .from('partner_statistics')
      .select('partner_id, average_rating, completed_interventions')
      .in('partner_id', userIds);
    if (statsError) throw statsError;

    // Map skills by user_id
    const skillsMap = new Map<string, string[]>();
    const companyMap = new Map<string, string>();
    const experienceMap = new Map<string, number>();
    const zoneMap = new Map<string, string[]>();
    const validatedAtMap = new Map<string, string>();
    const bankMap = new Map<string, { bank_account_holder: string | null; bank_name: string | null; iban: string | null; bic: string | null }>();
    // Generated Supabase types are behind the schema (no `zone` column) → type the rows explicitly.
    const appRows = (apps ?? []) as unknown as PartnerApplicationRow[];
    appRows.forEach(app => {
      if (app.user_id) {
        skillsMap.set(app.user_id, app.skills || []);
        companyMap.set(app.user_id, app.company_name || '');
        experienceMap.set(app.user_id, app.years_experience || 0);
        zoneMap.set(app.user_id, toZones(app.zone));
        validatedAtMap.set(app.user_id, app.validated_at || '');
        bankMap.set(app.user_id, {
          bank_account_holder: app.bank_account_holder,
          bank_name: app.bank_name,
          iban: app.iban,
          bic: app.bic,
        });
      }
    });

    // Map stats by partner_id
    const statsMap = new Map<string, { rating: number | null; completed: number }>();
    stats?.forEach(stat => {
      if (stat.partner_id) {
        statsMap.set(stat.partner_id, {
          rating: stat.average_rating ? Number(stat.average_rating) : null,
          completed: stat.completed_interventions || 0,
        });
      }
    });

    // Enrich technicians with skills and stats
    const enrichedTechnicians = (users as unknown as DbUser[]).map(user => {
      const mappedUser = this.mapToUser(user);
      return {
        ...mappedUser,
        skills: skillsMap.get(user.id),
        rating: statsMap.get(user.id)?.rating,
        completed: statsMap.get(user.id)?.completed,
        companyName: companyMap.get(user.id) || mappedUser.companyName || null,
        yearsExperience: experienceMap.get(user.id) ?? null,
        zones: zoneMap.get(user.id) || null,
        validatedAt: validatedAtMap.get(user.id) || null,
        missingProfileFields: computeMissingProfileFields({
          firstName: user.first_name,
          lastName: user.last_name,
          avatarUrl: user.avatar_url,
          passwordHash: user.password_hash,
          hasApplication: bankMap.has(user.id),
          // explicit snake_case → camelCase mapping (spreading the row left bankAccountHolder/bankName undefined)
          bankAccountHolder: bankMap.get(user.id)?.bank_account_holder,
          bankName: bankMap.get(user.id)?.bank_name,
          iban: bankMap.get(user.id)?.iban,
          bic: bankMap.get(user.id)?.bic,
        }),
      };
    });

    return {
      technicians: enrichedTechnicians,
      total: count || 0,
    };
  }

  /** Same rule as gateway TechnicianProfileCompleteness, computed client-side over active technicians. */
  async getIncompleteTechnicianProfiles(): Promise<IncompleteTechnicianProfile[]> {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, avatar_url, password_hash')
      .eq('role', 'technician')
      .eq('is_active', true);
    if (usersError) throw usersError;
    if (!users || users.length === 0) return [];

    const { data: apps, error: appsError } = await (supabase as any)
      .from('partner_applications')
      .select('user_id, bank_account_holder, bank_name, iban, bic, status')
      .in('user_id', users.map(u => u.id));
    if (appsError) throw appsError;
    const appRows = (apps ?? []) as Array<{ user_id: string; bank_account_holder: string | null; bank_name: string | null; iban: string | null; bic: string | null; status?: string }>;
    const bankByUser = new Map(appRows.filter(a => a.user_id).map(a => [a.user_id, a]));

    return users
      // "Actifs" tab: only validated technicians — 'qualification' accounts have their own tab
      .filter(u => bankByUser.get(u.id)?.status === 'approved')
      .map(u => {
        const bank = bankByUser.get(u.id);
        return {
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          email: u.email,
          avatarUrl: u.avatar_url,
          missingFields: computeMissingProfileFields({
            firstName: u.first_name,
            lastName: u.last_name,
            avatarUrl: u.avatar_url,
            passwordHash: u.password_hash,
            hasApplication: Boolean(bank),
            bankAccountHolder: bank?.bank_account_holder,
            bankName: bank?.bank_name,
            iban: bank?.iban,
            bic: bank?.bic,
          }),
        };
      })
      .filter(p => !isProfileComplete(p.missingFields))
      .sort((a, b) =>
        (a.lastName ?? '').localeCompare(b.lastName ?? '', 'fr', { sensitivity: 'base' }) ||
        (a.firstName ?? '').localeCompare(b.firstName ?? '', 'fr', { sensitivity: 'base' }));
  }

  getTechnicianPosition(technicianId: string): Promise<{ latitude: number; longitude: number; address: string; city: string; } | null> {
      throw new Error("Method not implemented.");
  }
  getTechnicianAvatar(technicianId: string): Promise<string | null> {
      throw new Error("Method not implemented.");
  }
  async getUsers(filters?: {
    role?: UserRole;
    isActive?: boolean;
  }): Promise<User[]> {
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;

    if (error) throw error;

    return ((data || []) as unknown as DbUser[]).map(this.mapToUser);
  }

  async getUsersByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, role, is_active, avatar_url, company_logo_url, company_name, company_address, siren, vat_number, must_change_password, photo_quality_ok, photo_quality_checked_at, photo_quality_issues, created_at, updated_at')
      .in('id', ids);
    if (error) throw error;
    return ((data || []) as unknown as DbUser[]).map(this.mapToUser.bind(this));
  }

  async getUser(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapToUser(data as unknown as DbUser);
  }

  async getTechnicians(): Promise<User[]> {
    return this.getUsers({ role: 'technician', isActive: true });
  }

  async updateRole(id: string, role: UserRole): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ role } as TablesUpdate<'users'>)
      .eq('id', id);

    if (error) throw error;
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ is_active: isActive } as TablesUpdate<'users'>)
      .eq('id', id);

    if (error) throw error;
  }

  async updateUser(id: string, updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    companyLogoUrl?: string | null;
    vatNumber?: string | null;
  }): Promise<void> {
    const dbUpdates: TablesUpdate<'users'> = {};
    
    if (updates.firstName !== undefined) {
      dbUpdates.first_name = updates.firstName;
    }
    if (updates.lastName !== undefined) {
      dbUpdates.last_name = updates.lastName;
    }
    if (updates.email !== undefined) {
      dbUpdates.email = updates.email;
    }
    if (updates.phone !== undefined) {
      dbUpdates.phone = updates.phone;
    }
    if (updates.avatarUrl !== undefined) {
      dbUpdates.avatar_url = updates.avatarUrl;
    }
    if (updates.companyLogoUrl !== undefined) {
      dbUpdates.company_logo_url = updates.companyLogoUrl;
    }
    if (updates.vatNumber !== undefined) {
      dbUpdates.vat_number = updates.vatNumber;
    }

    const { error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
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

    // Fetch updated user to get all fields
    const freshUser = await this.getUser(userId);
    if (!freshUser) {
      throw new Error('Failed to fetch updated user');
    }

    // 2. Notify all listeners (context, localStorage, other tabs)
    if (isCurrentSessionUser(userId)) {
      this.notifyUserUpdate(freshUser);
    }

    // 3. Signal any session for this user (e.g. the technician's own tab on the
    //    same browser) to re-fetch their session — without replacing the caller's.
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
   * Creates a new admin/manager user via edge function
   * Returns userId, tempPassword, and email
   */
  async createAdminOrManager(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: 'admin' | 'manager';
    createdBy: string;
    loginUrl: string;
  }): Promise<{ userId: string; tempPassword: string; email: string }> {
    // Call edge function to create admin/manager with secure password generation
    const { data: result, error } = await supabase.functions.invoke('create-admin-user', {
      body: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        createdBy: data.createdBy,
        loginUrl: data.loginUrl,
      },
    });

    if (error) throw error;
    if (!result) throw new Error('Failed to create admin/manager');

    return {
      userId: result.userId,
      tempPassword: result.tempPassword,
      email: data.email,
    };
  }

  private mapToUser(data: DbUser): User {
    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
      role: data.role as UserRole,
      isActive: data.is_active,
      isCompany: data.is_company,
      companyName: data.company_name,
      companyAddress: data.company_address,
      siren: data.siren,
      vatNumber: data.vat_number,
      avatarUrl: data.avatar_url,
      companyLogoUrl: data.company_logo_url,
      photoQualityOk: (data as any).photo_quality_ok ?? null,
      photoQualityCheckedAt: (data as any).photo_quality_checked_at ?? null,
      photoQualityIssues: (data as any).photo_quality_issues ?? null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updatePhotoQuality(userId: string, ok: boolean, issues: string[]): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        photo_quality_ok: ok,
        photo_quality_checked_at: new Date().toISOString(),
        photo_quality_issues: ok ? [] : issues,
      } as any)
      .eq('id', userId);
    if (error) throw error;
  }
}

export const usersService = new UsersService();
