import { supabase } from '@/integrations/supabase/client';
import type { IQuotesService, QuoteLine, QuoteInput, QuoteSummary, Service } from '@/services/interfaces/quotes.interface';
import type { DbQuoteLine } from '@/services/interfaces/supabase-database.interface';
import { isB2bCapExceeded, b2bEffectiveCap } from '@/lib/b2bPriceCap';

const QUOTE_LINES_CONFIG: Record<'displacement' | 'security' | 'repair', { label: string }> = {
  displacement: { label: 'Déplacement technicien' },
  security: { label: 'Mise en sécurité' },
  repair: { label: 'Dépannage' },
};

export class SupabaseQuotesService implements IQuotesService {
  /**
   * Generate quote lines for an intervention based on service prices and multiplier
   * Only includes lines with a price > 0
   */
  generateQuoteLines(service: Service, multiplier: number, isMultiplierEnabled: boolean = true): QuoteInput[] {
    const lines: QuoteInput[] = [];
    const effectiveMultiplier = isMultiplierEnabled ? multiplier : 1;

    // Add displacement line if price > 0
    if (service.displacementPrice > 0) {
      lines.push({
        lineType: 'displacement',
        label: QUOTE_LINES_CONFIG.displacement.label,
        basePrice: service.displacementPrice,
        multiplier: effectiveMultiplier,
      });
    }

    // Add security line if price > 0
    if (service.securityPrice > 0) {
      lines.push({
        lineType: 'security',
        label: QUOTE_LINES_CONFIG.security.label,
        basePrice: service.securityPrice,
        multiplier: effectiveMultiplier,
      });
    }

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
  calculateQuoteSummary(service: Service, multiplier: number, isCompany: boolean, isMultiplierEnabled: boolean = true): QuoteSummary {
    const lines = this.generateQuoteLines(service, multiplier, isMultiplierEnabled);
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
    // Plafond de prix B2B : bloque la sauvegarde du devis si le total TTC dépasse le plafond effectif.
    const { data: intervention } = await supabase
      .from('interventions')
      .select('billing_type, b2b_price_cap')
      .eq('id', interventionId)
      .maybeSingle();
    const inv = intervention as { billing_type?: string; b2b_price_cap?: number | null } | null;
    if (inv?.billing_type === 'b2b') {
      if (inv.b2b_price_cap == null) {
        throw new Error('Aucun plafond de prix B2B défini. Contactez un manager pour le définir avant de valider.');
      }
      const totalHt = lines.reduce((s, l) => s + Math.round(l.basePrice * l.multiplier * 100) / 100, 0);
      const totalTtc = Math.round(totalHt * 1.2 * 100) / 100;
      if (isB2bCapExceeded(totalTtc, inv.b2b_price_cap)) {
        throw new Error(
          `Le montant du devis (${totalTtc.toFixed(2)} € TTC) dépasse le plafond B2B autorisé ` +
          `(${b2bEffectiveCap(inv.b2b_price_cap).toFixed(2)} € pour un plafond de ${Number(inv.b2b_price_cap).toFixed(2)} €). ` +
          `Contactez un manager pour valider le nouveau prix avec le contact du partenaire et augmenter le plafond.`
        );
      }
    }

    const insertData = lines.map((line, index) => ({
      intervention_id: interventionId,
      line_type: line.lineType,
      label: line.label,
      base_price: line.basePrice,
      multiplier: line.multiplier,
      calculated_price: Math.round(line.basePrice * line.multiplier * 100) / 100,
      display_order: index,
    }));

    // Remplacement ATOMIQUE via RPC SECURITY DEFINER — corrige les doublons :
    // le DELETE côté client était bloqué par la RLS (0 ligne supprimée, sans
    // erreur) et l'INSERT s'ajoutait aux anciennes lignes à chaque save.
    // NB : appel via `supabase.rpc(...)` (récepteur conservé) — ne PAS extraire
    // la méthode dans une variable, sinon `this` est perdu ("reading 'rest'").
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>)(
      'replace_intervention_quotes',
      { p_intervention_id: interventionId, p_lines: insertData },
    );

    if (error) {
      // Repli transitoire tant que la migration V45 n'est pas appliquée.
      const missingFunction =
        error.code === 'PGRST202'
        || error.code === '42883'
        || /could not find the function|does not exist/i.test(error.message ?? '');
      if (!missingFunction) throw error;

      console.warn(
        '[quotes] replace_intervention_quotes indisponible (migration V45 non appliquée) — repli delete+insert.',
        error.message,
      );

      const { error: deleteError } = await supabase
        .from('intervention_quotes')
        .delete()
        .eq('intervention_id', interventionId);
      if (deleteError) throw deleteError;

      const { data: fallbackData, error: insertError } = await supabase
        .from('intervention_quotes')
        .insert(insertData)
        .select();
      if (insertError) throw insertError;

      return ((fallbackData || []) as unknown as DbQuoteLine[]).map((d) => this.mapToQuoteLine(d));
    }

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

  /**
   * Ids des interventions ayant au moins une ligne de devis (batch).
   */
  async getInterventionIdsWithQuoteLines(interventionIds: string[]): Promise<Set<string>> {
    if (interventionIds.length === 0) return new Set();
    const { data, error } = await supabase
      .from('intervention_quotes')
      .select('intervention_id')
      .in('intervention_id', interventionIds);

    if (error) throw error;

    return new Set(
      ((data || []) as { intervention_id: string }[]).map((r) => r.intervention_id),
    );
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

export const quotesService = new SupabaseQuotesService();
