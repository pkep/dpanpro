/**
 * Template: Quote Email (devis signé)
 * Used by: send-quote-email
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface QuoteEmailTemplateData {
  trackingCode: string;
  interventionId: string;
  address: string;
  postalCode: string;
  city: string;
  technicianName: string;
}

export function buildQuoteEmailHtml(data: QuoteEmailTemplateData): string {
  const { trackingCode, interventionId, address, postalCode, city, technicianName } = data;
  const ref = trackingCode || interventionId.slice(0, 8);

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour,</p>
    <p style="font-size: 16px; color: #374151;">Veuillez trouver ci-joint le devis signé pour votre intervention.</p>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 6px 0; color: #374151;"><strong>Référence :</strong> ${ref}</p>
      <p style="margin: 6px 0; color: #374151;"><strong>Adresse :</strong> ${address}, ${postalCode} ${city}</p>
      <p style="margin: 6px 0; color: #374151;"><strong>Technicien :</strong> ${technicianName}</p>
    </div>
    
    <p style="font-size: 14px; color: #374151;">Le technicien va maintenant procéder à l'intervention. Vous recevrez une facture une fois celle-ci terminée.</p>
    
    <p style="font-size: 14px; color: #374151;">Cordialement,<br/>L'équipe Depan.Pro</p>
  `;

  return wrapInBaseLayout({
    headerTitle: "Votre devis d'intervention",
    headerSubtitle: `Référence : ${ref}`,
    bodyContent,
  });
}
