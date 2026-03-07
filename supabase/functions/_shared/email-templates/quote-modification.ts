/**
 * Template: Quote Modification Notification Email
 * Used by: notify-quote-modification
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface QuoteModificationItem {
  label: string;
  quantity: number;
  total_price: number;
}

interface QuoteModificationTemplateData {
  interventionTitle: string;
  trackingCode: string;
  items: QuoteModificationItem[];
  totalAdditionalAmount: number;
  approvalUrl: string;
}

export function buildQuoteModificationEmailHtml(data: QuoteModificationTemplateData): string {
  const { interventionTitle, trackingCode, items, totalAdditionalAmount, approvalUrl } = data;

  const itemsHtml = items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #374151;">${item.label}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #374151;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #374151;">${item.total_price.toFixed(2)} €</td>
        </tr>`
    )
    .join("");

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour,</p>
    
    <p style="font-size: 16px; color: #374151;">Le technicien intervenant sur votre demande (${interventionTitle}) vous propose des prestations ou équipements supplémentaires :</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background: #f1f5f9;">
          <th style="padding: 12px; text-align: left; color: #475569; font-size: 13px;">Description</th>
          <th style="padding: 12px; text-align: center; color: #475569; font-size: 13px;">Qté</th>
          <th style="padding: 12px; text-align: right; color: #475569; font-size: 13px;">Prix</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 12px; font-weight: bold; color: #1f2937;">Total supplémentaire</td>
          <td style="padding: 12px; text-align: right; font-weight: bold; color: #0FB87F; font-size: 18px;">${totalAdditionalAmount.toFixed(2)} €</td>
        </tr>
      </tfoot>
    </table>
    
    <p style="font-size: 16px; color: #374151;">Veuillez valider ou refuser cette modification en cliquant sur le bouton ci-dessous :</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${approvalUrl}" style="background: linear-gradient(135deg, #0FB87F, #0a9e6a); color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        Voir et valider le devis
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 13px;">
      Si le bouton ne fonctionne pas, copiez ce lien :<br>
      <a href="${approvalUrl}" style="color: #0FB87F;">${approvalUrl}</a>
    </p>
  `;

  return wrapInBaseLayout({
    headerTitle: "Modification de devis",
    headerSubtitle: trackingCode ? `Intervention ${trackingCode}` : undefined,
    bodyContent,
  });
}
