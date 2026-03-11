import type { IServicesService } from '@/services/interfaces/services.interface';
import type { Service } from '@/services/supabase/services.service';
import { springHttp } from './http-client';

export class SpringServicesService implements IServicesService {
  // GET /services?activeOnly=true
  async getActiveServices(): Promise<Service[]> {
    return springHttp.get('/services', { activeOnly: 'true' });
  }

  // GET /services
  async getAllServices(): Promise<Service[]> {
    return springHttp.get('/services');
  }

  // PATCH /services/{id}/active
  async toggleServiceActive(id: string, isActive: boolean): Promise<void> {
    await springHttp.patch(`/services/${id}/active`, { active: isActive });
  }

  // PATCH /services/{id}
  async updateService(id: string, updates: Partial<Service>): Promise<void> {
    await springHttp.patch(`/services/${id}`, updates);
  }

  // PUT /services/order
  async swapServiceOrder(id1: string, order1: number, id2: string, order2: number): Promise<void> {
    await springHttp.put('/services/order', { serviceId1: id1, order1, serviceId2: id2, order2 });
  }
}
