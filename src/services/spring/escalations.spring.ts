import { springHttp } from './http-client';
import type {
  IEscalationsService,
  EscalationRequestInput,
  EscalationClimbInput,
  EscalationDeclineInput,
  EscalationState,
  ManualEscalationInput,
  ManualEscalationResult,
  ExternalEscalation,
  ExternalEscalationPatch,
  ExternalEscalationStatus,
} from '@/services/interfaces/escalations.interface';
import type { InterventionStatus } from '@/types/intervention.types';

interface SpringEscalationState {
  intervention: { id: string; status: InterventionStatus };
  parentInterventionId: string | null;
  childInterventionId: string | null;
  escalationType: 'internal' | 'external' | null;
  billingMode: 'call_out_fee' | 'full_service' | null;
  serviceStarted: boolean | null;
  customerConsent: boolean | null;
  escalationReason: string | null;
  escalationNotes: string | null;
  escalationConsentSignedAt: string | null;
  externalEscalation: ExternalEscalation | null;
}

const mapState = (res: SpringEscalationState, interventionId: string): EscalationState => ({
  interventionId,
  status: res.intervention?.status,
  parentInterventionId: res.parentInterventionId,
  childInterventionId: res.childInterventionId,
  escalationType: res.escalationType,
  billingMode: res.billingMode,
  serviceStarted: res.serviceStarted,
  customerConsent: res.customerConsent,
  escalationReason: res.escalationReason,
  escalationNotes: res.escalationNotes,
  escalationConsentSignedAt: res.escalationConsentSignedAt,
  externalEscalation: res.externalEscalation,
});

export class SpringEscalationsService implements IEscalationsService {
  async requestEscalation(input: EscalationRequestInput): Promise<EscalationState> {
    const res = await springHttp.post<SpringEscalationState>(
      `/interventions/${input.interventionId}/escalate`,
      {
        serviceStarted: input.serviceStarted,
        reason: input.reason,
        notes: input.notes,
        photos: input.photos,
        customerConsent: input.customerConsent,
        signatureData: input.signatureData,
        signatureId: input.signatureId,
        prestationName: input.prestationName,
        category: input.category,
      }
    );
    return mapState(res, input.interventionId);
  }

  async climb(input: EscalationClimbInput): Promise<EscalationState> {
    const res = await springHttp.post<SpringEscalationState>(
      `/interventions/${input.interventionId}/escalation/climb`,
      {
        mode: input.mode,
        category: input.category,
        prestationName: input.prestationName,
        technicianInformation: input.technicianInformation,
        targetTechnicianId: input.targetTechnicianId,
        signatureData: input.signatureData,
      }
    );
    return mapState(res, input.interventionId);
  }

  async escalateManually(input: ManualEscalationInput): Promise<ManualEscalationResult> {
    return springHttp.post<ManualEscalationResult>(
      `/interventions/${input.interventionId}/escalation/manual`,
      { mode: input.mode, category: input.category }
    );
  }

  async decline(input: EscalationDeclineInput): Promise<EscalationState> {
    const res = await springHttp.post<SpringEscalationState>(
      `/interventions/${input.interventionId}/escalation/decline`,
      { reason: input.reason }
    );
    return mapState(res, input.interventionId);
  }

  async getState(interventionId: string): Promise<EscalationState | null> {
    const res = await springHttp.get<SpringEscalationState>(
      `/interventions/${interventionId}/escalation`
    );
    return mapState(res, interventionId);
  }

  async listExternal(status?: ExternalEscalationStatus): Promise<ExternalEscalation[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    return springHttp.get<ExternalEscalation[]>('/admin/escalations', params);
  }

  async updateExternal(id: string, patch: ExternalEscalationPatch): Promise<ExternalEscalation> {
    return springHttp.patch<ExternalEscalation>(`/admin/escalations/${id}`, patch);
  }
}
