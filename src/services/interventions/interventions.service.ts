import { supabase } from '@/integrations/supabase/client';
import type { 
  Intervention, 
  InterventionFormData, 
  InterventionStatus,
  InterventionCategory 
} from '@/types/intervention.types';
import type { DbIntervention, DbInterventionInsert, DbInterventionCategory, DbInterventionStatus, DbInterventionPriority } from '@/types/database.types';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { dispatchService } from '@/services/dispatch/dispatch.service';

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

    return ((data || []) as unknown as DbIntervention[]).map(this.mapToIntervention);
  }

  async getIntervention(id: string): Promise<Intervention | null> {
    const { data, error } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapToIntervention(data as unknown as DbIntervention);
  }

  async createIntervention(
    clientId: string,
    formData: InterventionFormData
  ): Promise<Intervention> {
    // Auto-generate title from category + address + postal code
    const categoryLabel = {
      locksmith: 'Serrurerie',
      plumbing: 'Plomberie',
      electricity: 'Électricité',
      glazing: 'Vitrerie',
      heating: 'Chauffage',
      aircon: 'Climatisation',
    }[formData.category] || formData.category;
    
    const generatedTitle = `${categoryLabel} - ${formData.address} - ${formData.postalCode}`;

    const insertData: DbInterventionInsert = {
      client_id: clientId,
      category: formData.category as DbInterventionCategory,
      title: generatedTitle,
      description: formData.description,
      address: formData.address,
      city: formData.city,
      postal_code: formData.postalCode,
      priority: (formData.priority || 'normal') as DbInterventionPriority,
      status: 'new' as DbInterventionStatus,
      is_active: true,
      client_email: formData.clientEmail || null,
      client_phone: formData.clientPhone || null,
      photos: formData.photos || null,
    };

    const { data, error } = await supabase
      .from('interventions')
      .insert(insertData as TablesInsert<'interventions'>)
      .select()
      .single();

    if (error) throw error;

    const intervention = this.mapToIntervention(data as unknown as DbIntervention);

    // Trigger automatic dispatch in background (non-blocking)
    if (intervention.latitude && intervention.longitude) {
      dispatchService.dispatchIntervention(intervention.id).catch(err => {
        console.error('Auto-dispatch failed:', err);
      });
    }

    return intervention;
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
      .update(updates as TablesUpdate<'interventions'>)
      .eq('id', id);

    if (error) throw error;
  }

  async assignTechnician(id: string, technicianId: string): Promise<void> {
    const { error } = await supabase
      .from('interventions')
      .update({
        technician_id: technicianId,
        status: 'assigned',
      } as TablesUpdate<'interventions'>)
      .eq('id', id);

    if (error) throw error;
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('interventions')
      .update({ is_active: isActive } as TablesUpdate<'interventions'>)
      .eq('id', id);

    if (error) throw error;
  }

  private mapToIntervention(data: DbIntervention): Intervention {
    return {
      id: data.id,
      clientId: data.client_id,
      technicianId: data.technician_id,
      category: data.category as InterventionCategory,
      priority: data.priority,
      status: data.status as InterventionStatus,
      title: data.title,
      description: data.description || '',
      address: data.address,
      city: data.city,
      postalCode: data.postal_code,
      latitude: data.latitude,
      longitude: data.longitude,
      estimatedPrice: data.estimated_price,
      finalPrice: data.final_price,
      scheduledAt: data.scheduled_at,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      photos: data.photos || undefined,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      trackingCode: data.tracking_code,
      clientEmail: data.client_email,
      clientPhone: data.client_phone,
    };
  }
}

export const interventionsService = new InterventionsService();
