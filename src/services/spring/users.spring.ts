import type { IUsersService } from '@/services/interfaces/users.interface';
import type { User, UserRole } from '@/types/auth.types';
import { springHttp } from './http-client';

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
}
