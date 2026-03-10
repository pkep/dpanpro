import type { IServicesService } from '@/services/interfaces/services.interface';
import type { Service } from '@/services/services/services.service';
import { springHttp } from './http-client';

export class SpringServicesService implements IServicesService {
  async getActiveServices(): Promise<Service[]> { return springHttp.get('/services/active'); }
  async getAllServices(): Promise<Service[]> { return springHttp.get('/services'); }
  async toggleServiceActive(id: string, isActive: boolean): Promise<void> { await springHttp.patch(`/services/${id}/active`, { isActive }); }
  async updateService(id: string, updates: Partial<Service>): Promise<void> { await springHttp.patch(`/services/${id}`, updates); }
  async swapServiceOrder(id1: string, order1: number, id2: string, order2: number): Promise<void> {
    await springHttp.post('/services/swap-order', { serviceId1: id1, order1, serviceId2: id2, order2 });
  }
}
