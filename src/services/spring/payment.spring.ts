import type { IPaymentService } from '@/services/interfaces/payment.interface';
import type { PaymentAuthorization } from '@/services/supabase/payment.service';
import { springHttp } from './http-client';

export class SpringPaymentService implements IPaymentService {
  // POST /payment/intent
  async createPaymentIntent(params: any): Promise<{ id: string; clientSecret: string }> {
    return springHttp.post('/payment/intent', params);
  }

  // POST /payment/authorization
  async createAuthorizationRequest(params: any): Promise<{ id: string; checkoutUrl?: string }> {
    return springHttp.post('/payment/authorization', params);
  }

  // PATCH /payment/authorization/{id}/status
  async updateAuthorizationStatus(authorizationId: string, status: string): Promise<void> {
    await springHttp.patch(`/payment/authorization/${authorizationId}/status`, { status });
  }

  // PATCH /payment/authorization/{id}/link-intervention
  async linkAuthorizationToIntervention(authorizationId: string, interventionId: string): Promise<void> {
    await springHttp.patch(`/payment/authorization/${authorizationId}/link-intervention`, { interventionId });
  }

  // GET /payment/authorization/by-intervention/{interventionId}
  async getAuthorizationByIntervention(interventionId: string): Promise<PaymentAuthorization | null> {
    return springHttp.get(`/payment/authorization/by-intervention/${interventionId}`);
  }

  // GET /payment/authorization/{id}
  async getAuthorization(id: string): Promise<PaymentAuthorization | null> {
    return springHttp.get(`/payment/authorization/${id}`);
  }

  // POST /payment/authorization/{id}/capture
  async capturePayment(authorizationId: string, amount: number): Promise<void> {
    await springHttp.post(`/payment/authorization/${authorizationId}/capture`, { amount });
  }

  // POST /payment/authorization/{id}/cancel
  async cancelAuthorization(authorizationId: string): Promise<void> {
    await springHttp.post(`/payment/authorization/${authorizationId}/cancel`);
  }

  // POST /payment/authorization/{id}/increment
  async incrementAuthorization(authorizationId: string, additionalAmount: number): Promise<void> {
    await springHttp.post(`/payment/authorization/${authorizationId}/increment`, { additionalAmount });
  }
}
