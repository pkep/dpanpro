/**
 * Template: Invoice Email (facture)
 * Used by: send-invoice-email
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface InvoiceEmailTemplateData {
  trackingCode: string;
  clientName: string;
  address: string;
  finalPrice: number;
}

export function buildInvoiceEmailHtml(data: InvoiceEmailTemplateData): string {
  const { trackingCode, clientName, address, finalPrice } = data;

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour ${clientName},</p>
    
    <p style="font-size: 16px; color: #374151;">Nous vous remercions pour votre confiance. Veuillez trouver ci-joint la facture correspondant à votre intervention de dépannage.</p>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 6px 0; color: #374151;"><strong>Référence :</strong> ${trackingCode}</p>
      <p style="margin: 6px 0; color: #374151;"><strong>Adresse :</strong> ${address}</p>
      <p style="margin: 12px 0 0 0; font-size: 22px; font-weight: bold; color: #0FB87F;">Montant total : ${finalPrice.toFixed(2)} € TTC</p>
    </div>
    
    <p style="font-size: 14px; color: #374151;">La facture est jointe à cet email au format PDF.</p>
    <p style="font-size: 14px; color: #374151;">Si vous avez des questions concernant cette facture, n'hésitez pas à nous contacter.</p>
    <p style="font-size: 14px; color: #374151;">Cordialement,<br>L'équipe Depan.Pro</p>
  `;

  return wrapInBaseLayout({
    headerTitle: `Facture - Intervention ${trackingCode}`,
    bodyContent,
  });
}
