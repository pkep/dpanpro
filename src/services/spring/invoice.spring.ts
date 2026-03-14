import type { IInvoiceService } from '@/services/interfaces/invoice.interface';
import type { Intervention } from '@/types/intervention.types';
import { springHttp } from './http-client';

export class SpringInvoiceService implements IInvoiceService {
  // GET /interventions/{id}/invoice → binary PDF
  async generateAndDownloadInvoice(intervention: Intervention): Promise<void> {
    const blob = await springHttp.getBlob(`/interventions/${intervention.id}/invoice`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facture-${intervention.trackingCode || intervention.id.substring(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // GET /interventions/{id}/invoice → Blob
  async generateInvoiceBlob(intervention: Intervention): Promise<Blob> {
    return springHttp.getBlob(`/interventions/${intervention.id}/invoice`);
  }

  // POST /interventions/{id}/invoice/send
  async sendInvoiceByEmail(intervention: Intervention): Promise<boolean> {
    try {
      await springHttp.post(`/interventions/${intervention.id}/invoice/send`);
      return true;
    } catch {
      return false;
    }
  }
}
