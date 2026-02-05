import { supabase } from '@/integrations/supabase/client';
import { Service } from '@/services/services/services.service';

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

interface DbQuoteLine {
  id: string;
  intervention_id: string;
  line_type: string;
  label: string;
  base_price: number;
  multiplier: number;
  calculated_price: number;
  display_order: number;
  created_at: string;
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

const QUOTE_LINES_CONFIG: Record<'displacement' | 'security' | 'repair', { label: string }> = {
  displacement: { label: 'Déplacement technicien' },
  security: { label: 'Mise en sécurité' },
  repair: { label: 'Dépannage' },
};

class QuotesService {
  /**
   * Generate quote lines for an intervention based on service prices and multiplier
   * Includes all service lines (displacement, security, repair) to show full pricing breakdown
   */
  generateQuoteLines(service: Service, multiplier: number): QuoteInput[] {
    const lines: QuoteInput[] = [];

    // Always add displacement line
    lines.push({
      lineType: 'displacement',
      label: QUOTE_LINES_CONFIG.displacement.label,
      basePrice: service.displacementPrice,
      multiplier,
    });

    // Always add security line
    lines.push({
      lineType: 'security',
      label: QUOTE_LINES_CONFIG.security.label,
      basePrice: service.securityPrice,
      multiplier,
    });

    // Always add repair line
    lines.push({
      lineType: 'repair',
      label: QUOTE_LINES_CONFIG.repair.label,
      basePrice: service.repairPrice,
      multiplier,
    });

    return lines;
  }

  /**
   * Calculate total HT from quote lines
   */
  calculateTotalHT(lines: QuoteInput[]): number {
    return lines.reduce((sum, line) => {
      return sum + Math.round(line.basePrice * line.multiplier * 100) / 100;
    }, 0);
  }

  /**
   * Get VAT rate based on client type
   */
  getVatRate(service: Service, isCompany: boolean): number {
    return isCompany ? service.vatRateProfessional : service.vatRateIndividual;
  }

  /**
   * Calculate complete quote summary with HT, VAT and TTC
   */
  calculateQuoteSummary(service: Service, multiplier: number, isCompany: boolean): QuoteSummary {
    const lines = this.generateQuoteLines(service, multiplier);
    const totalHT = this.calculateTotalHT(lines);
    const vatRate = this.getVatRate(service, isCompany);
    const vatAmount = Math.round(totalHT * (vatRate / 100) * 100) / 100;
    const totalTTC = Math.round((totalHT + vatAmount) * 100) / 100;

    return {
      lines,
      totalHT,
      vatRate,
      vatAmount,
      totalTTC,
    };
  }

  /**
   * Save quote lines to database
   */
  async saveQuoteLines(interventionId: string, lines: QuoteInput[]): Promise<QuoteLine[]> {
    const insertData = lines.map((line, index) => ({
      intervention_id: interventionId,
      line_type: line.lineType,
      label: line.label,
      base_price: line.basePrice,
      multiplier: line.multiplier,
      calculated_price: Math.round(line.basePrice * line.multiplier * 100) / 100,
      display_order: index,
    }));

    const { data, error } = await supabase
      .from('intervention_quotes')
      .insert(insertData)
      .select();

    if (error) throw error;

    return ((data || []) as unknown as DbQuoteLine[]).map((d) => this.mapToQuoteLine(d));
  }

  /**
   * Get quote lines for an intervention
   */
  async getQuoteLines(interventionId: string): Promise<QuoteLine[]> {
    const { data, error } = await supabase
      .from('intervention_quotes')
      .select('*')
      .eq('intervention_id', interventionId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return ((data || []) as unknown as DbQuoteLine[]).map((d) => this.mapToQuoteLine(d));
  }

  private mapToQuoteLine(data: DbQuoteLine): QuoteLine {
    return {
      id: data.id,
      interventionId: data.intervention_id,
      lineType: data.line_type as 'displacement' | 'security' | 'repair',
      label: data.label,
      basePrice: data.base_price,
      multiplier: data.multiplier,
      calculatedPrice: data.calculated_price,
      displayOrder: data.display_order,
      createdAt: data.created_at,
    };
  }
}

export const quotesService = new QuotesService();
