import type { IPaymentService, ManualPaymentMethod } from '@/services/interfaces/payment.interface';
import type { PaymentAuthorization, PaymentRow } from '@/types/service.types';
import { springHttp } from './http-client';

function mapAuthorization(raw: any): PaymentAuthorization {
  return {
    id:                    raw.id,
    interventionId:        raw.interventionId    ?? raw.intervention_id    ?? undefined,
    amount:                Number(raw.amountAuthorized ?? raw.amount_authorized ?? raw.amount ?? 0),
    currency:              raw.currency          ?? 'eur',
    status:                raw.status,
    stripePaymentIntentId: raw.providerPaymentId ?? raw.provider_payment_id ?? undefined,
    clientEmail:           raw.clientEmail       ?? raw.client_email        ?? undefined,
    clientPhone:           raw.clientPhone       ?? raw.client_phone        ?? undefined,
    checkoutUrl:           raw.checkoutUrl       ?? undefined,
    capturedAt:            raw.capturedAt        ?? raw.captured_at         ?? undefined,
    cancelledAt:           raw.cancelledAt       ?? raw.cancelled_at        ?? undefined,
    createdAt:             raw.createdAt         ?? raw.created_at,
    updatedAt:             raw.updatedAt         ?? raw.updated_at,
    metadata:              raw.metadata          ?? {},
  };
}

function mapPaymentRow(raw: any): PaymentRow {
  return {
    id:                  raw.id,
    interventionId:      raw.interventionId      ?? raw.intervention_id      ?? null,
    amountAuthorized:    Number(raw.amountAuthorized ?? raw.amount_authorized ?? 0),
    currency:            raw.currency            ?? 'EUR',
    status:              raw.status,
    clientEmail:         raw.clientEmail         ?? raw.client_email         ?? null,
    providerPaymentId:   raw.providerPaymentId   ?? raw.provider_payment_id  ?? null,
    createdAt:           raw.createdAt           ?? raw.created_at,
    capturedAt:          raw.capturedAt          ?? raw.captured_at          ?? null,
    cancelledAt:         raw.cancelledAt         ?? raw.cancelled_at         ?? null,
    interventionTitle:   raw.interventionTitle   ?? raw.intervention?.title,
    interventionAddress: raw.interventionAddress ?? raw.intervention?.address,
    interventionCity:    raw.interventionCity    ?? raw.intervention?.city,
    interventionStatus:  raw.interventionStatus  ?? raw.intervention?.status,
    clientName:          raw.clientName          ?? raw.client?.name ?? raw.clientEmail ?? '—',
    isCancellationFee:   raw.isCancellationFee   ?? false,
  };
}

export class SpringPaymentService implements IPaymentService {

  // POST /payments/create-intent
  async createPaymentIntent(params: {
    interventionId: string | null;
    amount: number;
    currency?: string;
    clientEmail: string;
    clientPhone?: string;
  }): Promise<{ id: string; clientSecret: string }> {
    return springHttp.post('/payments/create-intent', {
      interventionId: params.interventionId,
      amount:         params.amount,
      currency:       params.currency || 'eur',
      clientEmail:    params.clientEmail,
      clientPhone:    params.clientPhone || null,
    });
  }

  // POST /payments/create-authorization
  // Creates a Stripe Checkout Session with capture_method: manual (redirect-based flow)
  // Distinct from createPaymentIntent which creates an inline PaymentIntent (card form)
  async createAuthorizationRequest(params: {
    interventionId: string;
    amount: number;
    currency?: string;
    clientEmail: string;
    clientPhone?: string;
  }): Promise<{ id: string; checkoutUrl?: string }> {
    return springHttp.post('/payments/create-authorization', {
      interventionId: params.interventionId,
      amount:         params.amount,
      currency:       params.currency || 'eur',
      clientEmail:    params.clientEmail,
      clientPhone:    params.clientPhone || null,
    });
  }

  // PATCH /payments/{id}/status
  async updateAuthorizationStatus(
      authorizationId: string,
      status: 'pending' | 'authorized' | 'captured' | 'cancelled' | 'failed'
  ): Promise<void> {
    await springHttp.patch(`/payments/${authorizationId}/status`, { status });
  }

  // PATCH /payments/{id}/link-intervention
  async linkAuthorizationToIntervention(
      authorizationId: string,
      interventionId: string
  ): Promise<void> {
    await springHttp.patch(`/payments/${authorizationId}/link-intervention`, { interventionId });
  }

   // GET /payments/by-intervention/{interventionId}
   async getAuthorizationByIntervention(
       interventionId: string
   ): Promise<PaymentAuthorization | null> {
     try {
       const raw = await springHttp.get(`/payments/by-intervention/${interventionId}`);
       return raw ? mapAuthorization(raw) : null;
     } catch {
       return null;
     }
   }

   // POST /payments/by-interventions (batch query with optional status filter)
   async getAuthorizationsByInterventions(
       interventionIds: string[],
       statuses?: string[]
   ): Promise<PaymentAuthorization[]> {
     try {
       const raw: any[] = await springHttp.post('/payments/by-interventions', {
         interventionIds,
         statuses: statuses || undefined,
       });
       return (raw || []).map(mapAuthorization);
     } catch {
       return [];
     }
   }

  // GET /payments/{id}
  async getAuthorization(id: string): Promise<PaymentAuthorization | null> {
    try {
      const raw = await springHttp.get(`/payments/${id}`);
      return raw ? mapAuthorization(raw) : null;
    } catch {
      return null;
    }
  }

  // GET /payments/admin
  async getPaymentsList(): Promise<PaymentRow[]> {
    const raw: any[] = await springHttp.get('/payments/admin');
    return (raw || []).map(mapPaymentRow);
  }

  // POST /payments/capture
  async capturePayment(intervention_id: string, amount: number): Promise<void> {
    await springHttp.post('/payments/capture', {
      interventionId: intervention_id,
      amountCents:    Math.round(amount * 100),
    });
  }

  // POST /payments/manual — paiement encaissé hors Stripe (admin/manager)
  async recordManualPayment(params: {
    interventionId: string;
    amount: number;
    method: ManualPaymentMethod;
    clientEmail?: string;
    clientPhone?: string;
    recordedBy?: string;
    reference?: string;
  }): Promise<{ id: string }> {
    const response = await springHttp.post<{ id?: string }>('/payments/manual', {
      interventionId: params.interventionId,
      amount:         params.amount,
      method:         params.method,
      clientEmail:    params.clientEmail ?? null,
      clientPhone:    params.clientPhone ?? null,
      recordedBy:     params.recordedBy ?? null,
      reference:      params.reference ?? null,
    });
    if (!response?.id) throw new Error('Identifiant du paiement manuel manquant');
    return { id: response.id };
  }

  // DELETE /payments/manual/{id} — rollback du dialog de finalisation
  async deleteManualPayment(paymentId: string): Promise<void> {
    await springHttp.delete(`/payments/manual/${paymentId}`);
  }

  // POST /payments/refund
  async refundPayment(
      interventionId: string,
      refundType: 'full' | 'partial',
      refundAmount?: number
  ): Promise<{ amount: number }> {
    const response = await springHttp.post<{ amount: number }>('/payments/refund', {
      interventionId,
      refundType,
      refundAmount: refundType === 'partial' ? refundAmount : undefined,
    });
    return response;
  }
}