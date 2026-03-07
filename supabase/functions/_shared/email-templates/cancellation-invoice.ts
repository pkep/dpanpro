/**
 * Template: Cancellation Invoice Email + Invoice HTML
 * Used by: send-cancellation-invoice
 */
import { wrapInBaseLayout } from "./base-layout.ts";

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

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour ${clientName},</p>
    
    <p style="font-size: 16px; color: #374151;">Suite à l'annulation de votre intervention alors que le technicien était déjà sur place, veuillez trouver ci-dessous le détail des frais de déplacement facturés.</p>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 6px 0; color: #374151;"><strong>N° Facture :</strong> ${invoiceNumber}</p>
      <p style="margin: 6px 0; color: #374151;"><strong>Référence :</strong> ${trackingCode}</p>
      <p style="margin: 6px 0; color: #374151;"><strong>Adresse :</strong> ${address}, ${postalCode} ${city}</p>
      <hr style="margin: 15px 0; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="margin: 6px 0; color: #374151;">Frais de déplacement HT : ${displacementPriceHT.toFixed(2)} €</p>
      <p style="margin: 6px 0; color: #374151;">TVA (${vatRate}%) : ${vatAmount.toFixed(2)} €</p>
      <p style="margin: 12px 0 0 0; font-size: 22px; font-weight: bold; color: #dc2626;">Total TTC : ${totalTTC.toFixed(2)} €</p>
    </div>
    
    <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <strong style="color: #92400e;">⚠️ Information</strong><br>
      <span style="color: #78350f; font-size: 14px;">Conformément à notre politique tarifaire, les frais de déplacement sont dus lorsque le technicien est arrivé sur les lieux.</span>
    </div>
    
    <p style="font-size: 14px; color: #374151;">Si vous avez des questions concernant cette facture, n'hésitez pas à nous contacter.</p>
    <p style="font-size: 14px; color: #374151;">Cordialement,<br>L'équipe Depan.Pro</p>
  `;

  return wrapInBaseLayout({
    headerTitle: "Facture d'annulation",
    headerSubtitle: `Intervention ${trackingCode}`,
    headerBgColor: "#dc2626",
    bodyContent,
  });
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
        .header h1 { color: #0FB87F; margin: 0; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .info-box { background: #f9fafb; padding: 15px; border-radius: 8px; width: 45%; }
        .info-box h3 { margin: 0 0 10px 0; color: #0FB87F; font-size: 14px; }
        .info-box p { margin: 5px 0; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #0FB87F; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .totals { margin-left: auto; width: 250px; background: #f9fafb; padding: 15px; border-radius: 8px; }
        .totals .row { display: flex; justify-content: space-between; margin: 8px 0; }
        .totals .total { font-weight: bold; font-size: 16px; color: #0FB87F; border-top: 2px solid #ddd; padding-top: 10px; margin-top: 10px; }
        .notice { background: #fef3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .notice h4 { margin: 0 0 10px 0; color: #856404; }
        .notice p { margin: 0; font-size: 12px; color: #856404; }
        .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Depan.Pro</h1>
        <p>7, place du 11 Novembre 1918, 93000 Bobigny</p>
        <p>Tél: 01 84 60 86 30 | Email: contact@depan-pro.com</p>
        <p>SIREN: 992 525 576 | TVA: FR41 992 525 576</p>
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
        <p>Depan.Pro - SIREN 992 525 576 - TVA FR41 992 525 576</p>
      </div>
    </body>
    </html>
  `;
}
