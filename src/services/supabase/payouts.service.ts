import type { IPayoutsService, Payout, CreatePayoutInput } from '@/services/interfaces/payouts.interface';
import { supabase } from '@/integrations/supabase/client';

function mapRow(row: any): Payout {
  return {
    id: row.id,
    technicianId: row.technician_id,
    amount: row.amount,
    payoutDate: row.payout_date,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    technicianName: row.technician_name,
  };
}

class SupabasePayoutsService implements IPayoutsService {
  async getPayouts(filters?: { status?: string }): Promise<Payout[]> {
    let query = supabase.from('technician_payouts').select('*');
    if (filters?.status) query = query.eq('status', filters.status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRow);
  }

  async createPayout(input: CreatePayoutInput): Promise<Payout> {
    const { data, error } = await supabase
      .from('technician_payouts')
      .insert({
        technician_id: input.technicianId,
        amount: input.amount,
        payout_date: input.payoutDate,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        notes: input.notes,
      })
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  async updatePayoutStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('technician_payouts')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  }
}

export const payoutsService = new SupabasePayoutsService();
