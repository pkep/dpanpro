import type { IPartnersService } from '@/services/interfaces/partners.interface';
import type { PartnerApplicationData } from '@/services/partners/partners.service';
import { springHttp } from './http-client';

export class SpringPartnersService implements IPartnersService {
  // POST /partners/apply
  async submitApplication(data: PartnerApplicationData): Promise<void> {
    await springHttp.post('/partners/apply', data);
  }

  // GET /partners/profile/{userId}
  async getPartnerProfile(userId: string): Promise<any | null> {
    return springHttp.get(`/partners/profile/${userId}`);
  }

  // PATCH /partners/profile/{userId}
  async updatePartnerProfile(userId: string, data: Record<string, unknown>): Promise<void> {
    await springHttp.patch(`/partners/profile/${userId}`, data);
  }
}
