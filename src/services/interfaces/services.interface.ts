import type { Service } from '@/services/services/services.service';

export interface IServicesService {
  getActiveServices(): Promise<Service[]>;
  getAllServices(): Promise<Service[]>;
  toggleServiceActive(id: string, isActive: boolean): Promise<void>;
  updateService(id: string, updates: Partial<Service>): Promise<void>;
  swapServiceOrder(serviceId1: string, order1: number, serviceId2: string, order2: number): Promise<void>;
}
