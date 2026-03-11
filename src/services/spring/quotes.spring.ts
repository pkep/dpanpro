import { springHttp } from './http-client';

export interface QuoteLine {
  id: string;
  interventionId: string;
  lineType: string;
  label: string;
  basePrice: number;
  multiplier: number;
  calculatedPrice: number;
  displayOrder: number;
  createdAt: string;
}

export interface QuoteLineInput {
  lineType: string;
  label: string;
  basePrice: number;
  multiplier: number;
}

export class SpringQuotesService {
  // GET /interventions/{id}/quotes/lines
  async getQuoteLines(interventionId: string): Promise<QuoteLine[]> {
    return springHttp.get(`/interventions/${interventionId}/quotes/lines`);
  }

  // POST /interventions/{id}/quotes/lines
  async saveQuoteLines(interventionId: string, lines: QuoteLineInput[]): Promise<QuoteLine[]> {
    return springHttp.post(`/interventions/${interventionId}/quotes/lines`, { lines });
  }

  // POST /interventions/{id}/quotes/sign
  async signQuote(interventionId: string, signatureData: string): Promise<void> {
    await springHttp.post(`/interventions/${interventionId}/quotes/sign`, { signatureData });
  }
}
