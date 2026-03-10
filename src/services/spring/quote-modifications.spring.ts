import type { IQuoteModificationsService } from '@/services/interfaces/quote-modifications.interface';
import type { QuoteModification, CreateQuoteModificationInput } from '@/services/quote-modifications/quote-modifications.service';
import { springHttp } from './http-client';

export class SpringQuoteModificationsService implements IQuoteModificationsService {
  async createModification(input: CreateQuoteModificationInput): Promise<QuoteModification> {
    return springHttp.post('/quote-modifications', input);
  }
  async getModification(id: string): Promise<QuoteModification | null> {
    return springHttp.get(`/quote-modifications/${id}`);
  }
  async getModificationByToken(token: string): Promise<QuoteModification | null> {
    return springHttp.get(`/quote-modifications/by-token/${token}`);
  }
  async getModificationsByIntervention(interventionId: string): Promise<QuoteModification[]> {
    return springHttp.get(`/quote-modifications/intervention/${interventionId}`);
  }
  async approveModification(id: string, signatureData?: string): Promise<{ incrementResult?: unknown }> {
    return springHttp.post(`/quote-modifications/${id}/approve`, { signatureData });
  }
  async declineModification(id: string, reason?: string): Promise<void> {
    await springHttp.post(`/quote-modifications/${id}/decline`, { reason });
  }
  async markAsNotified(id: string): Promise<void> {
    await springHttp.patch(`/quote-modifications/${id}/notified`);
  }
  async getPendingModification(interventionId: string): Promise<QuoteModification | null> {
    return springHttp.get(`/quote-modifications/intervention/${interventionId}/pending`);
  }
}
