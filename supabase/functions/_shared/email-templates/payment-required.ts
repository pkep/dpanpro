/**
 * Template: Payment Required Notification Email
 * Used by: notify-payment-required
 */

interface PaymentRequiredTemplateData {
  trackingCode: string;
  trackingUrl: string;
}

export function buildPaymentRequiredEmailHtml(data: PaymentRequiredTemplateData): string {
  const { trackingCode, trackingUrl } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; }
        .header img { height: 50px; margin-bottom: 15px; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .alert-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .alert-box h2 { color: #92400e; margin-top: 0; }
        .tracking-code { background: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; }
        .cta-button { display: inline-block; background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .cta-button:hover { background: #15803d; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://dpanpro.lovable.app/lovable-uploads/d21193e1-62b9-49fe-854f-eb8275099db9.png" alt="Depan.Pro" />
          <h1>⚠️ Autorisation de paiement requise</h1>
        </div>
        <div class="content">
          <div class="alert-box">
            <h2>Action requise de votre part</h2>
            <p>Votre technicien souhaite finaliser l'intervention, mais votre carte bancaire n'a pas été autorisée correctement.</p>
            <p>Pour permettre le règlement et clôturer l'intervention, veuillez autoriser votre carte en cliquant sur le bouton ci-dessous.</p>
          </div>
          
          <div class="tracking-code">${trackingCode}</div>
          
          <div style="text-align: center;">
            <a href="${trackingUrl}" class="cta-button">Autoriser ma carte maintenant</a>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
            <a href="${trackingUrl}">${trackingUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p>Depan.Pro - Service de dépannage d'urgence</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
