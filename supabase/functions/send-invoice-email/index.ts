import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceRequest {
  interventionId: string;
  invoiceBase64: string;
  invoiceFileName: string;
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

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interventionId, invoiceBase64, invoiceFileName }: SendInvoiceRequest = await req.json();

    console.log(`Sending invoice for intervention ${interventionId}`);

    // Get intervention details with client info
    const { data: intervention, error: interventionError } = await supabase
      .from("interventions")
      .select("*, users!interventions_client_id_fkey(*)")
      .eq("id", interventionId)
      .single();

    if (interventionError || !intervention) {
      console.error("Error fetching intervention:", interventionError);
      throw new Error("Intervention not found");
    }

    const clientEmail = intervention.client_email || intervention.users?.email;
    const clientPhone = intervention.client_phone || intervention.users?.phone;
    const clientName = intervention.client_name || intervention.users?.name || "Client";
    const trackingCode = intervention.tracking_code || "N/A";
    const finalPrice = intervention.final_price || 0;

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
                  <p><strong>Adresse :</strong> ${intervention.address || "N/A"}</p>
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

        const emailResponse = await resend.emails.send({
          from: `Depan.Pro <${resendFromEmail}>`,
          to: [clientEmail],
          subject: `Depan.Pro : Facture - Intervention ${trackingCode}`,
          html: emailHtml,
          attachments: [
            {
              filename: invoiceFileName,
              content: invoiceBase64,
            },
          ],
        });

        console.log("Email sent successfully:", emailResponse);
        results.email = true;
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    } else {
      console.log("Email not sent: RESEND_API_KEY not configured or no client email");
    }

    // Send SMS if configured
    if (clientPhone) {
      const smsMessage = `Depan.Pro - Votre facture pour l'intervention ${trackingCode} est disponible. Montant: ${finalPrice.toFixed(2)} € TTC. Merci pour votre confiance !`;
      results.sms = await sendSMS(clientPhone, smsMessage);
    } else {
      console.log("SMS not sent: no client phone number");
    }

    return new Response(
      JSON.stringify({ 
        success: results.email || results.sms,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending invoice:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
