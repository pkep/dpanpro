import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildTechnicianAssignedSms } from "../_shared/sms/templates.ts";
import { buildTechnicianAssignedEmail } from "../_shared/email-templates/technician-assigned.ts";
import { logError } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  interventionId: string;
  clientId: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientFirstName?: string | null;
  technicianFirstName: string;
  technicianLastName: string;
  interventionTitle: string;
  interventionAddress: string;
  interventionCity: string;
  interventionPostalCode: string;
  scheduled_at: string;
  trackingCode: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const frontendUrl = Deno.env.get("FRONTEND_URL") ?? "https://dpanpro.lovable.app";

    const body: RequestBody = await req.json();
    console.log("[NotifyTechAssigned] Notifying client for intervention", body.interventionId);

    let clientEmail = body.clientEmail ?? null;
    let clientPhone = body.clientPhone ?? null;
    let clientFirstName = body.clientFirstName ?? "Client";

    if ((!clientEmail || !clientPhone) && body.clientId) {
      const { data: client } = await supabase
        .from("users")
        .select("email, phone, first_name")
        .eq("id", body.clientId)
        .single();
      if (client) {
        clientEmail = clientEmail ?? client.email;
        clientPhone = clientPhone ?? client.phone;
        clientFirstName = clientFirstName || client.first_name || "Client";
      }
    }

    const trackingUrl = `${frontendUrl}/intervention/${body.interventionId}`;
    const results = { email: false, sms: false };

    // Email
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    if (resendApiKey && clientEmail) {
      try {
        const resend = new Resend(resendApiKey);
        const { subject, html } = buildTechnicianAssignedEmail({
          clientFirstName,
          technicianFirstName: body.technicianFirstName,
          technicianLastName: body.technicianLastName,
          interventionTitle: body.interventionTitle,
          interventionAddress: body.interventionAddress,
          interventionCity: body.interventionCity,
          interventionPostalCode: body.interventionPostalCode,
          scheduledAt: body.scheduled_at,
          trackingCode: body.trackingCode,
          trackingUrl,
        });
        await resend.emails.send({
          from: `Depan.Pro <${fromEmail}>`,
          to: [clientEmail],
          subject,
          html,
        });
        results.email = true;
      } catch (e) {
        console.error("[NotifyTechAssigned] Email error:", e);
      }
    }

    // SMS
    if (clientPhone) {
      const sms = buildTechnicianAssignedSms({
        clientFirstName,
        technicianFirstName: body.technicianFirstName,
        technicianLastName: body.technicianLastName,
        scheduledAt: body.scheduled_at,
        city: body.interventionCity,
        trackingCode: body.trackingCode,
        trackingUrl,
      });
      results.sms = await sendSMS(clientPhone, sms, "[NotifyTechAssigned]");
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[NotifyTechAssigned] Error:", error);
    await logError("notify-technician-assigned", msg, { error: String(error) });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
