export interface QuoteLine {
  id: string;
  interventionId: string;
  lineType: 'displacement' | 'security' | 'repair' | 'campaign_discount';
  label: string;
  basePrice: number;
  multiplier: number;
  calculatedPrice: number;
  displayOrder: number;
  createdAt: string;
}

export interface QuoteInput {
  lineType: 'displacement' | 'security' | 'repair' | 'campaign_discount';
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

export interface Service {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  defaultPriority: string;
  displacementPrice: number;
  securityPrice: number;
  vatRateIndividual: number;
  vatRateProfessional: number;
  targetArrivalTimeMinutes: number;
}

export interface IQuotesService {
  calculateTotalHT(lines: QuoteInput[]): number;
  getVatRate(service: Service, isCompany: boolean): number;
  calculateQuoteSummary(service: Service, multiplier: number, isCompany: boolean, isMultiplierEnabled?: boolean): QuoteSummary;
  saveQuoteLines(interventionId: string, lines: QuoteInput[]): Promise<QuoteLine[]>;
  getQuoteLines(interventionId: string): Promise<QuoteLine[]>;
  /**
   * Ids des interventions ayant au moins une ligne de devis (batch).
   * Permet d'afficher « Créer le devis » vs « Modifier le devis » sans N requêtes.
   */
  getInterventionIdsWithQuoteLines(interventionIds: string[]): Promise<Set<string>>;
}
