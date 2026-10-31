import { supabase } from '@/integrations/supabase/client';
import type { IQuotesService, QuoteLine, QuoteInput, QuoteSummary, Service } from '@/services/interfaces/quotes.interface';
import type { DbQuoteLine } from '@/services/interfaces/supabase-database.interface';
import { isB2bCapExceeded, b2bEffectiveCap } from '@/lib/b2bPriceCap';
import { affiliateCampaignService } from '@/services/supabase/affiliate-campaign.service';
import { applyCampaignDiscounts, resolveActiveCampaigns } from '@/lib/campaignDiscount';

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
    // Lignes "métier" uniquement : on retire une éventuelle ligne de remise déjà injectée.
    const baseLines = lines.filter((l) => l.lineType !== 'campaign_discount');

    const { data: intervention } = await supabase
      .from('interventions')
      .select('billing_type, b2b_price_cap, campaign_code')
      .eq('id', interventionId)
      .maybeSingle();
    const inv = intervention as { billing_type?: string; b2b_price_cap?: number | null; campaign_code?: string | null } | null;
    const isB2b = inv?.billing_type === 'b2b';

    // ── Remise campagne (B2C uniquement), appliquée sur le total HT du devis ──
    let applied: {
      campaign: { id: string; name: string; code: string | null; commissionType: 'percentage' | 'fixed'; commissionValue: number };
      baseAmount: number;
      discountAmount: number;
    }[] = [];
    let campaignDiscount = 0;
    let campaignLines: QuoteInput[] = [];

    if (!isB2b) {
      const baseHt = baseLines.reduce(
        (s, l) => s + Math.round(l.basePrice * l.multiplier * 100) / 100,
        0,
      );
      const campaigns = await affiliateCampaignService.getActiveCampaigns();
      const result = applyCampaignDiscounts(
        baseHt,
        resolveActiveCampaigns(campaigns, new Date(), inv?.campaign_code),
      );
      applied = result.applied;
      campaignDiscount = result.discountAmount;
      campaignLines = result.applied.map((a) => ({
        lineType: 'campaign_discount' as const,
        label:
          `Remise campagne ${a.campaign.name}` +
          (a.campaign.code ? ` [${a.campaign.code}]` : '') +
          (a.campaign.commissionType === 'percentage'
            ? ` (-${a.campaign.commissionValue}%)`
            : ` (-${a.campaign.commissionValue.toFixed(2)} €)`),
        basePrice: -a.discountAmount,
        multiplier: 1,
      }));
    }

    const allLines = [...baseLines, ...campaignLines];

    // Plafond de prix B2B : bloque la sauvegarde du devis si le total TTC dépasse le plafond effectif.
    if (isB2b) {
      if (inv?.b2b_price_cap == null) {
        throw new Error('Aucun plafond de prix B2B défini. Contactez un manager pour le définir avant de valider.');
      }
      const totalHt = allLines.reduce((s, l) => s + Math.round(l.basePrice * l.multiplier * 100) / 100, 0);
      const totalTtc = Math.round(totalHt * 1.2 * 100) / 100;
      if (isB2bCapExceeded(totalTtc, inv.b2b_price_cap)) {
        throw new Error(
          `Le montant du devis (${totalTtc.toFixed(2)} € TTC) dépasse le plafond B2B autorisé ` +
          `(${b2bEffectiveCap(inv.b2b_price_cap).toFixed(2)} € pour un plafond de ${Number(inv.b2b_price_cap).toFixed(2)} €). ` +
          `Contactez un manager pour valider le nouveau prix avec le contact du partenaire et augmenter le plafond.`
        );
      }
    }

    const insertData = allLines.map((line, index) => ({
      intervention_id: interventionId,
      line_type: line.lineType,
      label: line.label,
      description: line.description || null,
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

      const fallbackLines = ((fallbackData || []) as unknown as DbQuoteLine[]).map((d) => this.mapToQuoteLine(d));
      await this.syncCampaignSnapshot(interventionId, isB2b, applied, campaignDiscount);
      return fallbackLines;
    }

    const savedLines = ((data || []) as unknown as DbQuoteLine[]).map((d) => this.mapToQuoteLine(d));
    await this.syncCampaignSnapshot(interventionId, isB2b, applied, campaignDiscount);
    return savedLines;
  }

  /**
   * Persiste le snapshot des campagnes appliquées (historique) et le total remisé HT
   * sur l'intervention. Best-effort : ne bloque pas l'enregistrement du devis.
   */
  private async syncCampaignSnapshot(
    interventionId: string,
    isB2b: boolean,
    applied: {
      campaign: { id: string; name: string; code: string | null; commissionType: 'percentage' | 'fixed'; commissionValue: number };
      baseAmount: number;
      discountAmount: number;
    }[],
    discountAmount: number,
  ): Promise<void> {
    try {
      const db = supabase as unknown as { from: (table: string) => any };
      await db.from('intervention_campaigns').delete().eq('intervention_id', interventionId);

      if (!isB2b && applied.length > 0) {
        const rows = applied.map((a) => ({
          intervention_id: interventionId,
          campaign_id: a.campaign.id,
          code: a.campaign.code,
          name: a.campaign.name,
          commission_type: a.campaign.commissionType,
          commission_value: a.campaign.commissionValue,
          base_amount: a.baseAmount,
          discount_amount: a.discountAmount,
        }));
        const { error } = await db.from('intervention_campaigns').insert(rows);
        if (error) throw error;

        await db.from('interventions').update({
          campaign_id: applied[0].campaign.id,
          campaign_discount_amount: discountAmount,
        }).eq('id', interventionId);
      } else {
        await db.from('interventions').update({
          campaign_id: null,
          campaign_discount_amount: null,
        }).eq('id', interventionId);
      }
    } catch (error) {
      console.warn('[quotes] campaign snapshot sync failed:', error);
    }
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
      description: data.description,
      basePrice: data.base_price,
      multiplier: data.multiplier,
      calculatedPrice: data.calculated_price,
      displayOrder: data.display_order,
      createdAt: data.created_at,
    };
  }
}

export const quotesService = new SupabaseQuotesService();
