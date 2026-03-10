import type { IPartnersService } from '@/services/interfaces/partners.interface';
import type { PartnerApplicationData } from '@/services/partners/partners.service';
import { springHttp } from './http-client';

export class SpringPartnersService implements IPartnersService {
  async submitApplication(data: PartnerApplicationData): Promise<void> {
    await springHttp.post('/partners/apply', data);
  }
  async getPartnerProfile(userId: string): Promise<any | null> {
    return springHttp.get(`/partners/${userId}/profile`);
  }
  async updatePartnerProfile(userId: string, data: Record<string, unknown>): Promise<void> {
    await springHttp.patch(`/partners/${userId}/profile`, data);
  }
}
