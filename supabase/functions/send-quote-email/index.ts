import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildQuoteEmailHtml } from "../_shared/email-templates/quote-email.ts";
import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildQuoteSignedSms } from "../_shared/sms/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendQuoteRequest {
  interventionId: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interventionId }: SendQuoteRequest = await req.json();
    if (!interventionId) {
      return new Response(JSON.stringify({ error: "interventionId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending quote for intervention ${interventionId}`);

    // Generate quote PDF via create-quote function
    const createQuoteResp = await fetch(`${supabaseUrl}/functions/v1/create-quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ interventionId }),
    });

    if (!createQuoteResp.ok) {
      const errText = await createQuoteResp.text();
      console.error("create-quote failed:", errText);
      throw new Error("Failed to generate quote");
    }

    const { quoteBase64, quoteFileName } = await createQuoteResp.json();

    const { data: intervention, error: interventionError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", interventionId)
      .single();

    if (interventionError || !intervention) {
      throw new Error("Intervention not found");
    }

    let clientUser: any = null;
    if (intervention.client_id) {
      const { data: user } = await supabase
        .from("users")
        .select("email, phone, first_name, last_name")
        .eq("id", intervention.client_id)
        .single();
      clientUser = user;
    }

    let technicianName = "Technicien";
    if (intervention.technician_id) {
      const { data: tech } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", intervention.technician_id)
        .single();
      if (tech) technicianName = `${tech.first_name} ${tech.last_name}`;
    }

    const clientEmail = intervention.client_email || clientUser?.email;
    const clientPhone = intervention.client_phone || clientUser?.phone;
    const trackingCode = intervention.tracking_code || interventionId.slice(0, 8);

    const results = { email: false, sms: false };

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (resendApiKey && clientEmail) {
      try {
        const resend = new Resend(resendApiKey);
        const emailResponse = await resend.emails.send({
          from: `Depan.Pro <${resendFromEmail}>`,
          to: [clientEmail],
          subject: `Depan.Pro : Votre devis d'intervention - ${trackingCode}`,
          html: buildQuoteEmailHtml({
            trackingCode,
            interventionId,
            address: intervention.address,
            postalCode: intervention.postal_code,
            city: intervention.city,
            technicianName,
          }),
          attachments: [{ filename: quoteFileName, content: quoteBase64 }],
        });
        console.log("Quote email sent successfully:", emailResponse);
        results.email = true;
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    } else {
      console.log("Email not sent: RESEND_API_KEY not configured or no client email");
    }

    if (clientPhone) {
      const smsMessage = buildQuoteSignedSms({ trackingCode });
      results.sms = await sendSMS(clientPhone, smsMessage, "[QuoteEmail]");
    } else {
      console.log("SMS not sent: no client phone number");
    }

    return new Response(
      JSON.stringify({ success: results.email || results.sms, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending quote:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
