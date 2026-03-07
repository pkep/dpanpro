import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildInvoiceEmailHtml } from "../_shared/email-templates/invoice-email.ts";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interventionId, invoiceBase64, invoiceFileName }: SendInvoiceRequest = await req.json();

    console.log(`Sending invoice for intervention ${interventionId}`);

    const { data: intervention, error: interventionError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", interventionId)
      .single();

    if (interventionError || !intervention) {
      console.error("Error fetching intervention:", interventionError);
      throw new Error("Intervention not found");
    }

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
    const finalPrice = intervention.final_price || 0;

    const results = {
      email: false,
      sms: false,
    };

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    
    if (resendApiKey && clientEmail) {
      try {
        const resend = new Resend(resendApiKey);

        const emailResponse = await resend.emails.send({
          from: `Depan.Pro <${resendFromEmail}>`,
          to: [clientEmail],
          subject: `Depan.Pro : Facture - Intervention ${trackingCode}`,
          html: buildInvoiceEmailHtml({
            trackingCode,
            clientName,
            address: `${intervention.address || "N/A"}, ${intervention.postal_code} ${intervention.city}`,
            finalPrice,
          }),
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
