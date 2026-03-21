import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { buildQuoteModificationEmailHtml } from "../_shared/email-templates/quote-modification.ts";
import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildQuoteModificationSms } from "../_shared/sms/templates.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { modificationId, clientEmail, clientPhone }: NotifyRequest = await req.json();

    console.log("Notifying client for modification:", modificationId);
    console.log("Client email:", clientEmail, "Client phone:", clientPhone);

    const { data: modification, error: modError } = await supabase
      .from("quote_modifications")
      .select("*, quote_modification_items(*)")
      .eq("id", modificationId)
      .single();

    if (modError || !modification) {
      throw new Error("Modification not found");
    }

    const { data: intervention, error: intError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", modification.intervention_id)
      .single();

    if (intError || !intervention) {
      throw new Error("Intervention not found");
    }

    const baseUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || "https://dpanpro.lovable.app";
    const approvalUrl = `${baseUrl}/quote-approval/${modification.notification_token}`;

    const emailHtml = buildQuoteModificationEmailHtml({
      interventionTitle: intervention.title,
      trackingCode: intervention.tracking_code,
      items: modification.quote_modification_items,
      totalAdditionalAmount: modification.total_additional_amount,
      approvalUrl,
    });

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
      const smsMessage = buildQuoteModificationSms({
        totalAdditionalAmount: modification.total_additional_amount,
        approvalUrl,
      });
      results.sms = await sendSMS(clientPhone, smsMessage, "[QuoteModification]");
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
