import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/types/auth.types';

export type AppRole = 'admin' | 'manager' | 'technician' | 'client' | 'guest';

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

interface DbUserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  created_by: string | null;
}

interface DbManagerPermissions {
  id: string;
  user_id: string;
  can_create_managers: boolean;
  created_at: string;
  updated_at: string;
  granted_by: string | null;
}

class RolesService {
  async getUserRoles(userId: string): Promise<UserRoleRecord[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return ((data || []) as unknown as DbUserRole[]).map(this.mapToUserRole);
  }

  async hasRole(userId: string, role: AppRole): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }

  async isAdminOrManager(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .in('role', ['admin', 'manager'])
      .limit(1);

    if (error) throw error;
    return (data || []).length > 0;
  }

  async addRole(userId: string, role: AppRole, createdBy?: string): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role,
        created_by: createdBy || null,
      });

    if (error) throw error;
  }

  async removeRole(userId: string, role: AppRole): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) throw error;
  }

  async getManagerPermissions(userId: string): Promise<ManagerPermissions | null> {
    const { data, error } = await supabase
      .from('manager_permissions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapToManagerPermissions(data as unknown as DbManagerPermissions);
  }

  async updateManagerPermissions(
    userId: string, 
    canCreateManagers: boolean, 
    grantedBy: string
  ): Promise<void> {
    const { error } = await supabase
      .from('manager_permissions')
      .upsert({
        user_id: userId,
        can_create_managers: canCreateManagers,
        granted_by: grantedBy,
      }, { onConflict: 'user_id' });

    if (error) throw error;
  }

  async canCreateManagers(userId: string): Promise<boolean> {
    // Admins can always create managers
    const isAdmin = await this.hasRole(userId, 'admin');
    if (isAdmin) return true;

    // Check if manager has permission
    const permissions = await this.getManagerPermissions(userId);
    return permissions?.canCreateManagers || false;
  }

  private mapToUserRole(data: DbUserRole): UserRoleRecord {
    return {
      id: data.id,
      userId: data.user_id,
      role: data.role as AppRole,
      createdAt: data.created_at,
      createdBy: data.created_by,
    };
  }

  private mapToManagerPermissions(data: DbManagerPermissions): ManagerPermissions {
    return {
      id: data.id,
      userId: data.user_id,
      canCreateManagers: data.can_create_managers,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      grantedBy: data.granted_by,
    };
  }
}

export const rolesService = new RolesService();
