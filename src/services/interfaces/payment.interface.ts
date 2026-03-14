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
  getAuthorization(id: string): Promise<PaymentAuthorization | null>;
}
