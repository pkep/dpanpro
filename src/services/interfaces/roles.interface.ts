import type { UserRoleRecord, ManagerPermissions, AppRole } from '@/services/roles/roles.service';

export interface IRolesService {
  getUserRoles(userId: string): Promise<UserRoleRecord[]>;
  hasRole(userId: string, role: AppRole): Promise<boolean>;
  isAdminOrManager(userId: string): Promise<boolean>;
  addRole(userId: string, role: AppRole, createdBy?: string): Promise<void>;
  removeRole(userId: string, role: AppRole): Promise<void>;
  getManagerPermissions(userId: string): Promise<ManagerPermissions | null>;
  updateManagerPermissions(userId: string, canCreateManagers: boolean, grantedBy: string): Promise<void>;
  canCreateManagers(userId: string): Promise<boolean>;
}
