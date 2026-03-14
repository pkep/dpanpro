import type { IDisputesService, Dispute, CreateDisputeInput, ResolveDisputeInput } from '@/services/interfaces/disputes.interface';
import { supabase } from '@/integrations/supabase/client';

function mapRow(row: any): Dispute {
  return {
    id: row.id,
    interventionId: row.intervention_id,
    clientId: row.client_id,
    technicianId: row.technician_id,
    status: row.status,
    clientNotes: row.client_notes,
    technicianNotes: row.technician_notes,
    adminNotes: row.admin_notes,
    resolution: row.resolution,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    refundAmount: row.refund_amount,
    refundType: row.refund_type,
    refundStripeId: row.refund_stripe_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class SupabaseDisputesService implements IDisputesService {
  async getDisputes(filters?: { status?: string }): Promise<Dispute[]> {
    let query = supabase.from('disputes').select('*');
    if (filters?.status) query = query.eq('status', filters.status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRow);
  }

  async createDispute(input: CreateDisputeInput): Promise<Dispute> {
    const { data, error } = await supabase
      .from('disputes')
      .insert({
        intervention_id: input.interventionId,
        client_notes: input.clientNotes,
        technician_notes: input.technicianNotes,
      })
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  async resolveDispute(id: string, input: ResolveDisputeInput): Promise<void> {
    const { error } = await supabase
      .from('disputes')
      .update({
        admin_notes: input.adminNotes,
        resolution: input.resolution,
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  }
}

export const disputesService = new SupabaseDisputesService();
