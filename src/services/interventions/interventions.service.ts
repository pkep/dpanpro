import { supabase } from '@/integrations/supabase/client';
import type { 
  Intervention, 
  InterventionFormData, 
  InterventionStatus,
  InterventionCategory 
} from '@/types/intervention.types';

class InterventionsService {
  async getInterventions(filters?: {
    status?: InterventionStatus;
    category?: InterventionCategory;
    clientId?: string;
    technicianId?: string;
    isActive?: boolean;
  }): Promise<Intervention[]> {
    let query = supabase
      .from('interventions')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters?.technicianId) {
      query = query.eq('technician_id', filters.technicianId);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(this.mapToIntervention);
  }

  async getIntervention(id: string): Promise<Intervention | null> {
    const { data, error } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapToIntervention(data);
  }

  async createIntervention(
    clientId: string,
    formData: InterventionFormData
  ): Promise<Intervention> {
    const { data, error } = await supabase
      .from('interventions')
      .insert({
        client_id: clientId,
        category: formData.category,
        title: formData.title,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        priority: formData.priority || 'normal',
        status: 'new',
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapToIntervention(data);
  }

  async updateStatus(id: string, status: InterventionStatus): Promise<void> {
    const updates: Record<string, unknown> = { status };

    if (status === 'in_progress') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('interventions')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async assignTechnician(id: string, technicianId: string): Promise<void> {
    const { error } = await supabase
      .from('interventions')
      .update({
        technician_id: technicianId,
        status: 'assigned',
      })
      .eq('id', id);

    if (error) throw error;
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('interventions')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;
  }

  private mapToIntervention(data: Record<string, unknown>): Intervention {
    return {
      id: data.id as string,
      clientId: data.client_id as string,
      technicianId: data.technician_id as string | null,
      category: data.category as InterventionCategory,
      priority: data.priority as Intervention['priority'],
      status: data.status as InterventionStatus,
      title: data.title as string,
      description: data.description as string,
      address: data.address as string,
      city: data.city as string,
      postalCode: data.postal_code as string,
      latitude: data.latitude as number | null,
      longitude: data.longitude as number | null,
      estimatedPrice: data.estimated_price as number | null,
      finalPrice: data.final_price as number | null,
      scheduledAt: data.scheduled_at as string | null,
      startedAt: data.started_at as string | null,
      completedAt: data.completed_at as string | null,
      photos: data.photos as string[] | undefined,
      isActive: data.is_active as boolean,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

export const interventionsService = new InterventionsService();
