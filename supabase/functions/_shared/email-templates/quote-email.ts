/**
 * Template: Quote Email (devis signé)
 * Used by: send-quote-email
 */

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

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0FB87F; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background: #f9f9f9; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .btn { display: inline-block; padding: 12px 24px; background: #0FB87F; color: white; text-decoration: none; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">Depan.Pro</h1>
          <p style="margin:5px 0 0 0;">Votre devis d'intervention</p>
        </div>
        <div class="content">
          <p>Bonjour,</p>
          <p>Veuillez trouver ci-joint le devis signé pour votre intervention.</p>
          
          <div class="info-box">
            <p><strong>Référence:</strong> ${ref}</p>
            <p><strong>Adresse:</strong> ${address}, ${postalCode} ${city}</p>
            <p><strong>Technicien:</strong> ${technicianName}</p>
          </div>
          
          <p>Le technicien va maintenant procéder à l'intervention. Vous recevrez une facture une fois celle-ci terminée.</p>
          
          <p>Cordialement,<br/>L'équipe Depan.Pro</p>
        </div>
        <div class="footer">
          <p>Depan.Pro - 7, place du 11 Novembre 1918, 93000 Bobigny</p>
          <p>Tél: 01 84 60 86 30 | Email: contact@depan-pro.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
