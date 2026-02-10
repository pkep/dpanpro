import { supabase } from '@/integrations/supabase/client';

// Payment provider interface for abstraction
export interface PaymentProvider {
  name: string;
  createAuthorizationHold(params: AuthorizationParams): Promise<AuthorizationResult>;
  capturePayment(authorizationId: string, amount?: number): Promise<CaptureResult>;
  cancelAuthorization(authorizationId: string): Promise<void>;
}

export interface AuthorizationParams {
  amount: number;
  currency: string;
  customerEmail: string;
  customerPhone?: string;
  interventionId: string;
  metadata?: Record<string, string>;
}

export interface AuthorizationResult {
  success: boolean;
  checkoutUrl?: string;
  providerPaymentId?: string;
  providerCustomerId?: string;
  error?: string;
}

export interface CaptureResult {
  success: boolean;
  error?: string;
}

export interface PaymentAuthorization {
  id: string;
  interventionId: string;
  paymentProvider: string;
  providerPaymentId: string | null;
  providerCustomerId: string | null;
  amountAuthorized: number;
  currency: string;
  status: 'pending' | 'authorized' | 'captured' | 'cancelled' | 'failed';
  clientEmail: string | null;
  clientPhone: string | null;
  authorizationRequestedAt: string;
  authorizationConfirmedAt: string | null;
  capturedAt: string | null;
  cancelledAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface DbPaymentAuthorization {
  id: string;
  intervention_id: string;
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

class PaymentService {
  private currentProvider: string = 'stripe';

  /**
   * Create a payment authorization request and get client secret for Stripe Elements
   */
  async createPaymentIntent(params: {
    interventionId: string | null;
    amount: number;
    currency?: string;
    clientEmail: string;
    clientPhone?: string;
  }): Promise<{ id: string; clientSecret: string }> {
    // First, save the authorization request to database
    const insertPayload: Record<string, unknown> = {
      payment_provider: this.currentProvider,
      amount_authorized: params.amount,
      currency: params.currency || 'eur',
      status: 'pending',
      client_email: params.clientEmail,
      client_phone: params.clientPhone || null,
      metadata: {},
    };
    if (params.interventionId) {
      insertPayload.intervention_id = params.interventionId;
    }
    
    const { data, error } = await supabase
      .from('payment_authorizations')
      .insert(insertPayload as any)
      .select()
      .single();

    if (error) throw error;

    // Call edge function to create Stripe PaymentIntent
    const { data: stripeData, error: stripeError } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        authorizationId: data.id,
        amount: params.amount,
        currency: params.currency || 'eur',
        customerEmail: params.clientEmail,
        interventionId: params.interventionId,
      },
    });

    if (stripeError) {
      // Update status to failed
      await this.updateAuthorizationStatus(data.id, 'failed');
      throw stripeError;
    }

    if (!stripeData?.clientSecret) {
      await this.updateAuthorizationStatus(data.id, 'failed');
      throw new Error('No client secret returned from payment provider');
    }

    return {
      id: data.id,
      clientSecret: stripeData.clientSecret,
    };
  }

  /**
   * Legacy method for redirect-based checkout (kept for compatibility)
   */
  async createAuthorizationRequest(params: {
    interventionId: string;
    amount: number;
    currency?: string;
    clientEmail: string;
    clientPhone?: string;
  }): Promise<{ id: string; checkoutUrl?: string }> {
    // First, save the authorization request to database
    const insertPayload = {
      intervention_id: params.interventionId,
      payment_provider: this.currentProvider,
      amount_authorized: params.amount,
      currency: params.currency || 'eur',
      status: 'pending',
      client_email: params.clientEmail,
      client_phone: params.clientPhone || null,
      metadata: {},
    };
    
    const { data, error } = await supabase
      .from('payment_authorizations')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

    // Call edge function to create Stripe authorization
    const { data: stripeData, error: stripeError } = await supabase.functions.invoke('create-payment-authorization', {
      body: {
        authorizationId: data.id,
        amount: params.amount,
        currency: params.currency || 'eur',
        customerEmail: params.clientEmail,
        interventionId: params.interventionId,
      },
    });

    if (stripeError) {
      // Update status to failed
      await this.updateAuthorizationStatus(data.id, 'failed');
      throw stripeError;
    }

    // Update with Stripe IDs
    if (stripeData?.paymentIntentId) {
      await supabase
        .from('payment_authorizations')
        .update({
          provider_payment_id: stripeData.paymentIntentId,
          provider_customer_id: stripeData.customerId || null,
        } as Record<string, unknown>)
        .eq('id', data.id);
    }

    return {
      id: data.id,
      checkoutUrl: stripeData?.checkoutUrl,
    };
  }

  /**
   * Update authorization status
   */
  async updateAuthorizationStatus(
    authorizationId: string,
    status: 'pending' | 'authorized' | 'captured' | 'cancelled' | 'failed'
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };

    if (status === 'authorized') {
      updateData.authorization_confirmed_at = new Date().toISOString();
    } else if (status === 'captured') {
      updateData.captured_at = new Date().toISOString();
    } else if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('payment_authorizations')
      .update(updateData)
      .eq('id', authorizationId);

    if (error) throw error;
  }

  /**
   * Link an existing authorization to an intervention (after intervention is created)
   */
  async linkAuthorizationToIntervention(authorizationId: string, interventionId: string): Promise<void> {
    const { error } = await supabase
      .from('payment_authorizations')
      .update({ intervention_id: interventionId } as Record<string, unknown>)
      .eq('id', authorizationId);

    if (error) throw error;
  }

  /**
   * Get authorization for an intervention
   */
  async getAuthorizationByIntervention(interventionId: string): Promise<PaymentAuthorization | null> {
    const { data, error } = await supabase
      .from('payment_authorizations')
      .select('*')
      .eq('intervention_id', interventionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapToAuthorization(data as unknown as DbPaymentAuthorization);
  }

  /**
   * Get authorization by ID
   */
  async getAuthorization(id: string): Promise<PaymentAuthorization | null> {
    const { data, error } = await supabase
      .from('payment_authorizations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapToAuthorization(data as unknown as DbPaymentAuthorization);
  }

  private mapToAuthorization(data: DbPaymentAuthorization): PaymentAuthorization {
    return {
      id: data.id,
      interventionId: data.intervention_id,
      paymentProvider: data.payment_provider,
      providerPaymentId: data.provider_payment_id,
      providerCustomerId: data.provider_customer_id,
      amountAuthorized: data.amount_authorized,
      currency: data.currency,
      status: data.status as PaymentAuthorization['status'],
      clientEmail: data.client_email,
      clientPhone: data.client_phone,
      authorizationRequestedAt: data.authorization_requested_at,
      authorizationConfirmedAt: data.authorization_confirmed_at,
      capturedAt: data.captured_at,
      cancelledAt: data.cancelled_at,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const paymentService = new PaymentService();
