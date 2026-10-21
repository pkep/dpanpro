import { springHttp } from './http-client';
import type {
  IB2bService, B2bPartner, B2bPartnerInput, B2bInvoice,
  B2bPortalFilters, B2bPortalIntervention, B2bInterventionInput, B2bAccessCredentials,
} from '@/services/interfaces/b2b.interface';

export class SpringB2bService implements IB2bService {
  getPartners(search?: string): Promise<B2bPartner[]> {
    return springHttp.get<B2bPartner[]>('/b2b-partners', search ? { search } : undefined);
  }

  getPartner(id: string): Promise<B2bPartner> {
    return springHttp.get<B2bPartner>(`/b2b-partners/${id}`);
  }

  createPartner(input: B2bPartnerInput): Promise<B2bPartner> {
    return springHttp.post<B2bPartner>('/b2b-partners', input);
  }

  updatePartner(id: string, input: B2bPartnerInput): Promise<B2bPartner> {
    return springHttp.put<B2bPartner>(`/b2b-partners/${id}`, input);
  }

  async deletePartner(id: string): Promise<void> {
    await springHttp.delete(`/b2b-partners/${id}`);
  }

  getInvoices(partnerId?: string, month?: string): Promise<B2bInvoice[]> {
    const params: Record<string, string> = {};
    if (partnerId) params.partnerId = partnerId;
    if (month) params.month = month;
    return springHttp.get<B2bInvoice[]>('/b2b-invoices', Object.keys(params).length ? params : undefined);
  }

  getInvoice(id: string): Promise<B2bInvoice> {
    return springHttp.get<B2bInvoice>(`/b2b-invoices/${id}`);
  }

  previewInvoicePdf(partnerId: string, month: string): Promise<{ pdfBase64: string; filename: string }> {
    return springHttp.get<{ pdfBase64: string; filename: string }>('/b2b-invoices/preview-pdf', { partnerId, month });
  }

  sendInvoice(id: string): Promise<B2bInvoice> {
    return springHttp.post<B2bInvoice>(`/b2b-invoices/${id}/send`);
  }

  sendInvoices(month: string): Promise<{ sent: number }> {
    return springHttp.post<{ sent: number }>(`/b2b-invoices/send-all?month=${encodeURIComponent(month)}`);
  }

  markInvoicePaid(id: string): Promise<B2bInvoice> {
    return springHttp.post<B2bInvoice>(`/b2b-invoices/${id}/paid`);
  }

  cancelInvoice(id: string): Promise<B2bInvoice> {
    return springHttp.post<B2bInvoice>(`/b2b-invoices/${id}/cancel`);
  }

  getMyPartner(_userId: string): Promise<B2bPartner | null> {
    return springHttp.get<B2bPartner | null>('/b2b/me/partner');
  }

  getMyInterventions(_userId: string, filters?: B2bPortalFilters): Promise<B2bPortalIntervention[]> {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters ?? {})) {
      if (value) params[key] = value;
    }
    return springHttp.get<B2bPortalIntervention[]>('/b2b/me/interventions', params);
  }

  getMyInvoices(_userId: string): Promise<B2bInvoice[]> {
    return springHttp.get<B2bInvoice[]>('/b2b/me/invoices');
  }

  createMyIntervention(_userId: string, input: B2bInterventionInput): Promise<B2bPortalIntervention> {
    return springHttp.post<B2bPortalIntervention>('/b2b/me/interventions', input);
  }

  createAccess(partner: B2bPartner, createdBy?: string): Promise<B2bAccessCredentials> {
    return springHttp.post<B2bAccessCredentials>(`/b2b-partners/${encodeURIComponent(partner.id)}/access`, { createdBy });
  }
}

export const springB2bService = new SpringB2bService();
