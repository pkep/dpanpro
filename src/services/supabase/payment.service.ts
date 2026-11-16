import { supabase } from '@/integrations/supabase/client';
import type { IPaymentService, PaymentRow, DbPaymentAuthorization, ManualPaymentMethod } from '@/services/interfaces/payment.interface';
import type { PaymentAuthorization } from '@/types/service.types';


function mapToAuthorization(d: DbPaymentAuthorization): PaymentAuthorization {
  return {
    id:                       d.id,
    interventionId:           d.intervention_id ?? undefined,
    amount:                   Number(d.amount_authorized),
    currency:                 d.currency,
    status:                   d.status as PaymentAuthorization['status'],
    stripePaymentIntentId:    d.provider_payment_id ?? undefined,
    clientEmail:              d.client_email ?? undefined,
    clientPhone:              d.client_phone ?? undefined,
    capturedAt:               d.captured_at ?? undefined,
    cancelledAt:              d.cancelled_at ?? undefined,
    createdAt:                d.created_at,
    updatedAt:                d.updated_at,
    metadata:                 (d.metadata as Record<string, unknown>) ?? {},
  };
}

class SupabasePaymentService implements IPaymentService {

  // ── createPaymentIntent ───────────────────────────────────────────────────
  async createPaymentIntent(params: {
    interventionId: string | null;
    amount: number;
    currency?: string;
    clientEmail: string;
    clientPhone?: string;
  }): Promise<{ id: string; clientSecret: string }> {
    const payload: Record<string, unknown> = {
      payment_provider: 'stripe',
      amount_authorized: params.amount,
      currency:          params.currency || 'eur',
      status:            'pending',
      client_email:      params.clientEmail,
      client_phone:      params.clientPhone || null,
      metadata:          {},
    };
    if (params.interventionId) payload.intervention_id = params.interventionId;

    const { data, error } = await supabase
        .from('payment_authorizations')
        .insert(payload as any)
        .select()
        .single();
    if (error) throw error;

    const { data: stripeData, error: stripeError } = await supabase.functions.invoke(
        'create-payment-intent', {
          body: {
            authorizationId: data.id,
            amount:          params.amount,
            currency:        params.currency || 'eur',
            customerEmail:   params.clientEmail,
            interventionId:  params.interventionId,
          },
        }
    );
    if (stripeError) {
      await this.updateAuthorizationStatus(data.id, 'failed');
      throw stripeError;
    }
    if (!stripeData?.clientSecret) {
      await this.updateAuthorizationStatus(data.id, 'failed');
      throw new Error('No client secret returned from payment provider');
    }

    return { id: data.id, clientSecret: stripeData.clientSecret };
  }

  // ── createAuthorizationRequest ────────────────────────────────────────────
  async createAuthorizationRequest(params: {
    interventionId: string;
    amount: number;
    currency?: string;
    clientEmail: string;
    clientPhone?: string;
  }): Promise<{ id: string; checkoutUrl?: string }> {
    const { data, error } = await supabase
        .from('payment_authorizations')
        .insert({
          intervention_id:  params.interventionId,
          payment_provider: 'stripe',
          amount_authorized: params.amount,
          currency:         params.currency || 'eur',
          status:           'pending',
          client_email:     params.clientEmail,
          client_phone:     params.clientPhone || null,
          metadata:         {},
        })
        .select()
        .single();
    if (error) throw error;

    const { data: stripeData, error: stripeError } = await supabase.functions.invoke(
        'create-payment-authorization', {
          body: {
            authorizationId: data.id,
            amount:          params.amount,
            currency:        params.currency || 'eur',
            customerEmail:   params.clientEmail,
            interventionId:  params.interventionId,
          },
        }
    );
    if (stripeError) {
      await this.updateAuthorizationStatus(data.id, 'failed');
      throw stripeError;
    }

    if (stripeData?.paymentIntentId) {
      await supabase
          .from('payment_authorizations')
          .update({
            provider_payment_id:  stripeData.paymentIntentId,
            provider_customer_id: stripeData.customerId || null,
          } as never)
          .eq('id', data.id);
    }

    return { id: data.id, checkoutUrl: stripeData?.checkoutUrl };
  }

  // ── updateAuthorizationStatus ─────────────────────────────────────────────
  async updateAuthorizationStatus(
      authorizationId: string,
      status: 'pending' | 'authorized' | 'captured' | 'cancelled' | 'failed'
  ): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (status === 'authorized') update.authorization_confirmed_at = new Date().toISOString();
    if (status === 'captured')   update.captured_at                = new Date().toISOString();
    if (status === 'cancelled')  update.cancelled_at               = new Date().toISOString();

    const { error } = await supabase
        .from('payment_authorizations')
        .update(update as never)
        .eq('id', authorizationId);
    if (error) throw error;
  }

  // ── linkAuthorizationToIntervention ───────────────────────────────────────
  async linkAuthorizationToIntervention(
      authorizationId: string,
      interventionId: string
  ): Promise<void> {
    const { error } = await supabase
        .from('payment_authorizations')
        .update({ intervention_id: interventionId } as never)
        .eq('id', authorizationId);
    if (error) throw error;
  }

  // ── getAuthorizationByIntervention ────────────────────────────────────────
  async getAuthorizationByIntervention(
      interventionId: string
  ): Promise<PaymentAuthorization | null> {
    const { data, error } = await supabase
        .from('payment_authorizations')
        .select('*')
        .eq('intervention_id', interventionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapToAuthorization(data as unknown as DbPaymentAuthorization);
  }

  /**
   * Get authorizations for multiple interventions with optional status filter
   */
  async getAuthorizationsByInterventions(
      interventionIds: string[],
      statuses?: string[]
  ): Promise<PaymentAuthorization[]> {
    let query = supabase
        .from('payment_authorizations')
        .select('*')
        .in('intervention_id', interventionIds);

    if (statuses && statuses.length > 0) {
      query = query.in('status', statuses);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

     return data.map(d => mapToAuthorization(d as unknown as DbPaymentAuthorization));
  }

  // ── getAuthorization ──────────────────────────────────────────────────────
  async getAuthorization(id: string): Promise<PaymentAuthorization | null> {
    const { data, error } = await supabase
        .from('payment_authorizations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapToAuthorization(data as unknown as DbPaymentAuthorization);
  }

  // ── getPaymentsList (admin) ───────────────────────────────────────────────
  async getPaymentsList(): Promise<PaymentRow[]> {
    const { data: paData, error } = await supabase
        .from('payment_authorizations')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;

    const interventionIds = [
      ...new Set((paData || []).map((p: any) => p.intervention_id).filter(Boolean)),
    ] as string[];

    const interventionsMap: Record<string, any> = {};

    if (interventionIds.length > 0) {
      const { data: intData } = await supabase
          .from('interventions')
          .select('id, title, address, city, client_id, status')
          .in('id', interventionIds);

      if (intData?.length) {
        const clientIds = [
          ...new Set(intData.map((i: any) => i.client_id).filter(Boolean)),
        ] as string[];

        const clientsMap: Record<string, string> = {};
        if (clientIds.length > 0) {
          const { data: usersData } = await supabase
              .from('users')
              .select('id, first_name, last_name')
              .in('id', clientIds);
          (usersData || []).forEach((u: any) => {
            clientsMap[u.id] = `${u.first_name} ${u.last_name}`;
          });
        }

        intData.forEach((i: any) => {
          interventionsMap[i.id] = {
            title:      i.title,
            address:    i.address,
            city:       i.city,
            status:     i.status,
            clientName: i.client_id ? (clientsMap[i.client_id] || '') : '',
          };
        });
      }
    }

    return (paData || []).map((p: any): PaymentRow => {
      const int            = p.intervention_id ? interventionsMap[p.intervention_id] : null;
      const isCancellationFee = int?.status === 'cancelled' && p.status === 'captured';
      return {
        id:                  p.id,
        interventionId:      p.intervention_id  ?? null,
        amountAuthorized:    Number(p.amount_authorized ?? 0),
        currency:            p.currency         ?? 'EUR',
        status:              p.status,
        clientEmail:         p.client_email     ?? null,
        providerPaymentId:   p.provider_payment_id ?? null,
        createdAt:           p.created_at,
        capturedAt:          p.captured_at      ?? null,
        cancelledAt:         p.cancelled_at     ?? null,
        interventionTitle:   int?.title,
        interventionAddress: int?.address,
        interventionCity:    int?.city,
        interventionStatus:  int?.status,
        clientName:          int?.clientName || p.client_email || '—',
        isCancellationFee,
      };
    });
  }

  // ── capturePayment ────────────────────────────────────────────────────────
  async capturePayment(interventionId: string, amount: number): Promise<void> {
    const { error } = await supabase.functions.invoke('capture-payment', {
      body: { interventionId, amount },
    });
    if (error) throw error;
  }

  // ── recordManualPayment (admin/manager) ───────────────────────────────────
  async recordManualPayment(params: {
    interventionId: string;
    amount: number;
    method: ManualPaymentMethod;
    clientEmail?: string;
    clientPhone?: string;
    recordedBy?: string;
    reference?: string;
  }): Promise<{ id: string }> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('payment_authorizations')
        .insert({
          intervention_id:            params.interventionId,
          payment_provider:           'manual',
          amount_authorized:          params.amount,
          currency:                   'eur',
          status:                     'captured',
          client_email:               params.clientEmail ?? null,
          client_phone:               params.clientPhone ?? null,
          authorization_requested_at: now,
          authorization_confirmed_at: now,
          captured_at:                now,
          metadata: {
            paymentMethod:    params.method,
            paymentReference: params.reference ?? null,
            recordedBy:       params.recordedBy ?? null,
            source:           'admin_finalization',
          },
        } as never)
        .select('id')
        .single();
    if (error) throw error;
    return { id: data.id };
  }

  // ── deleteManualPayment (rollback du dialog de finalisation) ──────────────
  async deleteManualPayment(paymentId: string): Promise<void> {
    const { data, error } = await supabase
        .from('payment_authorizations')
        .delete()
        .eq('id', paymentId)
        .eq('payment_provider', 'manual')
        .select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('Paiement manuel introuvable');
  }

  // ── refundPayment ─────────────────────────────────────────────────────────
  async refundPayment(
      interventionId: string,
      refundType: 'full' | 'partial',
      refundAmount?: number
  ): Promise<{ amount: number }> {
    const { data, error } = await supabase.functions.invoke('process-dispute-refund', {
      body: {
        interventionId,
        refundType,
        refundAmount: refundType === 'partial' ? refundAmount : undefined,
        adminNotes:   `Remboursement ${refundType === 'full' ? 'total' : 'partiel'} depuis gestion paiements`,
      },
    });
    if (error) throw error;
    return { amount: data?.amount || 0 };
  }
}

export const paymentService = new SupabasePaymentService();