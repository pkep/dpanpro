/**
 * Template: Quote Modification Notification Email
 * Used by: notify-quote-modification
 */

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
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.label}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.total_price.toFixed(2)} €</td>
        </tr>`
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Depan.Pro : Modification de devis</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://dpanpro.lovable.app/lovable-uploads/d21193e1-62b9-49fe-854f-eb8275099db9.png" alt="Depan.Pro" style="height: 60px;" />
      </div>
      
      <h1 style="color: #1a1a2e;">Modification de devis</h1>
      
      <p>Bonjour,</p>
      
      <p>Le technicien intervenant sur votre demande (${interventionTitle}) vous propose des prestations ou équipements supplémentaires :</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 10px; text-align: left;">Description</th>
            <th style="padding: 10px; text-align: center;">Qté</th>
            <th style="padding: 10px; text-align: right;">Prix</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 10px; font-weight: bold;">Total supplémentaire</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">${totalAdditionalAmount.toFixed(2)} €</td>
          </tr>
        </tfoot>
      </table>
      
      <p>Veuillez valider ou refuser cette modification en cliquant sur le bouton ci-dessous :</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${approvalUrl}" style="background: #1a1a2e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Voir et valider le devis
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        Si vous ne pouvez pas cliquer sur le bouton, copiez ce lien dans votre navigateur :<br>
        <a href="${approvalUrl}">${approvalUrl}</a>
      </p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      
      <p style="color: #999; font-size: 12px;">
        Cet email a été envoyé par Depan.Pro concernant votre intervention ${trackingCode || ""}.
      </p>
    </body>
    </html>
  `;
}
