import { supabase } from '@/integrations/supabase/client';
import {
  Intervention,
  InterventionFormData,
  InterventionStatus,
  InterventionCategory,
  InterventionGeoView,
  InterventionTechDashboardView,
  InterventionTechnicianView,
  InterventionAdminView,
  InterventionClientView,
  InterventionStatsView, InterventionQuestionnaireData,
  InterventionQuoteSignature,
  InterventionInvoiceSignature,
  InterventionStatusHistoryEntry,
  InterventionPriority,
  UpdateInterventionPayload,
} from '@/types/intervention.types';
import type { IInterventionsService } from '@/services/interfaces/interventions.interface';
import type { DbIntervention, DbInterventionCategory, DbInterventionStatus, DbInterventionPriority } from '@/types/database.types';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import type { PaginatedResponse } from '@/types/pagination.types';
import { dispatchService } from '@/services/supabase/dispatch.service';
import { recordInterventionStatusChange } from '@/services/supabase/intervention-history-status.service';
import { geocodingService } from '@/services/components/geocoding/geocoding.service';
import { services } from '@/services/factory';
import { mapAdminInterventionRow, type AdminInterventionRow } from '@/lib/interventionAdmin';

/**
 * ✅ PRESETS INTERNES - Sélection des champs par use-case
 * Ces constantes définissent les champs Supabase à sélectionner pour chaque cas d'usage
 * Les clients NE VOIENT PAS ces constantes - elles sont encapsulées!
 */
const INTERVENTION_SELECT_FIELDS = {
  // DashboardTechnician: Geo-filtering PUR (5 champs)
  GEO_FILTER: 'id, status, created_at, latitude, longitude',

  // InterventionTech: Dashboard technician (11 champs) ✨ NEW
  TECHNICIAN_VIEW: 'id, title, category, status, city, created_at, final_price, estimated_price, tracking_code, technician_id, description',

  // DashboardTechnician: Full display (13 champs)
  TECH_DASHBOARD: 'id, status, created_at, latitude, longitude, title, category, city, postal_code, estimated_price, address, client_phone, tracking_code, description',

  // AdminInterventionsPage: Liste complète
  ADMIN_LIST: 'id, title, category, address, city, postal_code, latitude, longitude, client_id, tracking_code, technician_id, status, suspended, priority, scheduled_at, description, created_at, final_price, estimated_price, prix_min, prix_max, questionnaire_answers, client_photos_count, b2b_partner_id, client_first_name, client_last_name, client_phone, b2b_partners(company_name, contact_firstname, contact_lastname, contact_phone)',

  // ClientInterventionsPage: Historique
  CLIENT_HISTORY: 'id, title, category, status, priority, city, created_at',

  // AdminDashboard: Stats
  STATS: 'id, status, created_at, category',

  // Fallback: Tous les champs
  ALL: '*',
} as const;

class SupabaseInterventionsService implements IInterventionsService {
  async getInterventions(filters?: {
    status?: InterventionStatus | InterventionStatus[];
    category?: InterventionCategory;
    clientId?: string;
    technicianId?: string;
    isActive?: boolean;
    unassignedOnly?: boolean;
    orderBy?: ('createdAt' | 'priority' | 'updatedAt')[];
    orderDirection?: ('asc' | 'desc')[];
    page?: number;
    size?: number;
  }): Promise<Intervention[]> {
    let query = supabase
      .from('interventions')
      .select('*', { count: 'exact' });

    // Map orderBy to database column names
    const orderByMap: Record<string, string> = {
      createdAt: 'created_at',
      priority: 'priority',
      updatedAt: 'updated_at',
    };

    // Apply multiple ordering clauses (default: createdAt descending)
    const orderByArray = filters?.orderBy || ['createdAt'];
    const orderDirArray = filters?.orderDirection || Array(orderByArray.length).fill('desc');

    // Apply each order in sequence
    orderByArray.forEach((orderBy, index) => {
      const orderColumn = orderByMap[orderBy];
      const orderDir = orderDirArray[index] || 'desc';
      query = query.order(orderColumn, { ascending: orderDir === 'asc' });
    });

    // Handle status filter: can be a single value or an array
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
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
    if (filters?.unassignedOnly) {
      query = query.is('technician_id', null);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    // Apply limit if a page size was provided
    const size = filters?.size ?? 0;
    if (size > 0) {
      query = query.limit(size);
    }

    const { data, error } = await query;

    if (error) throw error;

    return ((data || []) as unknown as DbIntervention[]).map(this.mapToIntervention);
  }

  async getIntervention(id: string): Promise<Intervention | null> {
    const { data, error } = await supabase
      .from('interventions')
      .select('*, b2b_partners(company_name, contact_firstname, contact_lastname, contact_phone)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapToIntervention(data as unknown as DbIntervention);
  }

  async createIntervention(
    clientId: string | null,
    formData: InterventionFormData,
    questionnaireData?: InterventionQuestionnaireData
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
      } else {
        console.warn('Could not geocode intervention address:', formData.address, formData.city, formData.postalCode);
      }
    } catch (error) {
      console.error('Geocoding failed for intervention:', error);
    }

    const insertData: Record<string, unknown> = {
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
      scheduled_at: formData.scheduledAt || null,
    };

    // B2B : intervention pour un partenaire — pas de client User, bénéficiaire sur site
    const isB2b = formData.billingType === 'b2b' || !!formData.b2bPartnerId;
    if (isB2b) {
      insertData.billing_type = 'b2b';
      insertData.b2b_partner_id = formData.b2bPartnerId || null;
      insertData.client_id = null;
      insertData.client_first_name = formData.clientFirstName || null;
      insertData.client_last_name = formData.clientLastName || null;
      insertData.b2b_order_reference = formData.b2bOrderReference || null;
      if (formData.b2bPriceCap != null) insertData.b2b_price_cap = formData.b2bPriceCap;
    }

    // Add questionnaire data if provided
    if (questionnaireData) {
      if (questionnaireData.questionnaireAnswers) {
        insertData.questionnaire_answers = questionnaireData.questionnaireAnswers;
      }
      if (questionnaireData.prixMin !== undefined) {
        insertData.prix_min = questionnaireData.prixMin;
      }
      if (questionnaireData.prixMax !== undefined) {
        insertData.prix_max = questionnaireData.prixMax;
      }
    }

    const { data, error } = await supabase
      .from('interventions')
      .insert(insertData as TablesInsert<'interventions'>)
      .select()
      .single();

    if (error) throw error;

    const intervention = this.mapToIntervention(data as unknown as DbIntervention);

    // Journaliser la création (statut 'new')
    recordInterventionStatusChange(intervention.id, 'new');

    // Trigger automatic dispatch in background (non-blocking)
    // Now dispatch even without coordinates - the dispatch function will handle it
    dispatchService.dispatchIntervention(intervention.id).catch(err => {
      console.error('Auto-dispatch failed:', err);
    });

    //
    if (!isB2b) {
      services.notifications.notifyNewIntervention(intervention.id).catch(err => {
        console.error('Notify new Intervention failed:', err);
      });
    }
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

    // Journaliser le changement de statut
    recordInterventionStatusChange(id, status);

    // Notify client of status change (non-blocking)
    this.notifyStatusChange(id, status, oldStatus).catch(err => {
      console.error('Failed to send status change notification:', err);
    });
  }

  /**
   * Édition admin/manager d'une intervention (mode Supabase direct).
   * Applique les mêmes règles de domaine que le gateway (machine à états côté
   * appelant + verrou optimiste `expectedUpdatedAt`).
   */
  async updateIntervention(id: string, payload: UpdateInterventionPayload): Promise<void> {
    // R4 — verrou optimiste
    if (payload.expectedUpdatedAt) {
      const { data: current, error: readError } = await supabase
        .from('interventions')
        .select('updated_at')
        .eq('id', id)
        .single();
      if (readError) throw readError;
      if (current?.updated_at && current.updated_at !== payload.expectedUpdatedAt) {
        throw new Error("STALE_INTERVENTION: L'intervention a été modifiée entre-temps. Rechargez la fiche.");
      }
    }

    const updates: Record<string, unknown> = {};
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.priority !== undefined) updates.priority = payload.priority;
    if (payload.scheduledAt !== undefined) updates.scheduled_at = payload.scheduledAt;
    if (payload.clearSchedule) updates.scheduled_at = null;
    if (payload.address !== undefined) updates.address = payload.address;
    if (payload.city !== undefined) updates.city = payload.city;
    if (payload.postalCode !== undefined) updates.postal_code = payload.postalCode;
    if (payload.latitude !== undefined) updates.latitude = payload.latitude;
    if (payload.longitude !== undefined) updates.longitude = payload.longitude;
    if (payload.clientPhone !== undefined) updates.client_phone = payload.clientPhone;
    if (payload.clientEmail !== undefined) updates.client_email = payload.clientEmail;
    if (payload.clientFirstName !== undefined) updates.client_first_name = payload.clientFirstName;
    if (payload.clientLastName !== undefined) updates.client_last_name = payload.clientLastName;
    if (payload.technicianId !== undefined && payload.technicianId !== null) {
      updates.technician_id = payload.technicianId;
      if (payload.status === undefined) updates.status = 'assigned';
    }
    if (payload.clearTechnician) updates.technician_id = null;
    if (payload.prixMin !== undefined) updates.prix_min = payload.prixMin;
    if (payload.prixMax !== undefined) updates.prix_max = payload.prixMax;
    if (payload.questionnaireAnswers !== undefined) updates.questionnaire_answers = payload.questionnaireAnswers;

    const { error } = await supabase
      .from('interventions')
      .update(updates as unknown as TablesUpdate<'interventions'>)
      .eq('id', id);

    if (error) throw error;
    if (payload.status) recordInterventionStatusChange(id, payload.status);
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
    // Assignation avec imposition d'éligibilité côté serveur (edge function).
    const { data, error } = await supabase.functions.invoke('dispatch-intervention', {
      body: { interventionId: id, technicianId, action: 'assign' },
    });

    if (error) throw error;
    if (data && data.success === false) {
      throw new Error(data.message || 'Technicien non éligible');
    }
  }

  async updateB2bPriceCap(id: string, b2bPriceCap: number | null): Promise<Intervention> {
    const { data, error } = await supabase
      .from('interventions')
      .update({ b2b_price_cap: b2bPriceCap } as never)
      .eq('id', id)
      .select('*, b2b_partners(company_name, contact_firstname, contact_lastname, contact_phone)')
      .single();
    if (error) throw error;
    return this.mapToIntervention(data as unknown as DbIntervention);
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

    // Journaliser l'annulation
    recordInterventionStatusChange(id, 'cancelled');

    // Cancel any pending dispatch attempts
    await supabase
      .from('dispatch_attempts')
      .update({ status: 'cancelled' })
      .eq('intervention_id', id)
      .in('status', ['pending', 'notified']);

    console.log(`Intervention ${id} cancelled by client. Reason: ${reason}`);
  }

  async updateQuoteInterventionSignature(interventionId: string, signatureData: string): Promise<void> {
    const { error } = await supabase
      .from('interventions')
      .update({
        quote_signed_at: new Date().toISOString(),
        quote_signature_data: signatureData,
      } as TablesUpdate<'interventions'>)
      .eq('id', interventionId);

    if (error) throw error;

    console.log(`Intervention ${interventionId} quote signature updated`);
  }

  async finalized(interventionId: string, finalPrice: number, signatureData: string): Promise<void> {
    var current = new Date().toISOString()
    const { error } = await supabase
      .from('interventions')
      .update({
        status: 'completed',
        final_price: finalPrice,
        invoice_signed_at: current,
        invoice_signature_data: signatureData,
        completed_at: current
      } as TablesUpdate<'interventions'>)
      .eq('id', interventionId);

    if (error) throw error;

    // Journaliser la finalisation (statut 'completed')
    recordInterventionStatusChange(interventionId, 'completed');

    console.log(`Intervention ${interventionId} final price updated to ${finalPrice}`);

    // send end intervention notification
    await supabase.functions.invoke('send-invoice-email', {
        body: { interventionId }
        });

    // store invoice into storage
    await supabase.functions.invoke('upload-invoice-pdf', {
        body: { interventionId }
    });

  }

async updateEstimatedPrice(interventionId: string, estimatedPrice: number): Promise<void> {
    const { error } = await supabase
      .from('interventions')
      .update({
        estimated_price: estimatedPrice,
      } as TablesUpdate<'interventions'>)
      .eq('id', interventionId);

    if (error) throw error;

    console.log(`Intervention ${interventionId} estimated price updated to ${estimatedPrice}`);
  }

  /**
   * Schedule an intervention with a date, time and optionally assign a technician
   */
  async scheduleIntervention(interventionId: string, scheduledAt: string, technicianId?: string): Promise<void> {
    const { error } = await supabase
      .from('interventions')
      .update({
        scheduled_at: scheduledAt,
        technician_id: technicianId || null,
        status: technicianId ? 'assigned' : undefined,
      } as TablesUpdate<'interventions'>)
      .eq('id', interventionId);

    if (error) throw error;

    if (technicianId) {
      recordInterventionStatusChange(interventionId, 'assigned');
    }

    console.log(`Intervention ${interventionId} scheduled for ${scheduledAt}`);
  }

  async getInProgressInterventionForTechnician(technicianId: string): Promise<Intervention | null> {
    const { data, error } = await supabase
      .from('interventions')
      .select('*')
      .eq('technician_id', technicianId)
      .eq('suspended', false)
      .in('status', ['assigned', 'on_route', 'arrived', 'in_progress'])
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return data ? this.mapToIntervention(data as unknown as DbIntervention) : null;
  }

  async getNewInterventionNotDeclinedByTechnician(technicianId: string): Promise<InterventionTechDashboardView[]> {

    // Step 2: Fetch the skills of the technician to filter interventions by category
    const { data: skillsData, error: sError} = await supabase
        .from('partner_applications')
        .select('skills')
        .eq('user_id', technicianId);

    if (sError) {
      console.error('Error fetching technician skills:', sError);
      throw sError;
    }

    const skills = (skillsData?.[0]?.skills as string[]) || [];

    // Step 2: fetch new interventions that match the technician's skills (categories)
    const { data : interventions, error: iError } = await supabase
      .from('interventions')
      .select('id, title, category, status, city, created_at, final_price, estimated_price, tracking_code, latitude, longitude, address, postal_code, description')
      .eq('status', 'new')
      .in('category', skills)

    if (iError) {
      console.error('Error fetching interventions:', iError);
      throw iError;
    }

    const interventionIds = (interventions ?? []).map(i => i.id);

    // Step 3: Fetch declined interventions for the technician among the new interventions
    const { data : declinedData, error: dError } = await supabase
        .from('dispatch_attempts')
        .select('intervention_id')
        .eq('technician_id', technicianId)
        .in('status', ['cancelled', 'rejected'])
        .in('intervention_id', interventionIds);

    if (dError) {
      console.error('Error fetching decline interventions:', dError);
      throw dError;
    }

    const declinedIds = (declinedData ?? []).map(d => d.intervention_id);

    // Exclude declined interventions if any exist
    const interventionsWithoutDeclined = (interventions ?? []).filter(i => !declinedIds.includes(i.id));

    return (interventionsWithoutDeclined ?? []).map(i => ({
      id: i.id,
      title: i.title,
      category: i.category,
      status: i.status,
      city: i.city,
      createdAt: i.created_at,
      finalPrice: i.final_price,
      estimatedPrice: i.estimated_price,
      trackingCode: i.tracking_code,
      latitude: i.latitude,
      longitude: i.longitude,
      address: i.address,
      postalCode: i.postal_code,
      description: i.description,
      clientPhone: null, // Not fetched in this query
    } as InterventionTechDashboardView));
  }

  // ============================================================
  // ✅ HELPERS OPTIMISÉS - Implémentation des interfaces
  // ============================================================

  /**
   * Geo-filtering pour DashboardTechnician
   * Retourne SEULEMENT: id, status, createdAt, latitude, longitude
   * 📉 Réduction: 1,02 Mo → 0,05 Mo (-95%)
   */
  async getInterventionsForGeoFilter(filters: {
    status?: InterventionStatus | InterventionStatus[];
    technicianId?: string;
    page?: number;
    size?: number;
  }): Promise<InterventionGeoView[]> {
    let query = supabase
      .from('interventions')
      .select(INTERVENTION_SELECT_FIELDS.GEO_FILTER);

    // Appliquer les filtres
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.technicianId) {
      query = query.eq('technician_id', filters.technicianId);
    }

    // Pagination
    if (filters.page !== undefined && filters.size !== undefined) {
      const start = filters.page * filters.size;
      query = query.range(start, start + filters.size - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    // ✅ Mapper les résultats à l'interface propre
    return (data || []).map(row => ({
      id: row.id,
      status: row.status as InterventionStatus,
      createdAt: row.created_at,
      latitude: row.latitude,
      longitude: row.longitude,
     }));
   }

   /**
    * Dashboard technician pour LeftSectionTech + affichage UI
    * Retourne: id, status, createdAt, latitude, longitude, title, category, city, postalCode, estimatedPrice, address, clientPhone
    * 📉 Réduction: 1,02 Mo → 0,2 Mo (-80%)
    * ✨ Contient tous les champs nécessaires pour affichage UI + geo-filtering
    */
   async getInterventionsForTechDashboard(filters: {
     status?: InterventionStatus | InterventionStatus[];
     technicianId?: string;
     page?: number;
     size?: number;
   }): Promise<InterventionTechDashboardView[]> {
     let query = supabase
       .from('interventions')
       .select(INTERVENTION_SELECT_FIELDS.TECH_DASHBOARD);

     // Appliquer les filtres
     if (filters.status) {
       if (Array.isArray(filters.status)) {
         query = query.in('status', filters.status);
       } else {
         query = query.eq('status', filters.status);
       }
     }

     if (filters.technicianId) {
       query = query.eq('technician_id', filters.technicianId);
     }

     // Tri par défaut
     query = query.order('created_at', { ascending: false });

     // Pagination
     if (filters.page !== undefined && filters.size !== undefined) {
       const start = filters.page * filters.size;
       query = query.range(start, start + filters.size - 1);
     }

     const { data, error } = await query;
     if (error) throw error;

     // ✅ Mapper les résultats à l'interface propre
     return (data || []).map(row => ({
       id: row.id,
       status: row.status as InterventionStatus,
       createdAt: row.created_at,
       latitude: row.latitude,
       longitude: row.longitude,
       title: row.title,
       category: row.category as InterventionCategory,
       city: row.city,
        postalCode: row.postal_code,
        estimatedPrice: row.estimated_price,
        address: row.address,
        clientPhone: row.client_phone,
        trackingCode: row.tracking_code,
        description: row.description,
      }));
    }

    /**
     * Dashboard technician pour InterventionTech (HeaderTechnician + InterventionTable)
     * Retourne: id, title, category, status, city, createdAt, finalPrice, estimatedPrice, trackingCode
     * 📉 Réduction: 1,02 Mo → 0,2 Mo (-80%)
     * ✨ UNE SEULE REQUÊTE pour deux composants enfants
     */
    async getInterventionsForTechnicianView(filters: {
      technicianId?: string;
      page?: number;
      size?: number;
    }): Promise<InterventionTechnicianView[]> {
      let query = supabase
        .from('interventions')
        .select(INTERVENTION_SELECT_FIELDS.TECHNICIAN_VIEW);

      // Filtre technician si fourni
      if (filters.technicianId) {
        query = query.eq('technician_id', filters.technicianId);
      }

      // Tri par défaut
      query = query.order('created_at', { ascending: false });

      // Pagination optionnelle
      if (filters.page !== undefined && filters.size !== undefined) {
        const start = filters.page * filters.size;
        query = query.range(start, start + filters.size - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      // ✅ Mapper les résultats à l'interface propre
      return (data || []).map(row => ({
        id: row.id,
        title: row.title,
        category: row.category as InterventionCategory,
        status: row.status as InterventionStatus,
        city: row.city,
        createdAt: row.created_at,
        finalPrice: row.final_price,
        estimatedPrice: row.estimated_price,
        trackingCode: row.tracking_code,
        technicianId: row.technician_id,
        description: row.description,
      }));
    }

    /**
     * Admin list pour AdminInterventionsPage
     * Retourne: id, title, category, address, city, postalCode, clientId, technicianId, status, createdAt
     * 📉 Réduction: 1,02 Mo → 0,2 Mo (-80%)
     */
   async getInterventionsForAdmin(filters: {
     status?: InterventionStatus;
     category?: InterventionCategory;
     search?: string;
     page?: number;
     size?: number;
   }): Promise<PaginatedResponse<InterventionAdminView>> {
     let query = supabase
       .from('interventions')
       .select(INTERVENTION_SELECT_FIELDS.ADMIN_LIST, { count: 'exact' });

     // Filtres
     if (filters.status) {
       query = query.eq('status', filters.status);
     }

     if (filters.category) {
       query = query.eq('category', filters.category);
     }

     // ✨ NOUVEAU: Recherche multi-champs insensible à la casse
     // Cherche sur: title, address, tracking_code
     if (filters.search?.trim()) {
       const searchTerm = filters.search.toLowerCase().trim();
       query = query.or(
         `title.ilike.%${searchTerm}%,` +
         `address.ilike.%${searchTerm}%,` +
         `tracking_code.ilike.%${searchTerm}%`
       );
     }

     // Tri par défaut
     query = query.order('created_at', { ascending: false });

     // Pagination
     const page = filters.page || 0;
     const size = filters.size || 20;
     const start = page * size;
     query = query.range(start, start + size - 1);

     const { data, error, count } = await query;
     if (error) throw error;

     // ✅ Mapper les résultats + paginer
     const content = (data || []).map(row =>
       mapAdminInterventionRow(row as unknown as AdminInterventionRow)
     );

     return {
       content,
       page,
       size,
       totalElements: count || 0,
       totalPages: size ? Math.ceil((count || 0) / size) : 1,
     };
   }

  /**
   * Client history pour ClientInterventionsPage
   * Retourne: id, title, category, status, priority, city, createdAt
   * 📉 Réduction: 1,02 Mo → 0,08 Mo (-92%)
   */
  async getInterventionsForClient(filters: {
    clientId: string;
    status?: InterventionStatus;
    page?: number;
    size?: number;
  }): Promise<InterventionClientView[]> {
    let query = supabase
      .from('interventions')
      .select(INTERVENTION_SELECT_FIELDS.CLIENT_HISTORY);

    // Filtres obligatoires
    query = query.eq('client_id', filters.clientId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Tri par défaut: plus récent d'abord
    query = query.order('created_at', { ascending: false });

    // Pagination
    if (filters.page !== undefined && filters.size !== undefined) {
      const start = filters.page * filters.size;
      query = query.range(start, start + filters.size - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

     // ✅ Mapper les résultats
     return (data || []).map(row => ({
       id: row.id,
       title: row.title,
       category: row.category as InterventionCategory,
       status: row.status as InterventionStatus,
       priority: row.priority as any, // InterventionPriority from DB
       city: row.city,
       createdAt: row.created_at,
     }));
  }

  /**
   * Stats pour AdminDashboard
   * Retourne: id, status, createdAt, category
   * 📉 Réduction: 1,02 Mo → 0,03 Mo (-97%)
   */
  async getInterventionsForStats(): Promise<InterventionStatsView[]> {
    const { data, error } = await supabase
      .from('interventions')
      .select(INTERVENTION_SELECT_FIELDS.STATS);

    if (error) throw error;

    // ✅ Mapper les résultats
    return (data || []).map(row => ({
      id: row.id,
      status: row.status as InterventionStatus,
      createdAt: row.created_at,
      category: row.category as InterventionCategory,
    }));
  }

  async getInterventionByTrackingCode(trackingCode: string): Promise<Intervention | null> {
    const { data, error } = await supabase
      .from('interventions')
      .select('id, tracking_code, title, category, status, city, created_at, *')
      .eq('tracking_code', trackingCode)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapToIntervention(data as unknown as DbIntervention);
  }

  async getInterventionQuoteDetails(interventionId: string): Promise<{
    quotes: Array<{ label: string; calculated_price: number }>;
    modifications: Array<{ total_additional_amount: number }>;
  }> {
    const [quotesRes, modsRes] = await Promise.all([
      supabase
        .from('intervention_quotes')
        .select('label, calculated_price')
        .eq('intervention_id', interventionId)
        .order('display_order'),
      supabase
        .from('quote_modifications')
        .select('total_additional_amount')
        .eq('intervention_id', interventionId)
        .eq('status', 'approved'),
    ]);

    if (quotesRes.error) throw quotesRes.error;
    if (modsRes.error) throw modsRes.error;

    return {
      quotes: quotesRes.data || [],
      modifications: modsRes.data || [],
    };
  }

  async getInterventionStatusHistory(interventionId: string): Promise<InterventionStatusHistoryEntry[]> {
    const { data, error } = await supabase
      .from('intervention_history_status')
      .select('id, intervention_id, status, changed_at')
      .eq('intervention_id', interventionId)
      .order('changed_at', { ascending: false });

    if (error) throw error;

    return ((data || []) as Array<{
      id: string;
      intervention_id: string;
      status: string;
      changed_at: string;
    }>).map(row => ({
      id: row.id,
      interventionId: row.intervention_id,
      status: row.status,
      changedAt: row.changed_at,
    }));
  }

  private mapToIntervention(data: DbIntervention): Intervention {
    const b2bPartner = (data as unknown as {
      b2b_partners?: {
        contact_firstname?: string | null;
        contact_lastname?: string | null;
        company_name?: string | null;
      } | null;
    }).b2b_partners ?? null;
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
      // Suspension (V43)
      suspended: (data as any).suspended ?? false,
      suspendedAt: (data as any).suspended_at,
      suspendedBy: (data as any).suspended_by,
      suspensionReason: (data as any).suspension_reason,
      expectedCompletionDate: (data as any).expected_completion_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      trackingCode: data.tracking_code,
      clientEmail: data.client_email,
      clientPhone: data.client_phone,
      quoteSignedAt: (data as any).quote_signed_at,
      quoteSignatureData: (data as any).quote_signature_data,
      quoteSignatureId: data.quote_signature_id,
      questionnaireResultatId: data.questionnaire_resultat_id,
      questionnaireAnswers: data.questionnaire_answers,
      prixMin: data.prix_min,
      prixMax: data.prix_max,
      invoiceSignatureData: data.invoice_signature_data,
      invoiceSignedAt: data.invoice_signed_at,
      invoiceSignatureId: data.invoice_signature_id,
      // Escalade (V38)
      parentInterventionId: data.parent_id_intervention,
      escalationType: data.escalation_type,
      billingMode: data.billing_mode,
      serviceStarted: data.service_started,
      customerConsent: data.customer_consent,
      escalationReason: data.escalation_reason,
      escalationNotes: data.escalation_notes,
      escalationRequestedAt: data.escalation_requested_at,
      escalationCompletedAt: data.escalation_completed_at,
      escalationConsentSignatureData: data.escalation_consent_signature_data,
      escalationConsentSignedAt: data.escalation_consent_signed_at,
      escalationConsentSignatureId: data.escalation_consent_signature_id,
      // B2B (V39)
      billingType: data.billing_type,
      b2bPartnerId: data.b2b_partner_id,
      b2bInvoiceId: data.b2b_invoice_id,
      clientFirstName: data.client_first_name,
      clientLastName: data.client_last_name,
      b2bOrderReference: data.b2b_order_reference,
      b2bPriceCap: (data as unknown as { b2b_price_cap?: number | null }).b2b_price_cap ?? null,
      b2bContactFirstName: b2bPartner?.contact_firstname ?? null,
      b2bContactLastName: b2bPartner?.contact_lastname ?? null,
      b2bCompanyName: b2bPartner?.company_name ?? null,
    };
  }

   async deleteIntervention(interventionId: string): Promise<void> {
     // First, check if the intervention exists and get its status
     const { data: intervention, error: fetchError } = await supabase
       .from('interventions')
       .select('status')
       .eq('id', interventionId)
       .single();

     if (fetchError) throw new Error('Intervention not found');
     if (!intervention) throw new Error('Intervention not found');

     // Prevent deletion of completed and cancelled interventions
     if (intervention.status === 'completed' || intervention.status === 'cancelled') {
       throw new Error(`Cannot delete a ${intervention.status} intervention`);
     }

     // Delete the intervention
     const { error: deleteError } = await supabase
       .from('interventions')
       .delete()
       .eq('id', interventionId);

     if (deleteError) throw deleteError;
   }

   async getQuoteSignature(interventionId: string): Promise<InterventionQuoteSignature> {
     const { data, error } = await supabase
       .from('interventions')
       .select('id, quote_signature_data, quote_signed_at')
       .eq('id', interventionId)
       .maybeSingle();

     if (error) throw error;
     if (!data) throw new Error('Intervention not found');

     return {
       id: data.id,
       quoteSignatureData: data.quote_signature_data || '',
       quoteSignedAt: data.quote_signed_at || '',
     };
   }

  async getInvoiceSignature(interventionId: string): Promise<InterventionInvoiceSignature> {
      const { data, error } = await supabase
        .from('interventions')
        .select('id, invoice_signature_data, invoice_signed_at')
        .eq('id', interventionId)
        .maybeSingle();

      if (error) throw error;
      const row = data as unknown as { id: string; invoice_signature_data: string | null; invoice_signed_at: string | null } | null;
      if (!row) throw new Error('Intervention not found');

      return {
        id: row.id,
        invoiceSignatureData: row.invoice_signature_data || '',
        invoiceSignedAt: row.invoice_signed_at || '',
      };
    }

    async suspendIntervention(interventionId: string, data: { reason: string; expectedCompletionDate: string }): Promise<void> {
      // Règles de domaine alignées sur le gateway (InterventionSuspensionService).
      const reason = (data.reason ?? '').trim();
      if (reason.length < 10 || reason.length > 500) {
        throw new Error('Le motif doit contenir entre 10 et 500 caractères.');
      }
      const expected = new Date(data.expectedCompletionDate);
      const min = new Date();
      min.setHours(0, 0, 0, 0);
      min.setDate(min.getDate() + 1); // demain
      const max = new Date();
      max.setHours(0, 0, 0, 0);
      max.setDate(max.getDate() + 90);
      if (Number.isNaN(expected.getTime()) || expected < min || expected > max) {
        throw new Error('La date prévue doit être comprise entre demain et 90 jours.');
      }

      const { data: current, error: getError } = await supabase
        .from('interventions')
        .select('status, suspended')
        .eq('id', interventionId)
        .single();
      if (getError) throw getError;
      const currentRow = current as { status?: string; suspended?: boolean } | null;
      const SUSPENDABLE = ['assigned', 'on_route', 'arrived', 'in_progress'];
      if (!currentRow?.status || !SUSPENDABLE.includes(currentRow.status)) {
        throw new Error("Seule une intervention en cours d'exécution peut être suspendue.");
      }
      if (currentRow.suspended === true) {
        throw new Error("L'intervention est déjà suspendue.");
      }

      // Le statut métier est CONSERVÉ ; on positionne uniquement le booléen `suspended`.
      const { error } = await supabase
        .from('interventions')
        .update({
          suspended: true,
          suspension_reason: reason,
          expected_completion_date: data.expectedCompletionDate,
          suspended_at: new Date().toISOString(),
        } as never)
        .eq('id', interventionId);
      if (error) throw error;
      // Rappels de reprise J-3/J-2/J-1 + échéance (best-effort, mode Supabase direct)
      supabase.functions
        .invoke('schedule-suspension-reminders', {
          body: { action: 'schedule', interventionId, expectedCompletionDate: data.expectedCompletionDate },
        })
        .catch((e) => console.error('schedule-suspension-reminders failed:', e));
    }

    async resumeIntervention(interventionId: string): Promise<void> {
      const { data: current, error: getError } = await supabase
        .from('interventions')
        .select('suspended, technician_id')
        .eq('id', interventionId)
        .single();
      if (getError) throw getError;
      const row = current as { suspended?: boolean; technician_id?: string | null } | null;
      if (row?.suspended !== true) {
        throw new Error('Seule une intervention suspendue peut être reprise.');
      }
      // Garde : le technicien ne doit pas avoir une AUTRE intervention bloquante (non suspendue).
      if (row.technician_id) {
        const { data: busy } = await supabase
          .from('interventions')
          .select('id')
          .eq('technician_id', row.technician_id)
          .eq('suspended', false)
          .in('status', ['assigned', 'on_route', 'arrived', 'in_progress'])
          .neq('id', interventionId)
          .limit(1);
        if (busy && busy.length > 0) {
          throw new Error("Le technicien a déjà une autre intervention active.");
        }
      }

      // Le statut métier est conservé ; on lève uniquement le booléen `suspended`.
      const { error } = await supabase
        .from('interventions')
        .update({ suspended: false } as never)
        .eq('id', interventionId);
      if (error) throw error;
      // Annule les rappels de suspension (best-effort)
      supabase.functions
        .invoke('schedule-suspension-reminders', { body: { action: 'cancel', interventionId } })
        .catch((e) => console.error('cancel-suspension-reminders failed:', e));
    }

    async getSuspendedInterventionsForTechnician(technicianId: string): Promise<Intervention[]> {
      const { data, error } = await supabase
        .from('interventions')
        .select('*')
        .eq('technician_id', technicianId)
        .eq('suspended', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Intervention[];
    }
  }

  export const interventionsService = new SupabaseInterventionsService();
