export interface PriorityMultiplier {
  id: string;
  priority: string;
  multiplier: number;
  label: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface IPricingService {
  getPriorityMultipliers(): Promise<PriorityMultiplier[]>;
  updateMultiplier(id: string, multiplier: number): Promise<void>;
  getMultiplierByPriority(priority: string): Promise<number>;
  calculateEstimatedPrice(basePrice: number, multiplier: number): number;
}
