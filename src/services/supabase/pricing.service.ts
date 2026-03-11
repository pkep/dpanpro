import { supabase } from '@/integrations/supabase/client';

export interface PriorityMultiplier {
  id: string;
  priority: string;
  multiplier: number;
  label: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface DbPriorityMultiplier {
  id: string;
  priority: string;
  multiplier: number;
  label: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

class PricingService {
  async getPriorityMultipliers(): Promise<PriorityMultiplier[]> {
    const { data, error } = await supabase
      .from('priority_multipliers')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return ((data || []) as unknown as DbPriorityMultiplier[]).map(this.mapToMultiplier);
  }

  async updateMultiplier(id: string, multiplier: number): Promise<void> {
    const { error } = await supabase
      .from('priority_multipliers')
      .update({ multiplier } as Record<string, unknown>)
      .eq('id', id);

    if (error) throw error;
  }

  async getMultiplierByPriority(priority: string): Promise<number> {
    const { data, error } = await supabase
      .from('priority_multipliers')
      .select('multiplier')
      .eq('priority', priority)
      .maybeSingle();

    if (error) throw error;
    return (data as { multiplier: number } | null)?.multiplier || 1.0;
  }

  calculateEstimatedPrice(basePrice: number, multiplier: number): number {
    return Math.round(basePrice * multiplier * 100) / 100;
  }

  private mapToMultiplier(data: DbPriorityMultiplier): PriorityMultiplier {
    return {
      id: data.id,
      priority: data.priority,
      multiplier: data.multiplier,
      label: data.label,
      displayOrder: data.display_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const pricingService = new PricingService();
