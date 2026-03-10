import type { User, UserRole } from '@/types/auth.types';

export interface IUsersService {
  getUsers(filters?: { role?: UserRole; isActive?: boolean }): Promise<User[]>;
  getUser(id: string): Promise<User | null>;
  getTechnicians(): Promise<User[]>;
  updateRole(id: string, role: UserRole): Promise<void>;
  toggleActive(id: string, isActive: boolean): Promise<void>;
  updateUser(id: string, updates: { firstName?: string; lastName?: string; phone?: string }): Promise<void>;
}
