import { supabase } from '@/integrations/supabase/client';

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

const QUOTE_LINES_CONFIG: Record<'displacement' | 'security' | 'repair', { label: string; priceRatio: number }> = {
  displacement: { label: 'Déplacement technicien', priceRatio: 0.25 },
  security: { label: 'Mise en sécurité', priceRatio: 0.25 },
  repair: { label: 'Dépannage', priceRatio: 0.50 },
};

class QuotesService {
  /**
   * Generate quote lines for an intervention based on service base price and multiplier
   */
  generateQuoteLines(serviceBasePrice: number, multiplier: number): QuoteInput[] {
    return [
      {
        lineType: 'displacement',
        label: QUOTE_LINES_CONFIG.displacement.label,
        basePrice: serviceBasePrice * QUOTE_LINES_CONFIG.displacement.priceRatio,
        multiplier,
      },
      {
        lineType: 'security',
        label: QUOTE_LINES_CONFIG.security.label,
        basePrice: serviceBasePrice * QUOTE_LINES_CONFIG.security.priceRatio,
        multiplier,
      },
      {
        lineType: 'repair',
        label: QUOTE_LINES_CONFIG.repair.label,
        basePrice: serviceBasePrice * QUOTE_LINES_CONFIG.repair.priceRatio,
        multiplier,
      },
    ];
  }

  /**
   * Calculate total from quote lines
   */
  calculateTotal(lines: QuoteInput[]): number {
    return lines.reduce((sum, line) => {
      return sum + Math.round(line.basePrice * line.multiplier * 100) / 100;
    }, 0);
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
