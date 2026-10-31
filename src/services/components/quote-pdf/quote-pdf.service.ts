import type { Intervention } from '@/types/intervention.types';
import { downloadQuotePdf } from '@/lib/documentDownload';

class QuotePDFService {
  async generateAndDownloadQuote(intervention: Intervention): Promise<void> {
    await downloadQuotePdf(intervention.id);
  }
}

export const quotePDFService = new QuotePDFService();
