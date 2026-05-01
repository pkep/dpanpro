/**
 * Template: Payment Required Notification Email
 * Used by: notify-payment-required
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface PaymentRequiredTemplateData {
  trackingCode: string;
  trackingUrl: string;
  paymentUrl: string;
}

export function buildPaymentRequiredEmailHtml(data: PaymentRequiredTemplateData): string {
  const { trackingCode, trackingUrl } = data;

  const bodyContent = `
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h2 style="color: #92400e; margin: 0 0 10px 0;">Action requise de votre part</h2>
      <p style="margin: 10px 0 0 0; color: #78350f;">Pour permettre le règlement de l'intervention, veuillez autoriser votre carte en cliquant sur le bouton ci-dessous.</p>
    </div>
    
    <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; color: #1f2937;">
      ${trackingCode}
    </div>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${paymentUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Autoriser ma carte maintenant
      </a>
    </div>

    <div style="text-align: center; margin: 24px 0;">
    <p style="font-size: 13px; color: #6b7280;">
      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
      <a href="${trackingUrl}" style="color: #0FB87F;">${trackingUrl}</a>
    </p>
      <a href="${trackingUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Suivre 
      </a>
    </div>
  `;

  return wrapInBaseLayout({
    headerTitle: "⚠️ Autorisation de paiement requise",
    headerBgGradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    bodyContent,
  });
}
