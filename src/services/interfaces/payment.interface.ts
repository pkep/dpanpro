import type { PaymentAuthorization } from '@/services/payment/payment.service';

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
