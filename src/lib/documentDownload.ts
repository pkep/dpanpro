import { API_CONFIG, isSpringMode } from '@/config/api.config';
import { supabase } from '@/integrations/supabase/client';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function base64ToBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'application/pdf' });
}

async function downloadFromSpring(path: string, filename: string): Promise<void> {
  const token = localStorage.getItem('depanpro_token');
  const response = await fetch(`${API_CONFIG.springBaseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error(`PDF indisponible (HTTP ${response.status})`);
  downloadBlob(await response.blob(), filename);
}

export async function downloadQuotePdf(interventionId: string): Promise<void> {
  if (isSpringMode()) {
    return downloadFromSpring(`/pdf-download/quote/${interventionId}`, `devis-${interventionId.slice(0, 8)}.pdf`);
  }
  const { data, error } = await supabase.functions.invoke('create-quote', {
    body: { interventionId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  downloadBlob(base64ToBlob(data.quoteBase64), data.quoteFileName || `devis-${interventionId.slice(0, 8)}.pdf`);
}

export async function downloadInvoicePdf(interventionId: string): Promise<void> {
  if (isSpringMode()) {
    return downloadFromSpring(`/pdf-download/invoice/${interventionId}`, `facture-${interventionId.slice(0, 8)}.pdf`);
  }
  const { data, error } = await supabase.functions.invoke('create-invoice', {
    body: { interventionId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  downloadBlob(base64ToBlob(data.invoiceBase64), data.invoiceFileName || `facture-${interventionId.slice(0, 8)}.pdf`);
}
