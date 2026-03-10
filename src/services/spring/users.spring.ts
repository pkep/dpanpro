import type { IUsersService } from '@/services/interfaces/users.interface';
import type { User, UserRole } from '@/types/auth.types';
import { springHttp } from './http-client';

export class SpringUsersService implements IUsersService {
  async getUsers(filters?: { role?: UserRole; isActive?: boolean }): Promise<User[]> {
    const params: Record<string, string> = {};
    if (filters?.role) params.role = filters.role;
    if (filters?.isActive !== undefined) params.isActive = String(filters.isActive);
    return springHttp.get<User[]>('/users', params);
  }
  async getUser(id: string): Promise<User | null> {
    return springHttp.get<User | null>(`/users/${id}`);
  }
  async getTechnicians(): Promise<User[]> {
    return this.getUsers({ role: 'technician', isActive: true });
  }
  async updateRole(id: string, role: UserRole): Promise<void> {
    await springHttp.patch(`/users/${id}/role`, { role });
  }
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await springHttp.patch(`/users/${id}/active`, { isActive });
  }
  async updateUser(id: string, updates: { firstName?: string; lastName?: string; phone?: string }): Promise<void> {
    await springHttp.patch(`/users/${id}`, updates);
  }
}
