import type { Intervention } from '@/types/intervention.types';
import { downloadInvoicePdf } from '@/lib/documentDownload';

class InvoiceService {
  async generateAndDownloadInvoice(intervention: Intervention): Promise<void> {
    await downloadInvoicePdf(intervention.id);
  }
}

export const invoiceService = new InvoiceService();
