import type { IPayoutsService, Payout, CreatePayoutInput } from '@/services/interfaces/payouts.interface';
import { springHttp } from './http-client';

export class SpringPayoutsService implements IPayoutsService {
  // GET /payouts?status=
  async getPayouts(filters?: { status?: string }): Promise<Payout[]> {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    const page = await springHttp.get<{ content: Payout[] }>('/payouts', params);
    return page.content;
  }

  // POST /payouts
  async createPayout(input: CreatePayoutInput): Promise<Payout> {
    return springHttp.post<Payout>('/payouts', input);
  }

  // PATCH /payouts/{id}/status
  async updatePayoutStatus(id: string, status: string, paidAt?: string): Promise<void> {
    await springHttp.patch(`/payouts/${id}/status`, { status, paidAt });
  }
}
