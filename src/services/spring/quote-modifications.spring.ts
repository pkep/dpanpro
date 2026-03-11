import type { IQuoteModificationsService } from '@/services/interfaces/quote-modifications.interface';
import type { QuoteModification, CreateQuoteModificationInput } from '@/services/quote-modifications/quote-modifications.service';
import { springHttp } from './http-client';

export class SpringQuoteModificationsService implements IQuoteModificationsService {
  // POST /interventions/{id}/quote-modifications
  async createModification(input: CreateQuoteModificationInput): Promise<QuoteModification> {
    return springHttp.post(`/interventions/${input.interventionId}/quote-modifications`, input);
  }

  // GET /quote-modifications/{modId}
  async getModification(id: string): Promise<QuoteModification | null> {
    return springHttp.get(`/quote-modifications/${id}`);
  }

  // GET /quote-modifications/token/{token}
  async getModificationByToken(token: string): Promise<QuoteModification | null> {
    return springHttp.get(`/quote-modifications/token/${token}`);
  }

  // GET /interventions/{id}/quote-modifications
  async getModificationsByIntervention(interventionId: string): Promise<QuoteModification[]> {
    return springHttp.get(`/interventions/${interventionId}/quote-modifications`);
  }

  // POST /quote-modifications/{modId}/approve
  async approveModification(id: string, signatureData?: string): Promise<{ incrementResult?: unknown }> {
    return springHttp.post(`/quote-modifications/${id}/approve`, { signatureData });
  }

  // POST /quote-modifications/{modId}/decline
  async declineModification(id: string, reason?: string): Promise<void> {
    await springHttp.post(`/quote-modifications/${id}/decline`, { reason });
  }

  // markAsNotified not in v2 — no-op
  async markAsNotified(_id: string): Promise<void> {}

  // GET /interventions/{id}/quote-modifications/pending
  async getPendingModification(interventionId: string): Promise<QuoteModification | null> {
    return springHttp.get(`/interventions/${interventionId}/quote-modifications/pending`);
  }
}
