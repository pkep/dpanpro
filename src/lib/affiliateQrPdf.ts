import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface AffiliateEmailAttachments {
  pdfBase64: string;
  qrPngBase64: string;
}

/** Generate attachments locally so the referral URL never leaves the browser. */
export async function buildAffiliateEmailAttachments(code: string, referralUrl: string): Promise<AffiliateEmailAttachments> {
  if (!code.trim()) throw new Error('Code manquant');
  const url = new URL(referralUrl);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Lien invalide');
  const qr = await QRCode.toDataURL(referralUrl, { width: 500, margin: 4, errorCorrectionLevel: 'M' });
  const pdf = new jsPDF({ format: 'a5', unit: 'mm' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(26);
  pdf.text('Depan.Pro', 74, 28, { align: 'center' });
  pdf.setFontSize(14);
  pdf.text('Code : ' + code, 74, 46, { align: 'center' });
  pdf.addImage(qr, 'PNG', 29, 58, 90, 90);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(pdf.splitTextToSize(referralUrl, 120), 74, 162, { align: 'center' });
  return {
    pdfBase64: pdf.output('datauristring').split(',')[1],
    qrPngBase64: qr.split(',')[1],
  };
}