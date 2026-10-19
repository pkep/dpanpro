import { supabase } from '@/integrations/supabase/client';
import { buildAffiliateEmailAttachments } from '@/lib/affiliateQrPdf';
import {
  normalizeCampaignCode,
} from '@/lib/campaignDiscount';
import type {
  AffiliateCampaign,
  AffiliateCampaignInput,
  AffiliateCampaignStats,
  CampaignStatsParams,
  IAffiliateCampaignService,
} from '@/services/interfaces/affiliate-campaign.interface';

interface DbCampaign {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_permanent: boolean;
  is_suspended: boolean;
  can_combine: boolean;
  code: string | null;
  requires_code: boolean;
  commission_type: 'percentage' | 'fixed';
  commission_value: number | string;
  created_at: string;
  updated_at?: string | null;
}

interface DbInterventionCampaign {
  campaign_id: string | null;
  name: string;
  base_amount: number | string;
  discount_amount: number | string;
  created_at: string;
  intervention_id: string;
  interventions?: { final_price: number | string | null } | null;
}

const db = () => supabase as unknown as {
  from: (table: string) => any;
};

function mapCampaign(row: DbCampaign): AffiliateCampaign {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    isPermanent: row.is_permanent,
    isSuspended: row.is_suspended,
    canCombine: row.can_combine,
    code: row.code,
    requiresCode: row.requires_code,
    commissionType: row.commission_type,
    commissionValue: Number(row.commission_value),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

function toPayload(input: Partial<AffiliateCampaignInput> & { isSuspended?: boolean }) {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.startDate !== undefined) payload.start_date = input.startDate;
  if (input.endDate !== undefined) payload.end_date = input.endDate;
  if (input.isPermanent !== undefined) payload.is_permanent = input.isPermanent;
  if (input.canCombine !== undefined) payload.can_combine = input.canCombine;
  if (input.code !== undefined) payload.code = input.code ? normalizeCampaignCode(input.code) : null;
  if (input.requiresCode !== undefined) payload.requires_code = input.requiresCode;
  if (input.commissionType !== undefined) payload.commission_type = input.commissionType;
  if (input.commissionValue !== undefined) payload.commission_value = input.commissionValue;
  if (input.isSuspended !== undefined) payload.is_suspended = input.isSuspended;
  payload.updated_at = new Date().toISOString();
  return payload;
}

export class SupabaseAffiliateCampaignService implements IAffiliateCampaignService {
  async getCampaigns(params: { page: number; size: number; search?: string }): Promise<{
    content: AffiliateCampaign[];
    totalElements: number;
    totalPages: number;
  }> {
    let query = db().from('affiliate_campaign').select('*', { count: 'exact' });
    if (params.search?.trim()) {
      query = query.ilike('name', `%${params.search.trim()}%`);
    }
    const from = params.page * params.size;
    const to = from + params.size - 1;
    const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) throw error;
    const content = ((data ?? []) as DbCampaign[]).map(mapCampaign);
    const totalElements = count ?? content.length;
    return { content, totalElements, totalPages: Math.ceil(totalElements / params.size) };
  }

  async getCampaign(id: string): Promise<AffiliateCampaign> {
    const { data, error } = await db().from('affiliate_campaign').select('*').eq('id', id).single();
    if (error) throw error;
    return mapCampaign(data as DbCampaign);
  }

  async getActiveCampaigns(): Promise<AffiliateCampaign[]> {
    const { data, error } = await db()
      .from('affiliate_campaign')
      .select('*')
      .eq('is_suspended', false);
    if (error) throw error;
    return ((data ?? []) as DbCampaign[]).map(mapCampaign);
  }

  async createCampaign(input: AffiliateCampaignInput): Promise<AffiliateCampaign> {
    const payload = {
      name: input.name,
      start_date: input.isPermanent ? null : input.startDate ?? null,
      end_date: input.isPermanent ? null : input.endDate ?? null,
      is_permanent: input.isPermanent,
      is_suspended: false, // jamais à la création
      can_combine: input.canCombine,
      code: input.code ? normalizeCampaignCode(input.code) : null,
      requires_code: input.requiresCode,
      commission_type: input.commissionType,
      commission_value: input.commissionValue,
    };
    const { data, error } = await db().from('affiliate_campaign').insert(payload).select().single();
    if (error) throw error;
    return mapCampaign(data as DbCampaign);
  }

  async updateCampaign(
    id: string,
    input: Partial<AffiliateCampaignInput> & { isSuspended?: boolean },
  ): Promise<AffiliateCampaign> {
    const { data, error } = await db()
      .from('affiliate_campaign')
      .update(toPayload(input))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapCampaign(data as DbCampaign);
  }

  async suspendCampaign(id: string): Promise<void> {
    const { error } = await db()
      .from('affiliate_campaign')
      .update({ is_suspended: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async resumeCampaign(id: string): Promise<void> {
    const { error } = await db()
      .from('affiliate_campaign')
      .update({ is_suspended: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async deleteCampaign(id: string): Promise<void> {
    const { error } = await db().from('affiliate_campaign').delete().eq('id', id);
    if (error) throw error;
  }

  async getStats(params: CampaignStatsParams): Promise<AffiliateCampaignStats> {
    let query = db()
      .from('intervention_campaigns')
      .select('campaign_id, name, base_amount, discount_amount, created_at, intervention_id, interventions(final_price)');

    if (params.campaignId && params.campaignId !== 'all') {
      query = query.eq('campaign_id', params.campaignId);
    }

    // Filters on the snapshot creation date
    const { start, end } = periodBounds(params);
    if (start) query = query.gte('created_at', start);
    if (end) query = query.lte('created_at', end);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as DbInterventionCampaign[];

    const totalDiscountHt = rows.reduce((s, r) => s + Number(r.discount_amount || 0), 0);

    // Net revenue is counted once per intervention (multiple campaigns on the same intervention)
    const netByIntervention = new Map<string, number>();
    for (const r of rows) {
      if (!netByIntervention.has(r.intervention_id)) {
        netByIntervention.set(r.intervention_id, Number(r.interventions?.final_price || 0));
      }
    }
    const netRevenue = [...netByIntervention.values()].reduce((s, v) => s + v, 0);
    const campaignInterventions = netByIntervention.size;

    const perCampaignMap = new Map<string, {
      campaignId: string | null; name: string; interventions: Set<string>; discount: number; net: number;
    }>();
    for (const r of rows) {
      const key = r.campaign_id ?? `name:${r.name}`;
      if (!perCampaignMap.has(key)) {
        perCampaignMap.set(key, {
          campaignId: r.campaign_id,
          name: r.name,
          interventions: new Set(),
          discount: 0,
          net: 0,
        });
      }
      const entry = perCampaignMap.get(key)!;
      entry.discount += Number(r.discount_amount || 0);
      if (!entry.interventions.has(r.intervention_id)) {
        entry.interventions.add(r.intervention_id);
        entry.net += Number(r.interventions?.final_price || 0);
      }
    }

    const seriesMap = new Map<string, { discountHt: number; interventions: Set<string> }>();
    for (const r of rows) {
      const date = (r.created_at || '').slice(0, 10);
      if (!date) continue;
      if (!seriesMap.has(date)) seriesMap.set(date, { discountHt: 0, interventions: new Set() });
      const s = seriesMap.get(date)!;
      s.discountHt += Number(r.discount_amount || 0);
      s.interventions.add(r.intervention_id);
    }

    return {
      totalDiscountHt,
      campaignInterventions,
      avgDiscountHt: campaignInterventions > 0 ? totalDiscountHt / campaignInterventions : 0,
      netRevenue,
      perCampaign: [...perCampaignMap.values()].map((e) => ({
        campaignId: e.campaignId,
        name: e.name,
        interventionCount: e.interventions.size,
        totalDiscountHt: e.discount,
        netRevenue: e.net,
      })),
      series: [...seriesMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, discountHt: v.discountHt, interventions: v.interventions.size })),
    };
  }

  /** Envoie le flyer QR par email à un destinataire fourni (aucune email stockée sur la campagne). */
  async sendEmail(id: string, email: string): Promise<void> {
    const campaign = await this.getCampaign(id);
    if (!campaign.code) throw new Error('Cette campagne n’a pas de code promo (flyer impossible).');
    const promoUrl = `${window.location.origin}/new-intervention?promo=${encodeURIComponent(campaign.code)}`;
    const attachments = await buildAffiliateEmailAttachments(campaign.code, promoUrl);
    const { error } = await supabase.functions.invoke('campaign-send-email', {
      body: {
        campaignId: campaign.id,
        email,
        pdfBase64: attachments.pdfBase64,
        pdfFileName: `depanpro-campaign-${campaign.code}.pdf`,
        qrPngBase64: attachments.qrPngBase64,
      },
    });
    if (error) throw error;
  }

  /** Envoie le lien promo par SMS à un numéro fourni. */
  async sendSms(id: string, phone: string): Promise<void> {
    const campaign = await this.getCampaign(id);
    if (!campaign.code) throw new Error('Cette campagne n’a pas de code promo (lien impossible).');
    const { error } = await supabase.functions.invoke('campaign-send-sms', {
      body: { campaignId: campaign.id, phone },
    });
    if (error) throw error;
  }
}

function periodBounds(params: CampaignStatsParams): { start?: string; end?: string } {
  if (params.period === 'year' && params.year) {
    return {
      start: new Date(Date.UTC(params.year, 0, 1)).toISOString(),
      end: new Date(Date.UTC(params.year, 11, 31, 23, 59, 59, 999)).toISOString(),
    };
  }
  if (params.period === 'month' && params.year && params.month) {
    return {
      start: new Date(Date.UTC(params.year, params.month - 1, 1)).toISOString(),
      end: new Date(Date.UTC(params.year, params.month, 0, 23, 59, 59, 999)).toISOString(),
    };
  }
  if (params.period === 'range' && params.from && params.to) {
    return { start: params.from, end: params.to };
  }
  return {};
}

export const affiliateCampaignService = new SupabaseAffiliateCampaignService();
