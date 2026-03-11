import type { QuoteLine, QuoteInput, QuoteSummary } from '@/services/supabase/quotes.service';
import type { Service } from '@/services/supabase/services.service';

export interface IQuotesService {
  isMultiplierEnabled(): Promise<boolean>;
  isPriorityMultiplierEnabled(priority: string): Promise<boolean>;
  getEffectiveMultiplier(priority: string, multiplierValue: number): Promise<number>;
  generateQuoteLines(service: Service, multiplier: number, isMultiplierEnabled?: boolean): QuoteInput[];
  calculateTotalHT(lines: QuoteInput[]): number;
  getVatRate(service: Service, isCompany: boolean): number;
  calculateQuoteSummary(service: Service, multiplier: number, isCompany: boolean, isMultiplierEnabled?: boolean): QuoteSummary;
  saveQuoteLines(interventionId: string, lines: QuoteInput[]): Promise<QuoteLine[]>;
  getQuoteLines(interventionId: string): Promise<QuoteLine[]>;
}
