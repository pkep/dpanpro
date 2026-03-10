import type { IPaymentService } from '@/services/interfaces/payment.interface';
import type { PaymentAuthorization } from '@/services/payment/payment.service';
import { springHttp } from './http-client';

export class SpringPaymentService implements IPaymentService {
  async createPaymentIntent(params: any): Promise<{ id: string; clientSecret: string }> {
    return springHttp.post('/payments/intent', params);
  }
  async createAuthorizationRequest(params: any): Promise<{ id: string; checkoutUrl?: string }> {
    return springHttp.post('/payments/authorization', params);
  }
  async updateAuthorizationStatus(authorizationId: string, status: string): Promise<void> {
    await springHttp.patch(`/payments/${authorizationId}/status`, { status });
  }
  async linkAuthorizationToIntervention(authorizationId: string, interventionId: string): Promise<void> {
    await springHttp.patch(`/payments/${authorizationId}/link`, { interventionId });
  }
  async getAuthorizationByIntervention(interventionId: string): Promise<PaymentAuthorization | null> {
    return springHttp.get(`/payments/intervention/${interventionId}`);
  }
  async getAuthorization(id: string): Promise<PaymentAuthorization | null> {
    return springHttp.get(`/payments/${id}`);
  }
}
