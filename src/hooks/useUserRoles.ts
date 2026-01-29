import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { rolesService, type AppRole, type UserRoleRecord, type ManagerPermissions } from '@/services/roles/roles.service';

export function useUserRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRoleRecord[]>([]);
  const [permissions, setPermissions] = useState<ManagerPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    if (!user) {
      setRoles([]);
      setPermissions(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const [userRoles, managerPerms] = await Promise.all([
        rolesService.getUserRoles(user.id),
        rolesService.getManagerPermissions(user.id),
      ]);
      
      setRoles(userRoles);
      setPermissions(managerPerms);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError('Erreur lors du chargement des rôles');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const hasRole = useCallback((role: AppRole): boolean => {
    return roles.some(r => r.role === role);
  }, [roles]);

  const isAdmin = useCallback((): boolean => {
    return hasRole('admin');
  }, [hasRole]);

  const isManager = useCallback((): boolean => {
    return hasRole('manager');
  }, [hasRole]);

  const isAdminOrManager = useCallback((): boolean => {
    return isAdmin() || isManager();
  }, [isAdmin, isManager]);

  const canCreateManagers = useCallback((): boolean => {
    if (isAdmin()) return true;
    return permissions?.canCreateManagers || false;
  }, [isAdmin, permissions]);

  return {
    roles,
    permissions,
    isLoading,
    error,
    hasRole,
    isAdmin,
    isManager,
    isAdminOrManager,
    canCreateManagers,
    refetch: fetchRoles,
  };
}
