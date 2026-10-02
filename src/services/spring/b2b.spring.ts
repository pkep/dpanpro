import { springHttp } from './http-client';
import type {
  IB2bService, B2bPartner, B2bPartnerInput, B2bInvoice, B2bInvoiceGenerateInput,
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

  getInvoices(partnerId?: string): Promise<B2bInvoice[]> {
    return springHttp.get<B2bInvoice[]>('/b2b-invoices', partnerId ? { partnerId } : undefined);
  }

  getInvoice(id: string): Promise<B2bInvoice> {
    return springHttp.get<B2bInvoice>(`/b2b-invoices/${id}`);
  }

  generateInvoice(input: B2bInvoiceGenerateInput): Promise<B2bInvoice> {
    return springHttp.post<B2bInvoice>('/b2b-invoices/generate', input);
  }

  markInvoiceSent(id: string): Promise<B2bInvoice> {
    return springHttp.post<B2bInvoice>(`/b2b-invoices/${id}/sent`);
  }

  markInvoicePaid(id: string): Promise<B2bInvoice> {
    return springHttp.post<B2bInvoice>(`/b2b-invoices/${id}/paid`);
  }

  cancelInvoice(id: string): Promise<B2bInvoice> {
    return springHttp.post<B2bInvoice>(`/b2b-invoices/${id}/cancel`);
  }
}

export const springB2bService = new SpringB2bService();
