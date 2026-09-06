// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import type {
  Affiliate,
  AffiliateInput,
  AffiliateStats,
  AffiliateTransaction,
  IAffiliateService,
  MonthlyAggregate,
} from '@/services/interfaces/affiliate.interface';

interface DbAffiliate {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  code: string;
  commission_type: string;
  commission_value: number | string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface DbAffiliateTransaction {
  id: string;
  affiliate_id: string;
  intervention_id: string;
  commission_type: string;
  commission_value: number | string;
  revenue_amount: number | string;
  commission_amount: number | string;
  status: string;
  created_at: string;
  confirmed_at?: string | null;
  paid_at?: string | null;
  // joined
  affiliate?: { id: string; code?: string; first_name?: string; last_name?: string };
  affiliates?: { id: string; code: string; first_name: string; last_name: string };
  interventions?: { tracking_code?: string | null };
  intervention?: { tracking_code?: string | null };
}

const mapAffiliate = (row: DbAffiliate): Affiliate => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  phone: row.phone,
  email: row.email,
  code: row.code,
  commissionType: row.commission_type as 'percentage' | 'fixed',
  commissionValue: Number(row.commission_value),
  isActive: row.is_active,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? undefined,
});

const mapTransaction = (row: DbAffiliateTransaction): AffiliateTransaction => {
  const affiliateCode =
    (row as unknown as { affiliate_code?: string }).affiliate_code ??
    row.affiliate?.code ??
    row.affiliates?.code;
  const trackingCode = row.interventions?.tracking_code ?? row.intervention?.tracking_code ?? undefined;
  return {
    id: row.id,
    affiliateId: row.affiliate_id,
    affiliateCode: affiliateCode ?? undefined,
    interventionId: row.intervention_id,
    commissionType: row.commission_type as 'percentage' | 'fixed',
    commissionValue: Number(row.commission_value),
    revenueAmount: Number(row.revenue_amount),
    commissionAmount: Number(row.commission_amount),
    status: row.status as 'pending' | 'confirmed' | 'paid',
    trackingCode: trackingCode ?? undefined,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at ?? null,
    paidAt: row.paid_at ?? null,
  };
};

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class SupabaseAffiliateService implements IAffiliateService {
  async getAffiliates(params: { page: number; size: number; search?: string }): Promise<{ content: Affiliate[]; totalElements: number; totalPages: number }> {
    let query = (supabase as unknown as any).from('affiliates' as any).select('*', { count: 'exact' });

    if (params.search && params.search.trim()) {
      const s = params.search.trim();
      // ilike search across first_name, last_name, phone (case-insensitive)
      query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,phone.ilike.%${s}%`);
    }

    const from = params.page * params.size;
    const to = from + params.size - 1;

    const { data, count, error } = await query.order('last_name', { ascending: true }).range(from, to);

    if (error) throw error;

    const content = ((data || []) as unknown as DbAffiliate[]).map(mapAffiliate);
    const totalElements = count ?? content.length;
    const totalPages = Math.ceil(totalElements / params.size);

    return { content, totalElements, totalPages };
  }

  async getAffiliate(id: string): Promise<Affiliate> {
    const { data, error } = await (supabase as unknown as any).from('affiliates' as any).select('*').eq('id', id).single();
    if (error) throw error;
    return mapAffiliate(data as unknown as DbAffiliate);
  }

  async createAffiliate(input: AffiliateInput): Promise<Affiliate> {
    const code = generateCode();
    const payload: Record<string, unknown> = {
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      email: input.email ?? null,
      code,
      commission_type: input.commissionType,
      commission_value: input.commissionValue,
      notes: input.notes ?? null,
      is_active: true,
    };

    const { data, error } = await (supabase as unknown as any).from('affiliates' as any).insert(payload as never).select().single();
    if (error) throw error;
    return mapAffiliate(data as unknown as DbAffiliate);
  }

  async updateAffiliate(id: string, input: Partial<AffiliateInput>): Promise<Affiliate> {
    const payload: Record<string, unknown> = {};
    if (input.firstName !== undefined) payload.first_name = input.firstName;
    if (input.lastName !== undefined) payload.last_name = input.lastName;
    if (input.phone !== undefined) payload.phone = input.phone;
    if (input.email !== undefined) payload.email = input.email;
    if (input.commissionType !== undefined) payload.commission_type = input.commissionType;
    if (input.commissionValue !== undefined) payload.commission_value = input.commissionValue;
    if (input.notes !== undefined) payload.notes = input.notes;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await (supabase as unknown as any).from('affiliates' as any)
      .update(payload as never)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapAffiliate(data as unknown as DbAffiliate);
  }

  async deleteAffiliate(id: string): Promise<void> {
    const { error } = await (supabase as unknown as any).from('affiliates' as any).delete().eq('id', id);
    if (error) throw error;
  }

  async validateCode(code: string): Promise<{ valid: boolean; affiliateName?: string }> {
    const { data, error } = await (supabase as unknown as any).from('affiliates' as any)
      .select('first_name, last_name')
      .eq('code', code.toUpperCase())
      .maybeSingle();
    if (error) throw error;
    if (!data) return { valid: false };
    const row = data as unknown as { first_name: string; last_name: string };
    return { valid: true, affiliateName: `${row.first_name} ${row.last_name}` };
  }

  async sendSms(id: string): Promise<void> {
    const { error } = await supabase.functions.invoke('affiliate-send-sms', { body: { affiliateId: id } });
    if (error) throw error;
  }

  async sendEmail(id: string): Promise<void> {
    const { error } = await supabase.functions.invoke('affiliate-send-email', { body: { affiliateId: id } });
    if (error) throw error;
  }

  async getTransactions(id: string, params: { page: number; size: number }): Promise<{ content: AffiliateTransaction[]; totalElements: number; totalPages: number }> {
    const from = params.page * params.size;
    const to = from + params.size - 1;

    const { data, count, error } = await (supabase as unknown as any).from('affiliate_transactions' as any)
      .select('*, interventions(tracking_code)', { count: 'exact' })
      .eq('affiliate_id', id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const content = ((data || []) as unknown as DbAffiliateTransaction[]).map(mapTransaction);
    const totalElements = count ?? content.length;
    const totalPages = Math.ceil(totalElements / params.size);

    return { content, totalElements, totalPages };
  }

  async getStats(params: { period: 'all' | 'year' | 'month' | 'range'; year?: number; month?: number; from?: string; to?: string; affiliateId?: string }): Promise<AffiliateStats> {
    let query = (supabase as unknown as any).from('affiliate_transactions' as any).select('*, affiliates(id, first_name, last_name, code)');

    if (params.affiliateId) {
      query = query.eq('affiliate_id', params.affiliateId);
    }

    // Apply date range filters via gte/lte when possible
    if (params.period === 'year' && params.year) {
      const start = new Date(Date.UTC(params.year, 0, 1, 0, 0, 0)).toISOString();
      const end = new Date(Date.UTC(params.year, 11, 31, 23, 59, 59, 999)).toISOString();
      query = query.gte('created_at', start).lte('created_at', end);
    } else if (params.period === 'month' && params.year && params.month) {
      const start = new Date(Date.UTC(params.year, params.month - 1, 1, 0, 0, 0)).toISOString();
      const end = new Date(Date.UTC(params.year, params.month, 0, 23, 59, 59, 999)).toISOString();
      query = query.gte('created_at', start).lte('created_at', end);
    } else if (params.period === 'range' && params.from && params.to) {
      query = query.gte('created_at', params.from).lte('created_at', params.to);
    } else if (params.period === 'all' && params.year && params.month) {
      const start = new Date(Date.UTC(params.year, params.month - 1, 1, 0, 0, 0)).toISOString();
      const end = new Date(Date.UTC(params.year, params.month, 0, 23, 59, 59, 999)).toISOString();
      query = query.gte('created_at', start).lte('created_at', end);
    } else if (params.period === 'all' && params.year) {
      const start = new Date(Date.UTC(params.year, 0, 1, 0, 0, 0)).toISOString();
      const end = new Date(Date.UTC(params.year, 11, 31, 23, 59, 59, 999)).toISOString();
      query = query.gte('created_at', start).lte('created_at', end);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []) as unknown as DbAffiliateTransaction[];

    // Additional client-side filtering fallback for edge cases (if from/to are Instant strings without gte success)
    let filtered = rows;
    if (params.period === 'range' && params.from && params.to) {
      const fromI = new Date(params.from).getTime();
      const toI = new Date(params.to).getTime();
      if (!isNaN(fromI) && !isNaN(toI)) {
        filtered = rows.filter(r => {
          const t = new Date(r.created_at).getTime();
          return t >= fromI && t <= toI;
        });
      }
    }

    const totalRevenue = filtered.reduce((sum, r) => sum + Number(r.revenue_amount || 0), 0);
    const totalCommission = filtered.reduce((sum, r) => sum + Number(r.commission_amount || 0), 0);

    const grouped = new Map<string, DbAffiliateTransaction[]>();
    for (const r of filtered) {
      const key = r.affiliate_id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    // Need affiliate details for perAffiliate when not fetched via join
    // Rows already contain affiliates join
    const perAffiliate = Array.from(grouped.entries()).map(([affiliateId, list]) => {
      const first = list[0];
      const aff = (first as unknown as { affiliates?: { first_name: string; last_name: string; code: string } }).affiliates;
      const revenue = list.reduce((s, r) => s + Number(r.revenue_amount || 0), 0);
      const commission = list.reduce((s, r) => s + Number(r.commission_amount || 0), 0);
      return {
        affiliateId,
        firstName: aff?.first_name ?? '',
        lastName: aff?.last_name ?? '',
        code: aff?.code ?? '',
        transactionCount: list.length,
        revenue,
        commission,
      };
    });

    // If affiliateId filter, ensure single entry reflects that affiliate's name (in case join missing)
    if (params.affiliateId && perAffiliate.length === 0 && filtered.length === 0) {
      // fetch affiliate info for empty case? Return zeroed
      return { totalRevenue: 0, totalCommission: 0, transactionCount: 0, perAffiliate: [] };
    }

    return {
      totalRevenue,
      totalCommission,
      transactionCount: filtered.length,
      perAffiliate,
    };
  }

  async getMonthlyAggregates(year: number, month: number): Promise<MonthlyAggregate[]> {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

    const { data, error } = await (supabase as unknown as any).from('affiliate_transactions' as any)
      .select('*, affiliates(id, first_name, last_name, code)')
      .gte('created_at', start)
      .lte('created_at', end);

    if (error) throw error;
    const rows = (data || []) as unknown as DbAffiliateTransaction[];

    const grouped = new Map<string, DbAffiliateTransaction[]>();
    for (const r of rows) {
      const key = r.affiliate_id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    const result: MonthlyAggregate[] = Array.from(grouped.entries()).map(([affiliateId, list]) => {
      const aff = (list[0] as unknown as { affiliates?: { first_name: string; last_name: string; code: string } }).affiliates;
      const revenue = list.reduce((s, r) => s + Number(r.revenue_amount || 0), 0);
      const commission = list.reduce((s, r) => s + Number(r.commission_amount || 0), 0);
      // Determine dominant status
      const statusCounts = list.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {});
      const status = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? list[0]?.status ?? 'pending';
      return {
        affiliateId,
        firstName: aff?.first_name ?? '',
        lastName: aff?.last_name ?? '',
        code: aff?.code ?? '',
        transactionCount: list.length,
        revenue,
        commission,
        status,
      };
    });

    return result;
  }

  async validateMonth(affiliateId: string, year: number, month: number): Promise<void> {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();
    const { data, error } = await (supabase as unknown as any).from('affiliate_transactions' as any)
      .select('id, status')
      .eq('affiliate_id', affiliateId)
      .gte('created_at', start)
      .lte('created_at', end)
      .eq('status', 'pending');
    if (error) throw error;
    const rows = (data || []) as unknown as { id: string }[];
    if (rows.length === 0) return;
    const now = new Date().toISOString();
    const { error: updErr } = await (supabase as unknown as any).from('affiliate_transactions' as any)
      .update({ status: 'confirmed', confirmed_at: now } as never)
      .in('id', rows.map(r => r.id));
    if (updErr) throw updErr;
  }

  async payMonth(affiliateId: string, year: number, month: number): Promise<void> {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();
    const { data, error } = await (supabase as unknown as any).from('affiliate_transactions' as any)
      .select('id, status')
      .eq('affiliate_id', affiliateId)
      .gte('created_at', start)
      .lte('created_at', end)
      .in('status', ['pending', 'confirmed']);
    if (error) throw error;
    const rows = (data || []) as unknown as { id: string; status: string }[];
    if (rows.length === 0) return;
    const now = new Date().toISOString();
    // For pending: need confirmed_at and paid_at; for confirmed: just paid_at. We do two updates or one with conditional.
    const pendingIds = rows.filter(r => r.status === 'pending').map(r => r.id);
    const confirmedIds = rows.filter(r => r.status === 'confirmed').map(r => r.id);

    if (pendingIds.length > 0) {
      const { error: e1 } = await (supabase as unknown as any).from('affiliate_transactions' as any)
        .update({ status: 'paid', confirmed_at: now, paid_at: now } as never)
        .in('id', pendingIds);
      if (e1) throw e1;
    }
    if (confirmedIds.length > 0) {
      const { error: e2 } = await (supabase as unknown as any).from('affiliate_transactions' as any)
        .update({ status: 'paid', paid_at: now } as never)
        .in('id', confirmedIds);
      if (e2) throw e2;
    }
  }
}

export const affiliateService = new SupabaseAffiliateService();