/**
 * Template: Dispute Refund Notification
 * Used by: process-dispute-refund
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface DisputeRefundData {
  interventionTitle: string;
  refundType: string;
  refundAmount: string;
}

export function buildDisputeRefundEmailHtml(data: DisputeRefundData): string {
  const { interventionTitle, refundType, refundAmount } = data;

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour,</p>
    
    <div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="color: #065f46; margin: 0 0 10px 0;">💰 Remboursement ${refundType}</h2>
      <p style="margin: 0; color: #047857;">Suite à votre litige concernant l'intervention <strong>${interventionTitle}</strong>, nous avons procédé à un remboursement ${refundType} de <strong>${refundAmount} €</strong>.</p>
    </div>
    
    <p style="font-size: 14px; color: #374151;">Ce montant sera crédité sur votre compte sous 5 à 10 jours ouvrés.</p>
    <p style="font-size: 14px; color: #374151;">Cordialement,<br/>L'équipe Depan.Pro</p>
  `;

  return wrapInBaseLayout({
    headerTitle: "💰 Remboursement traité",
    headerBgGradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    bodyContent,
  });
}
