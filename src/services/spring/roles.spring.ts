import type { IRolesService } from '@/services/interfaces/roles.interface';
import type { UserRoleRecord, ManagerPermissions, AppRole } from '@/services/roles/roles.service';
import { springHttp } from './http-client';

export class SpringRolesService implements IRolesService {
  // GET /users/{id}/roles
  async getUserRoles(userId: string): Promise<UserRoleRecord[]> {
    return springHttp.get(`/users/${userId}/roles`);
  }

  async hasRole(userId: string, role: AppRole): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some(r => r.role === role);
  }

  async isAdminOrManager(userId: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some(r => r.role === 'admin' || r.role === 'manager');
  }

  // POST /users/{id}/roles
  async addRole(userId: string, role: AppRole, _createdBy?: string): Promise<void> {
    await springHttp.post(`/users/${userId}/roles`, { role });
  }

  // DELETE /users/{id}/roles/{role}
  async removeRole(userId: string, role: AppRole): Promise<void> {
    await springHttp.delete(`/users/${userId}/roles/${role}`);
  }

  // GET /users/{id}/permissions
  async getManagerPermissions(userId: string): Promise<ManagerPermissions | null> {
    return springHttp.get(`/users/${userId}/permissions`);
  }

  // PATCH /users/{id}/permissions
  async updateManagerPermissions(userId: string, canCreateManagers: boolean, _grantedBy: string): Promise<void> {
    await springHttp.patch(`/users/${userId}/permissions`, { canCreateManagers });
  }

  async canCreateManagers(userId: string): Promise<boolean> {
    const perms = await this.getManagerPermissions(userId);
    return (perms as any)?.canCreateManagers ?? (perms as any)?.can_create_managers ?? false;
  }
}
