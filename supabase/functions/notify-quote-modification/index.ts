import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface NotifyRequest {
  modificationId: string;
  clientEmail: string | null;
  clientPhone: string | null;
}

// Format French phone number to international format
function formatPhoneNumber(phone: string): string {
  // Remove spaces and dashes
  let cleaned = phone.replace(/[\s\-\.]/g, "");
  
  // If starts with 0, replace with +33
  if (cleaned.startsWith("0")) {
    cleaned = "+33" + cleaned.substring(1);
  }
  
  // If doesn't start with +, add +33
  if (!cleaned.startsWith("+")) {
    cleaned = "+33" + cleaned;
  }
  
  return cleaned;
}

// Send SMS via Twilio
async function sendSMS(to: string, message: string): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.log("Twilio credentials not configured");
    return false;
  }

  const formattedTo = formatPhoneNumber(to);
  console.log("Sending SMS to:", formattedTo);

  try {
    const credentials = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    const result = await response.json();
    
    if (response.ok) {
      console.log("SMS sent successfully:", result.sid);
      return true;
    } else {
      console.error("Twilio error:", result);
      return false;
    }
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { modificationId, clientEmail, clientPhone }: NotifyRequest = await req.json();

    console.log("Notifying client for modification:", modificationId);
    console.log("Client email:", clientEmail, "Client phone:", clientPhone);

    // Get modification details
    const { data: modification, error: modError } = await supabase
      .from("quote_modifications")
      .select("*, quote_modification_items(*)")
      .eq("id", modificationId)
      .single();

    if (modError || !modification) {
      throw new Error("Modification not found");
    }

    // Get intervention details
    const { data: intervention, error: intError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", modification.intervention_id)
      .single();

    if (intError || !intervention) {
      throw new Error("Intervention not found");
    }

    const baseUrl = Deno.env.get("SITE_URL") || "https://dpanpro.lovable.app";
    const approvalUrl = `${baseUrl}/quote-approval/${modification.notification_token}`;

    // Build email content
    const itemsHtml = modification.quote_modification_items
      .map((item: { label: string; quantity: number; total_price: number }) => 
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.label}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.total_price.toFixed(2)} €</td>
        </tr>`
      )
      .join("");

    const emailHtml = `
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
        
        <p>Le technicien intervenant sur votre demande (${intervention.title}) vous propose des prestations ou équipements supplémentaires :</p>
        
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
              <td style="padding: 10px; text-align: right; font-weight: bold;">${modification.total_additional_amount.toFixed(2)} €</td>
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
          Cet email a été envoyé par Depan.Pro concernant votre intervention ${intervention.tracking_code || ""}.
        </p>
      </body>
      </html>
    `;

    const results: { email?: boolean; sms?: boolean } = {};

    // Send email if available
    if (clientEmail) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
        
        if (resendApiKey) {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `Depan.Pro <${resendFromEmail}>`,
              to: [clientEmail],
              subject: `Depan.Pro : Modification de devis - ${intervention.title}`,
              html: emailHtml,
            }),
          });
          results.email = emailRes.ok;
          console.log("Email sent:", emailRes.ok);
          if (!emailRes.ok) {
            const errorBody = await emailRes.text();
            console.error("Email error:", errorBody);
          }
        } else {
          console.log("RESEND_API_KEY not configured");
          results.email = false;
        }
      } catch (emailErr) {
        console.error("Error sending email:", emailErr);
        results.email = false;
      }
    }

    // Send SMS via Twilio if clientPhone is available
    if (clientPhone) {
      const smsMessage = `Depan.Pro: Le technicien propose ${modification.total_additional_amount.toFixed(2)}€ de prestations supplementaires pour votre intervention. Validez ici: ${approvalUrl}`;
      results.sms = await sendSMS(clientPhone, smsMessage);
    }

    // Update client_notified_at if at least one notification was sent
    if (results.email || results.sms) {
      await supabase
        .from("quote_modifications")
        .update({ client_notified_at: new Date().toISOString() })
        .eq("id", modificationId);
      console.log("Updated client_notified_at for modification:", modificationId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        approvalUrl,
        results 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-quote-modification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
