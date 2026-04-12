/**
 * Template: Payment Authorized - Technician Notification
 * Sent to technician when client completes payment authorization
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface PaymentAuthorizedTechData {
  trackingCode: string;
  categoryLabel: string;
  address: string;
  city: string;
  interventionUrl: string;
}

export function buildPaymentAuthorizedTechEmailHtml(data: PaymentAuthorizedTechData): string {
  const { trackingCode, categoryLabel, address, city, interventionUrl } = data;

  const bodyContent = `
    <div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h2 style="color: #065f46; margin: 0 0 10px 0;">Depan.pro : ✅ Autorisation de paiement confirmée</h2>
      <p style="margin: 0; color: #047857;">Le client a autorisé le paiement pour cette intervention. Vous pouvez désormais reprendre et poursuivre l'intervention.</p>
    </div>
    
    <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Détails de l'intervention :</p>
      <p style="margin: 0 0 4px 0; font-weight: 600; color: #1f2937;">${categoryLabel}</p>
      <p style="margin: 0; color: #4b5563;">${address}, ${city}</p>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #6b7280;">Réf : ${trackingCode}</p>
    </div>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${interventionUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Reprendre l'intervention
      </a>
    </div>
  `;

  return wrapInBaseLayout({
    headerTitle: "✅ Paiement autorisé par le client",
    headerBgGradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    bodyContent,
  });
}
