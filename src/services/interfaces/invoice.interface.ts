import type { Intervention } from '@/types/intervention.types';

export interface IInvoiceService {
  generateAndDownloadInvoice(intervention: Intervention): Promise<void>;
  generateInvoiceBlob(intervention: Intervention): Promise<Blob>;
  sendInvoiceByEmail(intervention: Intervention): Promise<boolean>;
}
