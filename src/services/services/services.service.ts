import { supabase } from '@/integrations/supabase/client';

export interface Service {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface DbService {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

class ServicesService {
  async getActiveServices(): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return ((data || []) as unknown as DbService[]).map(this.mapToService);
  }

  async getAllServices(): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return ((data || []) as unknown as DbService[]).map(this.mapToService);
  }

  async toggleServiceActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('services')
      .update({ is_active: isActive } as Record<string, unknown>)
      .eq('id', id);

    if (error) throw error;
  }

  private mapToService(data: DbService): Service {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      icon: data.icon,
      isActive: data.is_active,
      displayOrder: data.display_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const servicesService = new ServicesService();
