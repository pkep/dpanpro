/**
 * Escalations Service Interface
 * Escalade (« climb ») d'une intervention vers un autre prestataire :
 *  - interne : intervention enfant Dépann.Pro (complete_climbed) ;
 *  - externe : prestataire non affilié suivi par le support
 *    (complete_climbed_external + ligne external_escalations) ;
 *  - refus client : cancelled_escalation_declined.
 */
import type { InterventionCategory, InterventionStatus } from '@/types/intervention.types';

export type EscalationMode = 'internal' | 'external';
export type EscalationType = 'internal' | 'external';
export type EscalationBillingMode = 'call_out_fee' | 'full_service';
export type ExternalEscalationStatus =
  | 'to_contact'
  | 'contacted'
  | 'scheduled'
  | 'performed'
  | 'cancelled';

export interface EscalationRequestInput {
  interventionId: string;
  /** L'intervention a-t-elle déjà commencé ? (détermine billing_mode) */
  serviceStarted: boolean;
  reason?: string;
  notes?: string;
  photos?: string[];
  customerConsent: boolean;
  /** Signature base64 du consentement client, capturée dans le formulaire. */
  signatureData?: string;
  /** Réf. de signature (SIG-<uuid>) du consentement client. */
  signatureId?: string;
  prestationName?: string;
  category?: InterventionCategory;
}

export interface EscalationClimbInput {
  interventionId: string;
  mode: EscalationMode;
  category?: InterventionCategory;
  prestationName?: string;
  technicianInformation?: string;
  targetTechnicianId?: string | null;
  signatureData?: string;
}

export interface EscalationDeclineInput {
  interventionId: string;
  reason?: string;
}

export interface ExternalEscalation {
  id: string;
  interventionId: string;
  category: InterventionCategory | null;
  technicianInformation: string | null;
  companyName: string | null;
  technicianLastName: string | null;
  technicianFirstName: string | null;
  technicianPhone: string | null;
  timeUntilService: string | null;
  price: number | null;
  rating: number | null;
  status: ExternalEscalationStatus;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalEscalationPatch {
  companyName?: string;
  technicianLastName?: string;
  technicianFirstName?: string;
  technicianPhone?: string;
  timeUntilService?: string;
  price?: number;
  rating?: number;
  status?: ExternalEscalationStatus;
  notes?: string;
}

export interface EscalationState {
  interventionId: string;
  status: InterventionStatus;
  parentInterventionId: string | null;
  childInterventionId: string | null;
  escalationType: EscalationType | null;
  billingMode: EscalationBillingMode | null;
  serviceStarted: boolean | null;
  customerConsent: boolean | null;
  escalationReason: string | null;
  escalationNotes: string | null;
  escalationConsentSignedAt: string | null;
  externalEscalation: ExternalEscalation | null;
}

export interface IEscalationsService {
  /** Enregistre le formulaire d'escalade (qualification + consentement signé). */
  requestEscalation(input: EscalationRequestInput): Promise<EscalationState>;

  /** Finalise l'escalade (interne ou externe) après paiement confirmé. */
  climb(input: EscalationClimbInput): Promise<EscalationState>;

  /** Refus client → clôture (cancelled_escalation_declined). */
  decline(input: EscalationDeclineInput): Promise<EscalationState>;

  /** État complet de l'escalade d'une intervention. */
  getState(interventionId: string): Promise<EscalationState | null>;

  /** Liste des escalades externes (admin/support). */
  listExternal(status?: ExternalEscalationStatus): Promise<ExternalEscalation[]>;

  /** Édition d'une escalade externe (support). */
  updateExternal(id: string, patch: ExternalEscalationPatch): Promise<ExternalEscalation>;
}
