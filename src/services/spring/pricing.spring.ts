import type { IPricingService } from '@/services/interfaces/pricing.interface';
import type { PriorityMultiplier } from '@/services/pricing/pricing.service';
import { springHttp } from './http-client';

export class SpringPricingService implements IPricingService {
  async getPriorityMultipliers(): Promise<PriorityMultiplier[]> { return springHttp.get('/pricing/multipliers'); }
  async updateMultiplier(id: string, multiplier: number): Promise<void> {
    await springHttp.patch(`/pricing/multipliers/${id}`, { multiplier });
  }
  async getMultiplierByPriority(priority: string): Promise<number> {
    const r = await springHttp.get<{ multiplier: number }>(`/pricing/multipliers/by-priority/${priority}`);
    return r.multiplier;
  }
  calculateEstimatedPrice(basePrice: number, multiplier: number): number {
    return Math.round(basePrice * multiplier * 100) / 100;
  }
}
