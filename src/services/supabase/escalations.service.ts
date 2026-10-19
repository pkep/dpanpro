import { supabase } from '@/integrations/supabase/client';
import type {
  IEscalationsService,
  EscalationRequestInput,
  EscalationClimbInput,
  EscalationDeclineInput,
  EscalationState,
  ExternalEscalation,
  ExternalEscalationPatch,
  ExternalEscalationStatus,
} from '@/services/interfaces/escalations.interface';
import type { InterventionCategory, InterventionStatus } from '@/types/intervention.types';

interface DbInterventionRow {
  id: string;
  client_id: string;
  category: InterventionCategory;
  title: string;
  description: string | null;
  address: string;
  city: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  priority: string;
  status: InterventionStatus;
  client_email: string | null;
  client_phone: string | null;
  parent_id_intervention: string | null;
  escalation_type: 'internal' | 'external' | null;
  billing_mode: 'call_out_fee' | 'full_service' | null;
  service_started: boolean | null;
  customer_consent: boolean | null;
  escalation_reason: string | null;
  escalation_notes: string | null;
  escalation_consent_signed_at: string | null;
}

interface DbExternalEscalationRow {
  id: string;
  intervention_id: string;
  category: InterventionCategory | null;
  technician_information: string | null;
  company_name: string | null;
  technician_last_name: string | null;
  technician_first_name: string | null;
  technician_phone: string | null;
  time_until_service: string | null;
  price: number | null;
  rating: number | null;
  status: ExternalEscalationStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Table absente des types Supabase générés tant que la migration V38 n'est pas régénérée.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const mapExternal = (row: DbExternalEscalationRow): ExternalEscalation => ({
  id: row.id,
  interventionId: row.intervention_id,
  category: row.category,
  technicianInformation: row.technician_information,
  companyName: row.company_name,
  technicianLastName: row.technician_last_name,
  technicianFirstName: row.technician_first_name,
  technicianPhone: row.technician_phone,
  timeUntilService: row.time_until_service,
  price: row.price,
  rating: row.rating,
  status: row.status,
  notes: row.notes,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

class SupabaseEscalationsService implements IEscalationsService {
  private async currentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  }

  private async fetchIntervention(interventionId: string): Promise<DbInterventionRow> {
    const { data, error } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', interventionId)
      .single();
    if (error) throw error;
    return data as unknown as DbInterventionRow;
  }

  private async buildState(interventionId: string): Promise<EscalationState> {
    const intervention = await this.fetchIntervention(interventionId);
    const parent = intervention.parent_id_intervention
      ? await this.fetchIntervention(intervention.parent_id_intervention)
      : intervention;

    const { data: externalRows } = await db
      .from('external_escalations')
      .select('*')
      .eq('intervention_id', parent.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const external = externalRows && externalRows.length > 0
      ? mapExternal(externalRows[0] as unknown as DbExternalEscalationRow)
      : null;

    return {
      interventionId,
      status: intervention.status,
      parentInterventionId: intervention.parent_id_intervention ? parent.id : null,
      childInterventionId:
        parent.id !== intervention.id ? intervention.id : null,
      escalationType: parent.escalation_type,
      billingMode: parent.billing_mode,
      serviceStarted: parent.service_started,
      customerConsent: parent.customer_consent,
      escalationReason: parent.escalation_reason,
      escalationNotes: parent.escalation_notes,
      escalationConsentSignedAt: parent.escalation_consent_signed_at,
      externalEscalation: external,
    };
  }

  async requestEscalation(input: EscalationRequestInput): Promise<EscalationState> {
    const { error } = await supabase.functions.invoke('escalate-intervention', {
      body: {
        interventionId: input.interventionId,
        serviceStarted: input.serviceStarted,
        reason: input.reason ?? null,
        notes: input.notes ?? null,
        photos: input.photos ?? null,
        customerConsent: input.customerConsent,
        signatureData: input.signatureData ?? null,
        signatureId: input.signatureId ?? null,
        prestationName: input.prestationName ?? null,
        category: input.category ?? null,
      },
    });
    if (error) throw error;
    return this.buildState(input.interventionId);
  }

  async climb(input: EscalationClimbInput): Promise<EscalationState> {
    const { data, error } = await supabase.functions.invoke('climb-intervention', {
      body: {
        interventionId: input.interventionId,
        mode: input.mode,
        category: input.category ?? null,
        prestationName: input.prestationName ?? null,
        technicianInformation: input.technicianInformation ?? null,
        targetTechnicianId: input.targetTechnicianId ?? null,
        signatureData: input.signatureData ?? null,
        createdBy: await this.currentUserId(),
      },
    });
    if (error) throw error;

    const childId = (data as { childInterventionId?: string } | null)?.childInterventionId;
    return this.buildState(childId ?? input.interventionId);
  }

  async decline(input: EscalationDeclineInput): Promise<EscalationState> {
    const { error } = await supabase.functions.invoke('decline-escalation', {
      body: {
        interventionId: input.interventionId,
        reason: input.reason ?? null,
      },
    });
    if (error) throw error;
    return this.buildState(input.interventionId);
  }

  async getState(interventionId: string): Promise<EscalationState | null> {
    try {
      return await this.buildState(interventionId);
    } catch {
      return null;
    }
  }

  async listExternal(status?: ExternalEscalationStatus): Promise<ExternalEscalation[]> {
    let query = db
      .from('external_escalations')
      .select('*')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return ((data || []) as unknown as DbExternalEscalationRow[]).map(mapExternal);
  }

  async updateExternal(id: string, patch: ExternalEscalationPatch): Promise<ExternalEscalation> {
    const payload: Record<string, unknown> = {};
    if (patch.companyName !== undefined) payload.company_name = patch.companyName;
    if (patch.technicianLastName !== undefined) payload.technician_last_name = patch.technicianLastName;
    if (patch.technicianFirstName !== undefined) payload.technician_first_name = patch.technicianFirstName;
    if (patch.technicianPhone !== undefined) payload.technician_phone = patch.technicianPhone;
    if (patch.timeUntilService !== undefined) payload.time_until_service = patch.timeUntilService;
    if (patch.price !== undefined) payload.price = patch.price;
    if (patch.rating !== undefined) payload.rating = patch.rating;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.notes !== undefined) payload.notes = patch.notes;

    const { data, error } = await db
      .from('external_escalations')
      .update(payload as never)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapExternal(data as unknown as DbExternalEscalationRow);
  }
}

export const escalationsService = new SupabaseEscalationsService();
