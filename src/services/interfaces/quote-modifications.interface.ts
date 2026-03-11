import type { QuoteModification, CreateQuoteModificationInput } from '@/services/supabase/quote-modifications.service';

export interface IQuoteModificationsService {
  createModification(input: CreateQuoteModificationInput): Promise<QuoteModification>;
  getModification(id: string): Promise<QuoteModification | null>;
  getModificationByToken(token: string): Promise<QuoteModification | null>;
  getModificationsByIntervention(interventionId: string): Promise<QuoteModification[]>;
  approveModification(id: string, signatureData?: string): Promise<{ incrementResult?: unknown }>;
  declineModification(id: string, reason?: string): Promise<void>;
  markAsNotified(id: string): Promise<void>;
  getPendingModification(interventionId: string): Promise<QuoteModification | null>;
}
