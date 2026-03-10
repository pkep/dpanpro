import type { IRolesService } from '@/services/interfaces/roles.interface';
import type { UserRoleRecord, ManagerPermissions, AppRole } from '@/services/roles/roles.service';
import { springHttp } from './http-client';

export class SpringRolesService implements IRolesService {
  async getUserRoles(userId: string): Promise<UserRoleRecord[]> { return springHttp.get(`/roles/${userId}`); }
  async hasRole(userId: string, role: AppRole): Promise<boolean> {
    const r = await springHttp.get<{ hasRole: boolean }>(`/roles/${userId}/has/${role}`);
    return r.hasRole;
  }
  async isAdminOrManager(userId: string): Promise<boolean> {
    const r = await springHttp.get<{ result: boolean }>(`/roles/${userId}/is-admin-or-manager`);
    return r.result;
  }
  async addRole(userId: string, role: AppRole, createdBy?: string): Promise<void> {
    await springHttp.post(`/roles/${userId}`, { role, createdBy });
  }
  async removeRole(userId: string, role: AppRole): Promise<void> {
    await springHttp.delete(`/roles/${userId}/${role}`);
  }
  async getManagerPermissions(userId: string): Promise<ManagerPermissions | null> {
    return springHttp.get(`/roles/${userId}/manager-permissions`);
  }
  async updateManagerPermissions(userId: string, canCreateManagers: boolean, grantedBy: string): Promise<void> {
    await springHttp.put(`/roles/${userId}/manager-permissions`, { canCreateManagers, grantedBy });
  }
  async canCreateManagers(userId: string): Promise<boolean> {
    const r = await springHttp.get<{ result: boolean }>(`/roles/${userId}/can-create-managers`);
    return r.result;
  }
}
