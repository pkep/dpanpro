import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCancellationInvoiceRequest {
  interventionId: string;
  displacementPriceHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
}

async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.log("Twilio credentials not configured, skipping SMS");
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: fromNumber,
        Body: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Twilio SMS error:", errorText);
      return false;
    }

    const result = await response.json();
    console.log("SMS sent successfully:", result.sid);
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}

function generateCancellationInvoicePDF(data: {
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
}): string {
  // Generate a simple HTML invoice that can be converted to PDF
  // For email, we'll send HTML directly and attach a simple text summary
  
  const html = `
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

  return html;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      interventionId, 
      displacementPriceHT,
      vatRate,
      vatAmount,
      totalTTC,
    }: SendCancellationInvoiceRequest = await req.json();

    console.log(`Sending cancellation invoice for intervention ${interventionId}`);

    // Get intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", interventionId)
      .single();

    if (interventionError || !intervention) {
      console.error("Error fetching intervention:", interventionError);
      throw new Error("Intervention not found");
    }

    // Get client info if client_id exists
    let clientUser = null;
    if (intervention.client_id) {
      const { data: user } = await supabase
        .from("users")
        .select("email, phone, first_name, last_name")
        .eq("id", intervention.client_id)
        .single();
      clientUser = user;
    }

    const clientEmail = intervention.client_email || clientUser?.email;
    const clientPhone = intervention.client_phone || clientUser?.phone;
    const clientName = clientUser ? `${clientUser.first_name} ${clientUser.last_name}` : "Client";
    const trackingCode = intervention.tracking_code || "N/A";

    // Category labels
    const categoryLabels: Record<string, string> = {
      locksmith: 'Serrurerie',
      plumbing: 'Plomberie',
      electricity: 'Électricité',
      glazing: 'Vitrerie',
      heating: 'Chauffage',
      aircon: 'Climatisation',
    };

    // Generate invoice number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const shortId = interventionId.substring(0, 8).toUpperCase();
    const invoiceNumber = `FAC-ANN-${year}${month}-${shortId}`;
    const invoiceDate = now.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });

    // Generate invoice HTML
    const invoiceHtml = generateCancellationInvoicePDF({
      invoiceNumber,
      invoiceDate,
      trackingCode,
      clientName,
      clientEmail,
      clientPhone,
      address: intervention.address || '',
      city: intervention.city || '',
      postalCode: intervention.postal_code || '',
      category: categoryLabels[intervention.category] || intervention.category,
      displacementPriceHT,
      vatRate,
      vatAmount,
      totalTTC,
    });

    const results = {
      email: false,
      sms: false,
    };

    // Send email if configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    
    if (resendApiKey && clientEmail) {
      try {
        const resend = new Resend(resendApiKey);

        const emailHtml = `
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
                  <p><strong>Adresse :</strong> ${intervention.address || "N/A"}, ${intervention.postal_code} ${intervention.city}</p>
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

        const emailResponse = await resend.emails.send({
          from: `Depan.Pro <${resendFromEmail}>`,
          to: [clientEmail],
          subject: `Depan.Pro : Facture d'annulation - ${trackingCode}`,
          html: emailHtml,
        });

        console.log("Cancellation invoice email sent successfully:", emailResponse);
        results.email = true;
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    } else {
      console.log("Email not sent: RESEND_API_KEY not configured or no client email");
    }

    // Send SMS if configured
    if (clientPhone) {
      const smsMessage = `Depan.Pro - Facture d'annulation ${invoiceNumber}. Suite à l'annulation de l'intervention ${trackingCode} après l'arrivée du technicien, un montant de ${totalTTC.toFixed(2)} € TTC vous est facturé. Facture envoyée par email.`;
      results.sms = await sendSMS(clientPhone, smsMessage);
    } else {
      console.log("SMS not sent: no client phone number");
    }

    return new Response(
      JSON.stringify({ 
        success: results.email || results.sms,
        results,
        invoiceNumber,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending cancellation invoice:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
