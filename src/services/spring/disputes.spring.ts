import type { IDisputesService, Dispute, CreateDisputeInput, ResolveDisputeInput } from '@/services/interfaces/disputes.interface';
import { springHttp } from './http-client';

export class SpringDisputesService implements IDisputesService {
  // GET /disputes?status=
  async getDisputes(filters?: { status?: string }): Promise<Dispute[]> {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    const page = await springHttp.get<{ content: Dispute[] }>('/disputes', params);
    return page.content;
  }

  // POST /disputes
  async createDispute(input: CreateDisputeInput): Promise<Dispute> {
    return springHttp.post<Dispute>('/disputes', input);
  }

  // POST /disputes/{id}/resolve
  async resolveDispute(id: string, input: ResolveDisputeInput): Promise<void> {
    await springHttp.post(`/disputes/${id}/resolve`, input);
  }
}
