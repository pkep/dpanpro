import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

/** Generate attachments locally; no customer data is sent to an image service. */
export async function buildAffiliateEmailAttachments(
  code: string,
  promoUrl: string,
): Promise<{ pdfBase64: string; qrPngBase64: string }> {
  const qrDataUrl = await QRCode.toDataURL(promoUrl, { width: 600, margin: 4, errorCorrectionLevel: 'M' });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const center = pdf.internal.pageSize.getWidth() / 2;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.text('Depan.Pro', center, 28, { align: 'center' });
  pdf.setFontSize(14);
  pdf.text(`Code : ${code}`, center, 45, { align: 'center', maxWidth: 128 });
  pdf.addImage(qrDataUrl, 'PNG', center - 45, 60, 90, 90);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const urlLines = pdf.splitTextToSize(promoUrl, 125);
  pdf.text(urlLines, center, 168, { align: 'center' });
  return {
    pdfBase64: pdf.output('datauristring').split(',')[1] ?? '',
    qrPngBase64: qrDataUrl.split(',')[1] ?? '',
  };
}