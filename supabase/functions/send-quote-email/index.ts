import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { buildQuoteEmailHtml } from "../_shared/email-templates/quote-email.ts";
import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildQuoteSignedSms } from "../_shared/sms/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuoteEmailRequest {
  interventionId: string;
  quoteBase64: string;
  quoteFileName: string;
  clientEmail: string | null;
  clientPhone: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "contact@depan-pro.com";
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interventionId, quoteBase64, quoteFileName, clientEmail, clientPhone }: QuoteEmailRequest = await req.json();

    if (!interventionId || !quoteBase64) {
      throw new Error("Missing required fields");
    }

    const { data: intervention, error: intError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", interventionId)
      .single();

    if (intError || !intervention) {
      throw new Error("Intervention not found");
    }

    let technicianName = "Technicien";
    if (intervention.technician_id) {
      const { data: techData } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", intervention.technician_id)
        .single();
      if (techData) {
        technicianName = `${techData.first_name} ${techData.last_name}`;
      }
    }

    const emailToSend = clientEmail || intervention.client_email;

    if (!emailToSend) {
      console.log("No email address available, skipping email send");
      return new Response(JSON.stringify({ success: true, message: "No email to send to" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailResponse = await resend.emails.send({
      from: `Depan.Pro <${fromEmail}>`,
      to: [emailToSend],
      subject: `Depan.Pro : Votre devis d'intervention - ${intervention.tracking_code || interventionId.slice(0, 8)}`,
      html: buildQuoteEmailHtml({
        trackingCode: intervention.tracking_code,
        interventionId,
        address: intervention.address,
        postalCode: intervention.postal_code,
        city: intervention.city,
        technicianName,
      }),
      attachments: [
        {
          filename: quoteFileName,
          content: quoteBase64,
        },
      ],
    });

    console.log("Quote email sent successfully:", emailResponse);

    // Send SMS notification if phone available
    const phoneToSend = clientPhone || intervention.client_phone;
    if (phoneToSend) {
      const smsMessage = buildQuoteSignedSms({
        trackingCode: intervention.tracking_code || interventionId.slice(0, 8),
      });
      await sendSMS(phoneToSend, smsMessage, "[QuoteEmail]");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-quote-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
