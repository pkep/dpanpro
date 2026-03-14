export type AppRole = 'admin' | 'manager' | 'technician' | 'client' | 'guest' | 'payment';

export interface UserRoleRecord {
  id: string;
  userId: string;
  role: AppRole;
  createdAt: string;
  createdBy: string | null;
}

export interface ManagerPermissions {
  id: string;
  userId: string;
  canCreateManagers: boolean;
  createdAt: string;
  updatedAt: string;
  grantedBy: string | null;
}

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
