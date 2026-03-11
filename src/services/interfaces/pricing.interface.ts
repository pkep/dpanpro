import type { PriorityMultiplier } from '@/services/supabase/pricing.service';

export interface IPricingService {
  getPriorityMultipliers(): Promise<PriorityMultiplier[]>;
  updateMultiplier(id: string, multiplier: number): Promise<void>;
  getMultiplierByPriority(priority: string): Promise<number>;
  calculateEstimatedPrice(basePrice: number, multiplier: number): number;
}
