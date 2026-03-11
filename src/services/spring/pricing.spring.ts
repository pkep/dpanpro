import type { IPricingService } from '@/services/interfaces/pricing.interface';
import type { PriorityMultiplier } from '@/services/supabase/pricing.service';
import { springHttp } from './http-client';

export class SpringPricingService implements IPricingService {
  // GET /pricing/priority-multipliers
  async getPriorityMultipliers(): Promise<PriorityMultiplier[]> {
    return springHttp.get('/pricing/priority-multipliers');
  }

  // PATCH /pricing/priority-multipliers/{id}
  async updateMultiplier(id: string, multiplier: number): Promise<void> {
    await springHttp.patch(`/pricing/priority-multipliers/${id}`, { multiplier });
  }

  async getMultiplierByPriority(priority: string): Promise<number> {
    const all = await this.getPriorityMultipliers();
    const found = all.find((m: any) => m.priority === priority);
    return found?.multiplier ?? 1;
  }

  calculateEstimatedPrice(basePrice: number, multiplier: number): number {
    return Math.round(basePrice * multiplier * 100) / 100;
  }
}
