/**
 * Template: Invoice Email (facture)
 * Used by: send-invoice-email
 */

interface InvoiceEmailTemplateData {
  trackingCode: string;
  clientName: string;
  address: string;
  finalPrice: number;
}

export function buildInvoiceEmailHtml(data: InvoiceEmailTemplateData): string {
  const { trackingCode, clientName, address, finalPrice } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a56db; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header img { height: 50px; margin-bottom: 10px; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .invoice-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .total { font-size: 24px; color: #1a56db; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://dpanpro.lovable.app/lovable-uploads/d21193e1-62b9-49fe-854f-eb8275099db9.png" alt="Depan.Pro" />
          <h1>Facture - Intervention ${trackingCode}</h1>
        </div>
        <div class="content">
          <p>Bonjour ${clientName},</p>
          
          <p>Nous vous remercions pour votre confiance. Veuillez trouver ci-joint la facture correspondant à votre intervention de dépannage.</p>
          
          <div class="invoice-info">
            <p><strong>Référence :</strong> ${trackingCode}</p>
            <p><strong>Adresse :</strong> ${address}</p>
            <p class="total">Montant total : ${finalPrice.toFixed(2)} € TTC</p>
          </div>
          
          <p>La facture est jointe à cet email au format PDF.</p>
          
          <p>Si vous avez des questions concernant cette facture, n'hésitez pas à nous contacter.</p>
          
          <p>Cordialement,<br>L'équipe Depan.Pro</p>
        </div>
        <div class="footer">
          <p>Depan.Pro - Service de dépannage à domicile</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
