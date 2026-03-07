/**
 * Template: Cancellation Invoice Email + Invoice HTML
 * Used by: send-cancellation-invoice
 */

interface CancellationInvoiceTemplateData {
  invoiceNumber: string;
  trackingCode: string;
  clientName: string;
  address: string;
  postalCode: string;
  city: string;
  displacementPriceHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
}

export function buildCancellationInvoiceEmailHtml(data: CancellationInvoiceTemplateData): string {
  const { invoiceNumber, trackingCode, clientName, address, postalCode, city, displacementPriceHT, vatRate, vatAmount, totalTTC } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .invoice-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .total { font-size: 24px; color: #dc2626; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .warning { background: #fef3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Facture d'annulation</h1>
          <p>Intervention ${trackingCode}</p>
        </div>
        <div class="content">
          <p>Bonjour ${clientName},</p>
          
          <p>Suite à l'annulation de votre intervention alors que le technicien était déjà sur place, veuillez trouver ci-dessous le détail des frais de déplacement facturés.</p>
          
          <div class="invoice-info">
            <p><strong>N° Facture :</strong> ${invoiceNumber}</p>
            <p><strong>Référence :</strong> ${trackingCode}</p>
            <p><strong>Adresse :</strong> ${address}, ${postalCode} ${city}</p>
            <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;" />
            <p>Frais de déplacement HT : ${displacementPriceHT.toFixed(2)} €</p>
            <p>TVA (${vatRate}%) : ${vatAmount.toFixed(2)} €</p>
            <p class="total">Total TTC : ${totalTTC.toFixed(2)} €</p>
          </div>
          
          <div class="warning">
            <strong>⚠️ Information</strong><br>
            Conformément à notre politique tarifaire, les frais de déplacement sont dus lorsque le technicien est arrivé sur les lieux.
          </div>
          
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

interface CancellationInvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  trackingCode: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  address: string;
  city: string;
  postalCode: string;
  category: string;
  displacementPriceHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
}

export function buildCancellationInvoicePdfHtml(data: CancellationInvoicePdfData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #1a56db; margin: 0; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .info-box { background: #f9fafb; padding: 15px; border-radius: 8px; width: 45%; }
        .info-box h3 { margin: 0 0 10px 0; color: #1a56db; font-size: 14px; }
        .info-box p { margin: 5px 0; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #1a56db; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .totals { margin-left: auto; width: 250px; background: #f9fafb; padding: 15px; border-radius: 8px; }
        .totals .row { display: flex; justify-content: space-between; margin: 8px 0; }
        .totals .total { font-weight: bold; font-size: 16px; color: #1a56db; border-top: 2px solid #ddd; padding-top: 10px; margin-top: 10px; }
        .notice { background: #fef3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .notice h4 { margin: 0 0 10px 0; color: #856404; }
        .notice p { margin: 0; font-size: 12px; color: #856404; }
        .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Dépan'Express</h1>
        <p>123 Avenue des Dépanneurs, 75001 Paris</p>
        <p>Tél: 01 23 45 67 89 | Email: contact@depanexpress.fr</p>
        <p>SIRET: 123 456 789 00012 | TVA: FR12 345678901</p>
      </div>

      <h2 style="text-align: center;">FACTURE D'ANNULATION</h2>
      <p style="text-align: center; color: #666;">N° ${data.invoiceNumber} | Date: ${data.invoiceDate}</p>

      <div class="info-row">
        <div class="info-box">
          <h3>INTERVENTION</h3>
          <p><strong>Réf:</strong> ${data.trackingCode}</p>
          <p><strong>Catégorie:</strong> ${data.category}</p>
          <p>${data.address}</p>
          <p>${data.postalCode} ${data.city}</p>
        </div>
        <div class="info-box">
          <h3>CLIENT</h3>
          <p>${data.clientName}</p>
          ${data.clientEmail ? `<p>${data.clientEmail}</p>` : ''}
          ${data.clientPhone ? `<p>${data.clientPhone}</p>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: right;">Prix HT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Frais de déplacement technicien</td>
            <td style="text-align: right;">${data.displacementPriceHT.toFixed(2)} €</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="row">
          <span>Sous-total HT:</span>
          <span>${data.displacementPriceHT.toFixed(2)} €</span>
        </div>
        <div class="row">
          <span>TVA (${data.vatRate}%):</span>
          <span>${data.vatAmount.toFixed(2)} €</span>
        </div>
        <div class="row total">
          <span>Total TTC:</span>
          <span>${data.totalTTC.toFixed(2)} €</span>
        </div>
      </div>

      <div class="notice">
        <h4>⚠️ Frais d'annulation</h4>
        <p>
          Conformément à notre politique tarifaire, les frais de déplacement sont dus 
          lorsque le technicien est déjà arrivé sur les lieux ou a commencé l'intervention.
        </p>
      </div>

      <div class="footer">
        <p>Merci pour votre compréhension.</p>
        <p>Dépan'Express - 123 456 789 00012 - TVA FR12 345678901</p>
      </div>
    </body>
    </html>
  `;
}
