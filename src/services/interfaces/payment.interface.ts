import type { PaymentAuthorization, PaymentRow } from '@/types/service.types';
export type { PaymentAuthorization, PaymentRow };

/** Mode d'encaissement manuel saisi par un admin/manager. */
export type ManualPaymentMethod = 'partner_link' | 'bank_transfer';

/** Prestataire de paiement supporté. */
export type PaymentProvider = 'stripe' | 'manual';

/** Paramètres d'une demande d'autorisation de paiement. */
export interface AuthorizationParams {
  interventionId: string;
  amount: number;
  currency?: string;
  clientEmail: string;
  clientPhone?: string;
}

/** Résultat d'une demande d'autorisation. */
export interface AuthorizationResult {
  id: string;
  checkoutUrl?: string;
  status: 'pending' | 'authorized' | 'captured' | 'cancelled' | 'failed';
}

/** Résultat d'une capture (encaissement) de paiement. */
export interface CaptureResult {
  id: string;
  amount: number;
  status: 'captured' | 'failed';
}

// ── Database Row Shapes ──
export interface DbPaymentAuthorization {
  id: string;
  intervention_id: string | null;
  payment_provider: string;
  provider_payment_id: string | null;
  provider_customer_id: string | null;
  amount_authorized: number;
  currency: string;
  status: string;
  client_email: string | null;
  client_phone: string | null;
  authorization_requested_at: string;
  authorization_confirmed_at: string | null;
  captured_at: string | null;
  cancelled_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Service Interface ──
export interface IPaymentService {
  createPaymentIntent(params: {
    interventionId: string | null;
    amount: number;
    currency?: string;
    clientEmail: string;
    clientPhone?: string;
  }): Promise<{ id: string; clientSecret: string }>;
  createAuthorizationRequest(params: {
    interventionId: string;
    amount: number;
    currency?: string;
    clientEmail: string;
    clientPhone?: string;
  }): Promise<{ id: string; checkoutUrl?: string }>;
  updateAuthorizationStatus(
      authorizationId: string,
      status: 'pending' | 'authorized' | 'captured' | 'cancelled' | 'failed'
  ): Promise<void>;
  linkAuthorizationToIntervention(authorizationId: string, interventionId: string): Promise<void>;
  getAuthorizationByIntervention(interventionId: string): Promise<PaymentAuthorization | null>;
  getAuthorizationsByInterventions(
      interventionIds: string[],
      statuses?: string[]
  ): Promise<PaymentAuthorization[]>;
  getAuthorization(id: string): Promise<PaymentAuthorization | null>;
  // Admin payment management
  getPaymentsList(): Promise<PaymentRow[]>;
  capturePayment(interventionId: string, amount: number): Promise<void>;
  refundPayment(interventionId: string, refundType: 'full' | 'partial', refundAmount?: number): Promise<{ amount: number }>;
  /**
   * Enregistre un paiement déjà encaissé hors Stripe (lien de paiement
   * partenaire ou virement). La ligne est créée au statut `captured`.
   * Retourne l'id de la ligne pour permettre un rollback.
   */
  recordManualPayment(params: {
    interventionId: string;
    amount: number;
    method: ManualPaymentMethod;
    clientEmail?: string;
    clientPhone?: string;
    recordedBy?: string;
    reference?: string;
  }): Promise<{ id: string }>;
  /** Supprime une ligne de paiement manuel créée pendant le dialog de finalisation. */
  deleteManualPayment(paymentId: string): Promise<void>;
}