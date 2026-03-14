import type { Service } from './services.interface';

export interface QuoteLine {
  id: string;
  interventionId: string;
  lineType: 'displacement' | 'security' | 'repair';
  label: string;
  basePrice: number;
  multiplier: number;
  calculatedPrice: number;
  displayOrder: number;
  createdAt: string;
}

export interface QuoteInput {
  lineType: 'displacement' | 'security' | 'repair';
  label: string;
  basePrice: number;
  multiplier: number;
}

export interface QuoteSummary {
  lines: QuoteInput[];
  totalHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
}

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
