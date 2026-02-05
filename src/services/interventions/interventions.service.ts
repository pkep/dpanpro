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
import { geocodingService } from '@/services/geocoding/geocoding.service';

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
    clientId: string | null,
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

    // Geocode the address to get latitude/longitude
    let latitude: number | null = null;
    let longitude: number | null = null;
    
    try {
      const geoResult = await geocodingService.geocodeAddress(
        formData.address,
        formData.city,
        formData.postalCode
      );
      
      if (geoResult) {
        latitude = geoResult.latitude;
        longitude = geoResult.longitude;
        console.log('Geocoded intervention address:', { latitude, longitude, displayName: geoResult.displayName });
      } else {
        console.warn('Could not geocode intervention address:', formData.address, formData.city, formData.postalCode);
      }
    } catch (error) {
      console.error('Geocoding failed for intervention:', error);
    }

    const insertData: DbInterventionInsert = {
      client_id: clientId,
      category: formData.category as DbInterventionCategory,
      title: generatedTitle,
      description: formData.description,
      address: formData.address,
      city: formData.city,
      postal_code: formData.postalCode,
      latitude,
      longitude,
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
    // Now dispatch even without coordinates - the dispatch function will handle it
    dispatchService.dispatchIntervention(intervention.id).catch(err => {
      console.error('Auto-dispatch failed:', err);
    });

    return intervention;
  }

  async updateStatus(id: string, status: InterventionStatus, oldStatus?: InterventionStatus): Promise<void> {
    const updates: Record<string, unknown> = { status };
    const now = new Date();

    if (status === 'arrived') {
      updates.arrived_at = now.toISOString();
      
      // Calculate travel time (from accepted_at to arrived_at)
      const { data: intervention } = await supabase
        .from('interventions')
        .select('accepted_at')
        .eq('id', id)
        .single();
      
      if (intervention?.accepted_at) {
        const acceptedAt = new Date(intervention.accepted_at);
        const travelTimeSeconds = Math.round((now.getTime() - acceptedAt.getTime()) / 1000);
        updates.travel_time_seconds = travelTimeSeconds;
        console.log(`Travel time calculated: ${travelTimeSeconds} seconds`);
      }
    } else if (status === 'in_progress') {
      updates.started_at = now.toISOString();
    } else if (status === 'completed') {
      updates.completed_at = now.toISOString();
      
      // Calculate intervention duration (from started_at to completed_at)
      const { data: intervention } = await supabase
        .from('interventions')
        .select('started_at')
        .eq('id', id)
        .single();
      
      if (intervention?.started_at) {
        const startedAt = new Date(intervention.started_at);
        const interventionDurationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);
        updates.intervention_duration_seconds = interventionDurationSeconds;
        console.log(`Intervention duration calculated: ${interventionDurationSeconds} seconds`);
      }
    }

    const { error } = await supabase
      .from('interventions')
      .update(updates as TablesUpdate<'interventions'>)
      .eq('id', id);

    if (error) throw error;

    // Notify client of status change (non-blocking)
    this.notifyStatusChange(id, status, oldStatus).catch(err => {
      console.error('Failed to send status change notification:', err);
    });
  }

  private async notifyStatusChange(
    interventionId: string, 
    newStatus: InterventionStatus, 
    oldStatus?: InterventionStatus
  ): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('notify-status-change', {
        body: {
          interventionId,
          newStatus,
          oldStatus,
        },
      });

      if (error) {
        console.error('Error invoking notify-status-change:', error);
      }
    } catch (err) {
      console.error('Failed to call notify-status-change function:', err);
    }
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

  async cancelIntervention(id: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('interventions')
      .update({
        status: 'cancelled',
        is_active: false,
      } as TablesUpdate<'interventions'>)
      .eq('id', id);

    if (error) throw error;

    // Cancel any pending dispatch attempts
    await supabase
      .from('dispatch_attempts')
      .update({ status: 'cancelled' })
      .eq('intervention_id', id)
      .in('status', ['pending', 'notified']);

    console.log(`Intervention ${id} cancelled by client. Reason: ${reason}`);
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
      quoteSignedAt: (data as any).quote_signed_at,
      quoteSignatureData: (data as any).quote_signature_data,
      quotePdfUrl: (data as any).quote_pdf_url,
    };
  }
}

export const interventionsService = new InterventionsService();
