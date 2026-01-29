import { supabase } from '@/integrations/supabase/client';
import type { User, UserRole } from '@/types/auth.types';
import type { DbUser } from '@/types/database.types';
import type { TablesUpdate } from '@/integrations/supabase/types';

class UsersService {
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
    phone?: string;
  }): Promise<void> {
    const dbUpdates: TablesUpdate<'users'> = {};
    
    if (updates.firstName !== undefined) {
      dbUpdates.first_name = updates.firstName;
    }
    if (updates.lastName !== undefined) {
      dbUpdates.last_name = updates.lastName;
    }
    if (updates.phone !== undefined) {
      dbUpdates.phone = updates.phone;
    }

    const { error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
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
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const usersService = new UsersService();
