/**
 * Template: Payment Captured - Technician Notification
 * Used by: capture-payment
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface PaymentCapturedData {
  firstName: string;
  amount: string;
  interventionTitle: string;
}

export function buildPaymentCapturedEmailHtml(data: PaymentCapturedData): string {
  const { firstName, amount, interventionTitle } = data;

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour ${firstName},</p>
    
    <div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="color: #065f46; margin: 0 0 10px 0;">✅ Paiement confirmé</h2>
      <p style="margin: 0; color: #047857;">Le paiement de <strong>${amount} €</strong> pour l'intervention <strong>${interventionTitle}</strong> a été débité avec succès.</p>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">Merci pour votre travail !</p>
    <p style="font-size: 14px; color: #374151;">Cordialement,<br/>L'équipe Depan.Pro</p>
  `;

  return wrapInBaseLayout({
    headerTitle: "✅ Paiement confirmé",
    headerBgGradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    bodyContent,
  });
}
