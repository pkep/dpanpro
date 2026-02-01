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
  basePrice: number;
  defaultPriority: string;
  displacementPrice: number;
  securityPrice: number;
  repairPrice: number;
  vatRateIndividual: number;
  vatRateProfessional: number;
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
  base_price: number;
  default_priority: string;
  displacement_price: number;
  security_price: number;
  repair_price: number;
  vat_rate_individual: number;
  vat_rate_professional: number;
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

  async updateService(id: string, updates: Partial<Service>): Promise<void> {
    const dbUpdates: Record<string, unknown> = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.displacementPrice !== undefined) dbUpdates.displacement_price = updates.displacementPrice;
    if (updates.securityPrice !== undefined) dbUpdates.security_price = updates.securityPrice;
    if (updates.repairPrice !== undefined) dbUpdates.repair_price = updates.repairPrice;
    if (updates.vatRateIndividual !== undefined) dbUpdates.vat_rate_individual = updates.vatRateIndividual;
    if (updates.vatRateProfessional !== undefined) dbUpdates.vat_rate_professional = updates.vatRateProfessional;
    if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
    
    // Recalculate base_price as sum of components
    if (updates.displacementPrice !== undefined || updates.securityPrice !== undefined || updates.repairPrice !== undefined) {
      const displacement = updates.displacementPrice ?? 0;
      const security = updates.securityPrice ?? 0;
      const repair = updates.repairPrice ?? 0;
      dbUpdates.base_price = displacement + security + repair;
    }

    const { error } = await supabase
      .from('services')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  }

  async swapServiceOrder(serviceId1: string, order1: number, serviceId2: string, order2: number): Promise<void> {
    // Update both services' display_order
    const { error: error1 } = await supabase
      .from('services')
      .update({ display_order: order2 } as Record<string, unknown>)
      .eq('id', serviceId1);

    if (error1) throw error1;

    const { error: error2 } = await supabase
      .from('services')
      .update({ display_order: order1 } as Record<string, unknown>)
      .eq('id', serviceId2);

    if (error2) throw error2;
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
      basePrice: data.base_price,
      defaultPriority: data.default_priority,
      displacementPrice: data.displacement_price,
      securityPrice: data.security_price,
      repairPrice: data.repair_price,
      vatRateIndividual: data.vat_rate_individual,
      vatRateProfessional: data.vat_rate_professional,
    };
  }
}

export const servicesService = new ServicesService();
